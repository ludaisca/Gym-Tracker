import { isNativePlatform } from './camera'

export async function initNativePush(onToken: (token: string) => Promise<void>): Promise<void> {
  if (!isNativePlatform()) return

  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async ({ value: token }) => {
    try { await onToken(token) } catch { /* no-op: el token se reintentará en el próximo arranque */ }
  })

  // App en foreground: no mostrar nada (la app ya está activa)
  PushNotifications.addListener('pushNotificationReceived', (_notification) => {})

  // Usuario tocó la notificación: navegar a la URL del payload si existe
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url as string | undefined
    if (url) window.location.href = url
  })
}
