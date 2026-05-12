import { useEffect } from 'react'
import { useAuthStore, useUIStore } from '../store'
import { usersApi } from '../api/users'

export function useUser() {
  const { user, setAuth, accessToken } = useAuthStore()
  const { setOffline, setAccentTheme } = useUIStore()

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline])

  useEffect(() => {
    if (!accessToken) return
    usersApi.me().then((fresh) => {
      setAuth(fresh, accessToken)
      // No sobreescribir data-theme directamente desde el servidor — causa race condition
      // con el toggle local. El UIStore (localStorage) es la fuente de verdad del tema.
      if (fresh.accentTheme && fresh.accentTheme !== useUIStore.getState().accentTheme) {
        setAccentTheme(fresh.accentTheme)
      }
    }).catch(() => {})
  }, [accessToken])

  return user
}
