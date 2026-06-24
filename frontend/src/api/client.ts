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

// Promise compartida: si ya hay un refresh en curso, todas las peticiones que
// fallen con 401 esperan el mismo resultado en lugar de lanzar llamadas paralelas.
// Sin esto, múltiples 401 simultáneos rotan el refresh token varias veces y el
// segundo intento usa un token ya inválido → logout inesperado.
let refreshingPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('gym-refresh-token')
  if (!refreshToken) throw new Error('no refresh token')
  const { data } = await axios.post('/api/auth/refresh', { refreshToken })
  useAuthStore.getState().setAuth(useAuthStore.getState().user!, data.accessToken)
  localStorage.setItem('gym-refresh-token', data.refreshToken ?? refreshToken)
  return data.accessToken as string
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshingPromise) {
          refreshingPromise = refreshAccessToken().finally(() => {
            refreshingPromise = null
          })
        }
        const newToken = await refreshingPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        // Solo cerrar sesión si el servidor rechaza explícitamente (4xx).
        // En errores de red (timeout, offline) se mantiene la sesión para
        // que el usuario pueda seguir cuando recupere conexión.
        if (axios.isAxiosError(refreshErr) && refreshErr.response?.status) {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
        }
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
