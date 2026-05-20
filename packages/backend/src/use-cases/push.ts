import webpush from 'web-push'
import type { PrismaClient } from '@prisma/client'
import type { PushRepository } from '../repositories/PushRepository'
import { getVapidKeys } from '../services/vapid'
import { ucErr, UCError } from './errors'

export async function subscribePush(
  push: PushRepository,
  userId: string,
  data: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<{ ok: boolean }> {
  await push.upsert(userId, data.endpoint, data.keys.p256dh, data.keys.auth)
  return { ok: true }
}

export async function unsubscribePush(
  push: PushRepository,
  endpoint: string
): Promise<void> {
  await push.deleteByEndpoint(endpoint)
}

export async function sendTestNotification(
  push: PushRepository,
  prisma: PrismaClient,
  userId: string
): Promise<{ sent: number; failed: number } | UCError> {
  const keys = await getVapidKeys(prisma)
  if (!keys) return ucErr('Push notifications no disponibles.', 503)

  const subs = await push.findByUser(userId)
  if (subs.length === 0) return ucErr('No hay suscripciones activas.', 404)

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

  // Clean up invalid subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected') {
      const err = (r as PromiseRejectedResult).reason as { statusCode?: number }
      if (err?.statusCode === 410) {
        await push.deleteByEndpoint(subs[i].endpoint)
      }
    }
  }

  const failed = results.filter(r => r.status === 'rejected').length
  return { sent: results.length - failed, failed }
}

export async function getVapidPublicKey(
  prisma: PrismaClient
): Promise<{ publicKey: string } | UCError> {
  const keys = await getVapidKeys(prisma)
  if (!keys) return ucErr('Push notifications no disponibles.', 503)
  return { publicKey: keys.publicKey }
}

export { UCError }
