import type { PrismaClient } from '@prisma/client'

let messaging: import('firebase-admin/messaging').Messaging | null = null

function getMessaging(): import('firebase-admin/messaging').Messaging | null {
  if (messaging) return messaging
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    const { initializeApp, getApps, cert } = require('firebase-admin/app')
    const { getMessaging: _getMessaging } = require('firebase-admin/messaging')
    if (getApps().length === 0) {
      initializeApp({ credential: cert(JSON.parse(raw)) })
    }
    messaging = _getMessaging()
    return messaging
  } catch (err) {
    console.error('[FCM] Error inicializando Firebase Admin:', err)
    return null
  }
}

export async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  const m = getMessaging()
  if (!m) return false
  try {
    await m.send({ token, notification: { title, body }, data, android: { priority: 'high' } })
    return true
  } catch (err: unknown) {
    const code = (err as Record<string, unknown>)?.errorInfo
      ? (err as any).errorInfo?.code as string | undefined
      : undefined
    if (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token') {
      return false
    }
    console.error('[FCM] Error enviando notificación:', err)
    return false
  }
}

export async function cleanInvalidFcmToken(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, fcmToken: { not: null } },
    data: { fcmToken: null },
  })
}
