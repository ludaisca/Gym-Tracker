import { useEffect, useRef } from 'react'
import { useAuthStore, useUIStore } from '../store'
import { usersApi } from '../api/users'

export function useUser() {
  const { user, setAuth, accessToken } = useAuthStore()
  const { setOffline } = useUIStore()
  const lastFetchRef = useRef(0)

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

    function syncUser() {
      if (!useAuthStore.getState().accessToken) return
      const now = Date.now()
      if (now - lastFetchRef.current < 30_000) return
      lastFetchRef.current = now
      usersApi.me().then((fresh) => {
        setAuth(fresh, useAuthStore.getState().accessToken ?? '')
        const ui = useUIStore.getState()
        // Sincronizar tema
        if (fresh.theme && fresh.theme !== ui.theme) {
          ui.setTheme(fresh.theme as 'light' | 'dark')
        }
        // Sincronizar accent color
        if (fresh.accentTheme && fresh.accentTheme !== ui.accentTheme) {
          ui.setAccentTheme(fresh.accentTheme)
        }
        // Sincronizar bottom nav favorites
        const serverFavs = fresh.settings?.bottomNavFavorites
        if (Array.isArray(serverFavs) && JSON.stringify(serverFavs) !== JSON.stringify(ui.bottomNavFavorites)) {
          ui.setBottomNavFavorites(serverFavs)
        }
      }).catch(() => {})
    }

    syncUser()

    const handleVisibility = () => { if (document.visibilityState === 'visible') syncUser() }
    const handleFocus = () => syncUser()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [accessToken, setAuth])

  return user
}
