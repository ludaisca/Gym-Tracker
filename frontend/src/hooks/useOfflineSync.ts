import { useEffect } from 'react'
import { useOfflineStore, useUIStore, useAuthStore } from '../store'
import { api } from '../api/client'

export function useOfflineSync() {
  const { queue, dequeue } = useOfflineStore()
  const { setOffline } = useUIStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handleOnline = async () => {
      setOffline(false)
      if (!isAuthenticated) return
      // Replay queued writes in order
      const pending = useOfflineStore.getState().queue
      for (const action of pending) {
        try {
          await api.request({
            method: action.method,
            url: action.url,
            data: action.body,
          })
          dequeue(action.id)
        } catch {
          // Keep in queue if still failing
          break
        }
      }
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
