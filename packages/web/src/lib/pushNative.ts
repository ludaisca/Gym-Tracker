export async function initNativePush(onToken: (token: string) => Promise<void>): Promise<void> {
  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async ({ value: token }) => {
    try { await onToken(token) } catch { /* no-op: el token se reintentará en el próximo arranque */ }
  })

  // App en foreground: no mostrar nada (la app ya está activa)
  PushNotifications.addListener('pushNotificationReceived', (_notification) => {})

  // Usuario tocó la notificación: solo navegar a rutas relativas internas
  // Rechazar URLs absolutas/externas para prevenir open-redirect
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const raw = action.notification.data?.url as string | undefined
    if (!raw) return
    const isRelative = /^\/[a-zA-Z0-9\-_/]*$/.test(raw)
    if (isRelative) window.location.href = raw
  })
}
