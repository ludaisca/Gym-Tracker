import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import webpush from 'web-push'
import { getVapidKeys } from '../services/vapid'
import { requirePro } from '../plugins/requirePro'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(10),
  }),
})

const pushRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  // Pre-cargar / generar claves VAPID al registrar el plugin
  getVapidKeys(prisma).catch(() => {})

  // ── GET /push/vapid-public-key — pública, sin auth ───────────────────────
  // Registrada en el scope externo para que el addHook de abajo no la afecte
  fastify.get('/vapid-public-key', async (req, reply) => {
    const keys = await getVapidKeys(prisma)
    if (!keys) return reply.status(503).send({ error: 'Push notifications no disponibles.' })
    return { publicKey: keys.publicKey }
  })

  // ── Rutas protegidas — sub-scope con auth ────────────────────────────────
  await fastify.register(async (auth) => {
    auth.addHook('onRequest', fastify.authenticate)
    auth.addHook('onRequest', requirePro(fastify))

  // ── POST /push/subscribe — registra suscripción del navegador ─────────────
  auth.post('/subscribe', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const body = subscribeSchema.parse(req.body)

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { userId: sub, p256dh: body.keys.p256dh, auth: body.keys.auth },
      create: { userId: sub, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    })
    return reply.status(201).send({ ok: true })
  })

  // ── DELETE /push/unsubscribe — elimina suscripción ────────────────────────
  auth.delete('/unsubscribe', async (req, reply) => {
    const body = z.object({ endpoint: z.string() }).parse(req.body)
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } })
    return reply.status(204).send()
  })

  // ── POST /push/test — envía notificación de prueba al usuario ────────────
  auth.post('/test', async (req, reply) => {
    const keys = await getVapidKeys(prisma)
    if (!keys) return reply.status(503).send({ error: 'Push notifications no disponibles.' })

    const { sub } = req.user as { sub: string }
    const subs = await prisma.pushSubscription.findMany({ where: { userId: sub } })
    if (subs.length === 0) return reply.status(404).send({ error: 'No hay suscripciones activas.' })

    const payload = JSON.stringify({
      title: 'Gym Tracker',
      body: '¡Las notificaciones push están funcionando!',
      url: '/dashboard',
    })

    const results = await Promise.allSettled(
      subs.map(s =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    )

    // Limpiar suscripciones inválidas (410 Gone)
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      if (r.status === 'rejected') {
        const err = (r as PromiseRejectedResult).reason as { statusCode?: number }
        if (err?.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: subs[i].endpoint } })
        }
      }
    }

    const failed = results.filter(r => r.status === 'rejected').length
    return { sent: results.length - failed, failed }
  })
  }) // fin sub-scope auth
}

export default pushRoutes
