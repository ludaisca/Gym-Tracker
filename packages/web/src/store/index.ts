import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/domain'

interface PendingAction {
  id: string
  timestamp: number
  retries: number
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
  isPro: () => boolean
}

interface UIState {
  theme: 'light' | 'dark'
  accentTheme: string
  isOffline: boolean
  toggleTheme: () => void
  setAccentTheme: (t: string) => void
  setOffline: (val: boolean) => void
}

interface OfflineState {
  queue: PendingAction[]
  enqueue: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>) => void
  dequeue: (id: string) => void
  incrementRetries: (id: string) => void
  clearQueue: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      updateUser: (updates) => set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      isPro: () => {
        const user = get().user
        if (!user) return false
        const now = new Date()
        if (user.plan === 'pro' && (!user.planExpiresAt || new Date(user.planExpiresAt) > now)) return true
        if (user.trialEndsAt && new Date(user.trialEndsAt) > now) return true
        return false
      },
    }),
    // accessToken no se persiste: se renueva en memoria tras cada recarga usando el refresh token
    { name: 'gym-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
)

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      accentTheme: 'teal',
      isOffline: false,
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.setAttribute('data-theme', next)
          return { theme: next }
        }),
      setAccentTheme: (t) => {
        document.documentElement.setAttribute('data-accent', t)
        set({ accentTheme: t })
      },
      setOffline: (val) => set({ isOffline: val }),
    }),
    { name: 'gym-ui', partialize: (s) => ({ theme: s.theme, accentTheme: s.accentTheme }) }
  )
)

const QUEUE_MAX_SIZE = 200
const QUEUE_TTL_MS  = 7 * 24 * 60 * 60 * 1000 // 7 días

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      queue: [],
      enqueue: (action) =>
        set((s) => {
          const now = Date.now()
          const fresh = s.queue.filter((a) => now - a.timestamp < QUEUE_TTL_MS)
          const trimmed = fresh.length >= QUEUE_MAX_SIZE ? fresh.slice(fresh.length - QUEUE_MAX_SIZE + 1) : fresh
          return { queue: [...trimmed, { ...action, id: crypto.randomUUID(), timestamp: now, retries: 0 }] }
        }),
      dequeue: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),
      incrementRetries: (id) =>
        set((s) => ({ queue: s.queue.map((a) => a.id === id ? { ...a, retries: a.retries + 1 } : a) })),
      clearQueue: () => set({ queue: [] }),
    }),
    { name: 'gym-offline-queue' }
  )
)
