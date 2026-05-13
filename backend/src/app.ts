import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma'
import authPlugin from './plugins/auth'

import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import sessionsRoutes from './routes/sessions'
import routinesRoutes from './routes/routines'
import notesRoutes from './routes/notes'
import nutritionRoutes from './routes/nutrition'
import aiRoutes from './routes/ai'
import migrateRoutes from './routes/migrate'
import challengesRoutes from './routes/challenges'

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    bodyLimit: 5 * 1024 * 1024,  // 5 MB — para fotos base64 de check-in
  })

  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  })

  await fastify.register(helmet)
  await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Demasiadas peticiones. Intenta en un momento.' }),
  })

  await fastify.register(prismaPlugin)
  await fastify.register(authPlugin)

  await fastify.register(authRoutes,      { prefix: '/auth' })
  await fastify.register(usersRoutes,     { prefix: '/users' })
  await fastify.register(sessionsRoutes,  { prefix: '/sessions' })
  await fastify.register(routinesRoutes,  { prefix: '/routines' })
  await fastify.register(notesRoutes,     { prefix: '/notes' })
  await fastify.register(nutritionRoutes, { prefix: '/nutrition' })
  await fastify.register(aiRoutes,          { prefix: '/ai' })
  await fastify.register(migrateRoutes,     { prefix: '/migrate' })
  await fastify.register(challengesRoutes,  { prefix: '/' })

  fastify.get('/health', async () => ({ status: 'ok' }))

  return fastify
}
