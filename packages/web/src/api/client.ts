import axios from 'axios'
import { useAuthStore, useOfflineStore } from '../store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Singleton para evitar múltiples refreshes en paralelo ante varios 401 simultáneos
let refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('gym-refresh-token')
            if (!refreshToken) throw new Error('no refresh token')
            const { data } = await api.post('/auth/refresh', { refreshToken })
            useAuthStore.getState().setAuth(useAuthStore.getState().user!, data.accessToken)
            localStorage.setItem('gym-refresh-token', data.refreshToken ?? refreshToken)
            return data.accessToken as string
          })().finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    // Offline: encolar writes para sync posterior
    if (!navigator.onLine && ['put', 'post', 'delete', 'patch'].includes(original.method ?? '')) {
      useOfflineStore.getState().enqueue({
        method: original.method!.toUpperCase() as 'PUT' | 'POST' | 'DELETE' | 'PATCH',
        url: original.url!,
        body: original.data ? JSON.parse(original.data) : undefined,
      })
    }

    return Promise.reject(error)
  }
)
