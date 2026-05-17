import { api } from './client'
import type { User, UserSettings } from '../types/domain'

export const usersApi = {
  me: () => api.get<User>('/users/me').then((r) => r.data),

  update: (data: Partial<Pick<User, 'name' | 'email' | 'avatar' | 'theme' | 'accentTheme' | 'currentWeek' | 'activeRoutineId' | 'routineStartDate'> & { password?: string }>) =>
    api.put<User>('/users/me', data).then((r) => r.data),

  updateSettings: (data: Partial<UserSettings> & { aiKey?: string | null }) =>
    api.put<UserSettings>('/users/me/settings', data).then((r) => r.data),

  export: () => api.get('/users/me/export').then((r) => r.data),

  import: (payload: unknown) => api.post('/users/me/import', payload),

  activateTrial: () => api.post<User>('/users/me/trial').then((r) => r.data),
}
