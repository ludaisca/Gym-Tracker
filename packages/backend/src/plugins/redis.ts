import fp from 'fastify-plugin'
import fastifyRedis, { FastifyRedis } from '@fastify/redis'
import type { FastifyPluginAsync } from 'fastify'

const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  if (!process.env.REDIS_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL es requerida en producción (rate limiting y colas dependen de Redis)')
    }
    fastify.log.warn('REDIS_URL no definida. Redis deshabilitado (solo para desarrollo).')
    return
  }
  await fastify.register(fastifyRedis, { url: process.env.REDIS_URL })
})

declare module 'fastify' {
  interface FastifyInstance {
    redis: FastifyRedis
  }
}

export default redisPlugin
