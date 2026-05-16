import { api } from './client'
import type { Routine } from '../types/domain'

export const routinesApi = {
  list: () => api.get<Routine[]>('/routines').then((r) => r.data),

  create: (data: Pick<Routine, 'name' | 'description' | 'days'>) =>
    api.post<Routine>('/routines', data).then((r) => r.data),

  update: (id: string, data: Partial<Pick<Routine, 'name' | 'description' | 'days'>>) =>
    api.put<Routine>(`/routines/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/routines/${id}`),
}
