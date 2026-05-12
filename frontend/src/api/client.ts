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

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('gym-refresh-token')
        if (!refreshToken) throw new Error('no refresh token')
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        useAuthStore.getState().setAuth(useAuthStore.getState().user!, data.accessToken)
        localStorage.setItem('gym-refresh-token', data.refreshToken ?? refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
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
