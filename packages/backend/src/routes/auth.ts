import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { randomBytes, randomUUID } from 'crypto'
import { isUCError } from '../use-cases/errors'
import {
  registerUser, verifyEmail, resendVerification,
  loginUser, forgotPassword, resetPassword,
} from '../use-cases/auth'

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
  const { repos } = fastify

  // ── Registro ───────────────────────────────────────────────────────────
  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await registerUser(repos.users, body.data, fastify.log)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return reply.status(201).send(result)
  })

  // ── Verificar email ────────────────────────────────────────────────────
  fastify.get('/verify-email', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) return reply.status(400).send({ error: 'Token requerido' })

    const result = await verifyEmail(repos.users, token)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  // ── Reenviar verificación ──────────────────────────────────────────────
  fastify.post('/resend-verification', { config: { rateLimit: { max: 3, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = emailSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })
    return resendVerification(repos.users, body.data.email, fastify.log)
  })

  // ── Login ──────────────────────────────────────────────────────────────
  fastify.post('/login', { config: { rateLimit: { max: 3, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await loginUser(repos.users, body.data.email, body.data.password)
    if (isUCError(result)) {
      fastify.log.warn({ email: body.data.email, ip: request.ip }, `login_failed: ${result.error}`)
      return reply.status(result.statusCode).send({ error: result.error, ...(result.code && { code: result.code }) })
    }

    const { userId, userEmail, user } = result
    const accessToken = fastify.jwt.sign({ sub: userId, email: userEmail, jti: randomUUID() })
    const refreshToken = randomBytes(40).toString('hex')
    await repos.users.createRefreshToken(userId, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

    return { user, accessToken, refreshToken }
  })

  // ── Olvidé mi contraseña ───────────────────────────────────────────────
  fastify.post('/forgot-password', { config: { rateLimit: { max: 3, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = emailSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })
    return forgotPassword(repos.users, body.data.email, fastify.log)
  })

  // ── Restablecer contraseña ─────────────────────────────────────────────
  fastify.post('/reset-password', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await resetPassword(repos.users, body.data.token, body.data.password)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  // ── Refresh token ──────────────────────────────────────────────────────
  fastify.post('/refresh', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) return reply.status(400).send({ error: 'refreshToken requerido' })

    const stored = await repos.users.findRefreshToken(refreshToken)
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token inválido o expirado' })
    }

    await repos.users.deleteRefreshToken(stored.id)
    const newRefreshToken = randomBytes(40).toString('hex')
    await repos.users.createRefreshToken(stored.userId, newRefreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

    const accessToken = fastify.jwt.sign({ sub: stored.userId, email: stored.user.email, jti: randomUUID() })
    return { accessToken, refreshToken: newRefreshToken }
  })

  // ── Logout ─────────────────────────────────────────────────────────────
  fastify.post('/logout', { onRequest: fastify.authenticate }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }

    const payload = request.user as { jti?: string; exp?: number }
    if (payload.jti && fastify.redis) {
      const ttl = payload.exp
        ? Math.max(1, payload.exp - Math.floor(Date.now() / 1000))
        : 900
      await fastify.redis.setex(`jwt:bl:${payload.jti}`, ttl, '1').catch(() => {})
    }

    if (refreshToken) {
      await repos.users.deleteRefreshTokenByToken(refreshToken).catch(() => {})
    }
    return reply.status(204).send()
  })
}

export default authRoutes
