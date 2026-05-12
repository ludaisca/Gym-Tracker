import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomBytes } from 'crypto'

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

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const { email, password, name, avatar = '💪' } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.status(409).send({ error: 'Email ya registrado' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, name, avatar },
      include: { settings: true },
    })

    await prisma.userSettings.create({ data: { userId: user.id } })

    const accessToken = fastify.jwt.sign({ sub: user.id, email: user.email })
    const refreshToken = randomBytes(40).toString('hex')
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return reply.status(201).send({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, theme: user.theme, accentTheme: user.accentTheme, currentWeek: user.currentWeek, activeRoutineId: user.activeRoutineId },
      accessToken,
      refreshToken,
    })
  })

  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const { email, password } = body.data
    const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } })
    if (!user) return reply.status(401).send({ error: 'Credenciales incorrectas' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Credenciales incorrectas' })

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

  fastify.post('/refresh', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) return reply.status(400).send({ error: 'refreshToken requerido' })

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } })
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token inválido o expirado' })
    }

    // Rotar refresh token
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

  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {})
    }
    return reply.status(204).send()
  })
}

export default authRoutes
