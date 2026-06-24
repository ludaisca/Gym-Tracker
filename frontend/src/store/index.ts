import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/domain'

interface PendingAction {
  id: string
  timestamp: number
  method: 'PUT' | 'POST' | 'DELETE' | 'PATCH'
  url: string
  body?: unknown
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  updateUser: (updates: Partial<User>) => void
  clearAuth: () => void
}

const DEFAULT_NAV_FAVORITES = ['/dashboard', '/agenda', '/stats', '/duelos', '/config']

interface UIState {
  theme: 'light' | 'dark'
  accentTheme: string
  isOffline: boolean
  bottomNavFavorites: string[]
  dashboardEditorOpen: boolean
  nutritionGoalOpen: boolean
  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
  setAccentTheme: (t: string) => void
  setOffline: (val: boolean) => void
  setBottomNavFavorites: (favs: string[]) => void
  openDashboardEditor: () => void
  closeDashboardEditor: () => void
  openNutritionGoal: () => void
  closeNutritionGoal: () => void
}

interface OfflineState {
  queue: PendingAction[]
  enqueue: (action: Omit<PendingAction, 'id' | 'timestamp'>) => void
  dequeue: (id: string) => void
  clearQueue: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      updateUser: (updates) => set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'gym-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }) }
  )
)

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      accentTheme: 'teal',
      isOffline: false,
      bottomNavFavorites: DEFAULT_NAV_FAVORITES,
      dashboardEditorOpen: false,
      nutritionGoalOpen: false,
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.setAttribute('data-theme', next)
          return { theme: next }
        }),
      setTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t)
        set({ theme: t })
      },
      setAccentTheme: (t) => {
        document.documentElement.setAttribute('data-accent', t)
        set({ accentTheme: t })
      },
      setOffline: (val) => set({ isOffline: val }),
      setBottomNavFavorites: (favs) => set({ bottomNavFavorites: favs }),
      openDashboardEditor: () => set({ dashboardEditorOpen: true }),
      closeDashboardEditor: () => set({ dashboardEditorOpen: false }),
      openNutritionGoal: () => set({ nutritionGoalOpen: true }),
      closeNutritionGoal: () => set({ nutritionGoalOpen: false }),
    }),
    { name: 'gym-ui', partialize: (s) => ({ theme: s.theme, accentTheme: s.accentTheme, bottomNavFavorites: s.bottomNavFavorites }) }
  )
)

export const useOfflineStore = create<OfflineState>()((set) => ({
  queue: [],
  enqueue: (action) =>
    set((s) => ({
      queue: [...s.queue, { ...action, id: crypto.randomUUID(), timestamp: Date.now() }],
    })),
  dequeue: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),
  clearQueue: () => set({ queue: [] }),
}))
