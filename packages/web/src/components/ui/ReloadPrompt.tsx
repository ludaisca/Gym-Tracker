import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered', r)
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error)
    },
  })

  return (
    <>
      {needRefresh && (
        <div className="pwa-toast fade-in" style={{
          position: 'fixed', right: '16px', bottom: '16px', zIndex: 9999,
          background: 'var(--color-surface)', border: '1px solid var(--color-primary)',
          borderRadius: '8px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Hay una nueva versión de Gym Tracker disponible.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="ghost-btn" onClick={() => setNeedRefresh(false)}>Ignorar</button>
            <button className="primary-btn" onClick={() => updateServiceWorker(true)}>Actualizar</button>
          </div>
        </div>
      )}
      {offlineReady && (
        <div className="pwa-toast fade-in" style={{
          position: 'fixed', right: '16px', bottom: '16px', zIndex: 9999,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Aplicación lista para uso sin conexión.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="ghost-btn" onClick={() => setOfflineReady(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}
