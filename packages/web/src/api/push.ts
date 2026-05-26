import { api } from './client'

export const pushApi = {
  test: () => api.post<{ sent: number; failed: number }>('/push/test').then((r) => r.data),
  registerFcmToken: (token: string) => api.post('/push/fcm-token', { token }),
  unregisterFcmToken: () => api.delete('/push/fcm-token'),
}
