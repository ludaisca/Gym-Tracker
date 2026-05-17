import { api } from './client'

export const pushApi = {
  getVapidPublicKey: () =>
    api.get<{ publicKey: string }>('/push/vapid-public-key').then((r) => r.data.publicKey),

  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post('/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    }),

  unsubscribe: (endpoint: string) =>
    api.delete('/push/unsubscribe', { data: { endpoint } }),

  test: () => api.post<{ sent: number; failed: number }>('/push/test').then((r) => r.data),
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const registration = await navigator.serviceWorker.ready
  const existingSub = await registration.pushManager.getSubscription()
  if (existingSub) return existingSub

  const publicKey = await pushApi.getVapidPublicKey().catch(() => null)
  if (!publicKey) return null

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  await pushApi.subscribe(sub.toJSON())
  return sub
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (!sub) return
  await pushApi.unsubscribe(sub.endpoint)
  await sub.unsubscribe()
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
