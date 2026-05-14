import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  avatar: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const emailSchema = z.object({ email: z.string().email() })

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  // ── Registro ───────────────────────────────────────────────────────────
  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const { email, password, name, avatar = '💪' } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.status(409).send({ error: 'Email ya registrado' })

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: { email, passwordHash, name, avatar, verificationToken, verificationExpiry },
    })
    await prisma.userSettings.create({ data: { userId: user.id } })

    try {
      await sendVerificationEmail(email, name, verificationToken)
    } catch (err) {
      fastify.log.error({ err }, 'Error al enviar correo de verificación')
    }

    return reply.status(201).send({
      message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.',
    })
  })

  // ── Verificar email ────────────────────────────────────────────────────
  fastify.get('/verify-email', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) return reply.status(400).send({ error: 'Token requerido' })

    const user = await prisma.user.findUnique({ where: { verificationToken: token } })

    if (!user || !user.verificationExpiry || user.verificationExpiry < new Date()) {
      return reply.status(400).send({ error: 'El enlace es inválido o ha expirado' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null, verificationExpiry: null },
    })

    return { message: 'Cuenta verificada correctamente' }
  })

  // ── Reenviar verificación ──────────────────────────────────────────────
  fastify.post('/resend-verification', { config: { rateLimit: { max: 3, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = emailSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })

    // Respuesta genérica para no revelar si el email existe
    if (!user || user.emailVerified) {
      return { message: 'Si el correo existe y no está verificado, recibirás un nuevo enlace.' }
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationExpiry },
    })

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken)
    } catch (err) {
      fastify.log.error({ err }, 'Error al reenviar correo de verificación')
    }

    return { message: 'Si el correo existe y no está verificado, recibirás un nuevo enlace.' }
  })

  // ── Login ──────────────────────────────────────────────────────────────
  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const { email, password } = body.data
    const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } })
    if (!user) return reply.status(401).send({ error: 'Credenciales incorrectas' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Credenciales incorrectas' })

    if (!user.emailVerified) {
      return reply.status(403).send({ error: 'Debes verificar tu correo antes de iniciar sesión', code: 'EMAIL_NOT_VERIFIED' })
    }

    const accessToken = fastify.jwt.sign({ sub: user.id, email: user.email })
    const refreshToken = randomBytes(40).toString('hex')
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return {
      user: {
        id: user.id, email: user.email, name: user.name, avatar: user.avatar,
        theme: user.theme, accentTheme: user.accentTheme, currentWeek: user.currentWeek,
        activeRoutineId: user.activeRoutineId, settings: user.settings,
      },
      accessToken,
      refreshToken,
    }
  })

  // ── Olvidé mi contraseña ───────────────────────────────────────────────
  fastify.post('/forgot-password', { config: { rateLimit: { max: 3, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = emailSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })

    // Respuesta genérica para no revelar si el email existe
    if (!user) return { message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' }

    const resetToken = randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpiry },
    })

    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken)
    } catch (err) {
      fastify.log.error({ err }, 'Error al enviar correo de reset')
    }

    return { message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' }
  })

  // ── Restablecer contraseña ─────────────────────────────────────────────
  fastify.post('/reset-password', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const { token, password } = body.data
    const user = await prisma.user.findUnique({ where: { resetToken: token } })

    if (!user || !user.resetExpiry || user.resetExpiry < new Date()) {
      return reply.status(400).send({ error: 'El enlace es inválido o ha expirado' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetExpiry: null },
    })

    // Invalidar todos los refresh tokens por seguridad
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } })

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' }
  })

  // ── Refresh token ──────────────────────────────────────────────────────
  fastify.post('/refresh', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) return reply.status(400).send({ error: 'refreshToken requerido' })

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } })
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token inválido o expirado' })
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } })
    const newRefreshToken = randomBytes(40).toString('hex')
    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const accessToken = fastify.jwt.sign({ sub: stored.userId, email: stored.user.email })
    return { accessToken, refreshToken: newRefreshToken }
  })

  // ── Logout ─────────────────────────────────────────────────────────────
  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {})
    }
    return reply.status(204).send()
  })
}

export default authRoutes
