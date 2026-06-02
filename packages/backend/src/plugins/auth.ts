import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '15m' },
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()

      // Verificar blacklist de tokens revocados (logout)
      const payload = request.user as { jti?: string }
      if (payload.jti && fastify.redis) {
        const revoked = await fastify.redis.get(`jwt:bl:${payload.jti}`)
        if (revoked) {
          return reply.status(401).send({ error: 'Token revocado. Inicia sesión de nuevo.' })
        }
      }
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default authPlugin
