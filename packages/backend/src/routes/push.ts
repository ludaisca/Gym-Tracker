import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const pushRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  await fastify.register(async (auth) => {
    auth.addHook('onRequest', fastify.authenticate)

    // ── POST /push/fcm-token — registra token FCM del dispositivo Android ─────
    auth.post('/fcm-token', async (req, reply) => {
      const { sub } = req.user as { sub: string }
      const { token } = z.object({ token: z.string().min(10) }).parse(req.body)
      await prisma.userSettings.upsert({
        where: { userId: sub },
        update: { fcmToken: token },
        create: { userId: sub, fcmToken: token },
      })
      return reply.status(201).send({ ok: true })
    })

    // ── DELETE /push/fcm-token — borra token FCM ─────────────────────────────
    auth.delete('/fcm-token', async (req, reply) => {
      const { sub } = req.user as { sub: string }
      await prisma.userSettings.updateMany({ where: { userId: sub }, data: { fcmToken: null } })
      return reply.status(204).send()
    })

    // ── POST /push/test — envía notificación de prueba FCM ───────────────────
    auth.post('/test', async (req, reply) => {
      const { sub } = req.user as { sub: string }
      const settings = await prisma.userSettings.findUnique({ where: { userId: sub } })
      if (!settings?.fcmToken) {
        return reply.status(404).send({ error: 'No hay suscripciones activas.' })
      }
      const { sendFcmNotification, cleanInvalidFcmToken } = await import('../services/fcm')
      const ok = await sendFcmNotification(
        settings.fcmToken,
        'Gym Tracker',
        '¡Las notificaciones push están funcionando!',
        { url: '/dashboard' }
      )
      if (ok) return { sent: 1, failed: 0 }
      await cleanInvalidFcmToken(prisma, sub)
      return { sent: 0, failed: 1 }
    })
  })
}

export default pushRoutes
