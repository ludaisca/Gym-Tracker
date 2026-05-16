import { useEffect } from 'react'
import { useOfflineStore, useUIStore, useAuthStore } from '../store'
import { api } from '../api/client'

const MAX_RETRIES = 5

export function useOfflineSync() {
  const { queue, dequeue, incrementRetries } = useOfflineStore()
  const { setOffline } = useUIStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      if (!isAuthenticated) return
      const pending = useOfflineStore.getState().queue
      ;(async () => {
        for (const action of pending) {
          // Descartar entradas que superaron el máximo de reintentos
          if (action.retries >= MAX_RETRIES) {
            console.warn(`[offline-sync] descartando acción tras ${MAX_RETRIES} reintentos:`, action.url)
            dequeue(action.id)
            continue
          }
          try {
            await api.request({ method: action.method, url: action.url, data: action.body })
            dequeue(action.id)
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status
            // 4xx no recuperables → descartar (excepto 401, 408, 429 que pueden resolverse)
            if (status && status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) {
              dequeue(action.id)
            } else {
              // 5xx o error de red → incrementar reintentos y dejar en cola
              incrementRetries(action.id)
            }
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
  }, [isAuthenticated, dequeue, incrementRetries, setOffline])

  return queue.length
}
