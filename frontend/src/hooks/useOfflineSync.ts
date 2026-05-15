import { useEffect } from 'react'
import { useOfflineStore, useUIStore, useAuthStore } from '../store'
import { api } from '../api/client'

export function useOfflineSync() {
  const { queue, dequeue } = useOfflineStore()
  const { setOffline } = useUIStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      if (!isAuthenticated) return
      // Replay queued writes in order
      const pending = useOfflineStore.getState().queue
      // Es importante procesarlos en serie para evitar conflictos (race conditions)
      // usando un IIFE asíncrono
      ;(async () => {
        for (const action of pending) {
          try {
            await api.request({
              method: action.method,
              url: action.url,
              data: action.body,
            })
            dequeue(action.id)
          } catch (err: any) {
            // Si el error es 400 (Bad Request) o 4xx, probablemente la request es inválida 
            // y no se solucionará reintentando. Mejor eliminarla para no atascar la cola.
            const status = err?.response?.status
            if (status && status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) {
              dequeue(action.id)
            }
            // Para 5xx o de red, lo dejamos en la cola para el futuro
          }
        }
      })()
    }

    const handleOffline = () => setOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isAuthenticated, dequeue, setOffline])

  return queue.length
}
