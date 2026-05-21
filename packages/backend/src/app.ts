import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import compress from '@fastify/compress'
import { ZodError } from 'zod'

import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'

import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import authPlugin from './plugins/auth'
import repositoriesPlugin from './plugins/repositories'
import { initWorker, closeWorker, backgroundQueue, registerReminderJob } from './services/queue'

import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import sessionsRoutes from './routes/sessions'
import routinesRoutes from './routes/routines'
import notesRoutes from './routes/notes'
import nutritionRoutes from './routes/nutrition'
import aiRoutes from './routes/ai'
import migrateRoutes from './routes/migrate'
import challengesRoutes from './routes/challenges'
import pushRoutes from './routes/push'
import analyticsRoutes from './routes/analytics'
import marketplaceRoutes from './routes/marketplace'
import billingRoutes from './routes/billing'

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    trustProxy: true,
    bodyLimit: 15 * 1024 * 1024,
  })

  // rawBody necesario para verificar la firma de webhooks de Stripe
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const json = JSON.parse(body.toString())
      ;(req as unknown as Record<string, unknown>).rawBody = body
      done(null, json)
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  const productionOrigins: string[] = ['capacitor://localhost']
  if (process.env.APP_DOMAIN) productionOrigins.push(`https://${process.env.APP_DOMAIN}`)

  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? productionOrigins
      : true,   // dev: acepta cualquier origen (LAN, Tailscale, localhost)
    credentials: true,
  })

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", 'https://js.stripe.com'],
        frameSrc:   ['https://js.stripe.com', 'https://hooks.stripe.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        imgSrc:     ["'self'", 'data:', 'https://*.stripe.com'],
      },
    },
  })
  await fastify.register(compress, { global: true })
  await fastify.register(redisPlugin)
  await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    redis: fastify.redis ? fastify.redis : undefined,
    errorResponseBuilder: () => ({ error: 'Demasiadas peticiones. Intenta en un momento.' }),
  })

  await fastify.register(prismaPlugin)
  await fastify.register(repositoriesPlugin)
  await fastify.register(authPlugin)

  await fastify.register(authRoutes,        { prefix: '/auth' })
  await fastify.register(usersRoutes,       { prefix: '/users' })
  await fastify.register(sessionsRoutes,    { prefix: '/sessions' })
  await fastify.register(routinesRoutes,    { prefix: '/routines' })
  await fastify.register(notesRoutes,       { prefix: '/notes' })
  await fastify.register(nutritionRoutes,   { prefix: '/nutrition' })
  await fastify.register(aiRoutes,          { prefix: '/ai' })
  await fastify.register(migrateRoutes,     { prefix: '/migrate' })
  await fastify.register(challengesRoutes,  { prefix: '/' })
  await fastify.register(pushRoutes,        { prefix: '/push' })
  await fastify.register(analyticsRoutes,   { prefix: '/analytics' })
  await fastify.register(marketplaceRoutes, { prefix: '/marketplace' })
  await fastify.register(billingRoutes,     { prefix: '/billing' })

  initWorker() // Arrancar worker de colas
  registerReminderJob().catch(() => {}) // Registrar job repeatable de recordatorios (idempotente)

  // ── Global Error Handler ──────────────────────────────────────────────────
  fastify.setErrorHandler((err: unknown, request, reply) => {
    // Cast a un tipo manejable
    const error = err as any

    // Errores de validación de Zod
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: error.issues[0].message })
    }
    // Errores de validación propios de Fastify
    if (error.validation) {
      return reply.status(400).send({ error: error.message })
    }
    // Errores de Prisma
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'El registro ya existe (conflicto de datos).' })
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Registro no encontrado.' })
    }
    // Errores HTTP estándar (lanzados con statusCode)
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ error: error.message })
    }

    request.log.error(error)
    return reply.status(500).send({ error: 'Error interno del servidor.' })
  })

  // ── Bull Board (Dashboard visual de colas) ────────────────────────────────
  // Protegido con ADMIN_TOKEN en producción. Sin token definido, el panel queda bloqueado.
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/admin/queues')) return
    const adminToken = process.env.ADMIN_TOKEN
    if (!adminToken) {
      return reply.status(403).send({ error: 'Panel de administración no configurado.' })
    }
    if (request.headers.authorization !== `Bearer ${adminToken}`) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
  const serverAdapter = new FastifyAdapter()
  createBullBoard({
    queues: [new BullMQAdapter(backgroundQueue)],
    serverAdapter,
  })
  serverAdapter.setBasePath('/api/admin/queues')
  await fastify.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' })

  fastify.addHook('onClose', async () => {
    await closeWorker()
  })

  fastify.get('/health', async () => ({ status: 'ok' }))

  return fastify
}
