import { api } from './client'
import type { Routine } from '../types/domain'

export const routinesApi = {
  list: () => api.get<Routine[]>('/routines').then((r) => r.data),

  create: (data: Pick<Routine, 'name' | 'description' | 'days'>) =>
    api.post<Routine>('/routines', data).then((r) => r.data),

  update: (id: string, data: Partial<Pick<Routine, 'name' | 'description' | 'days'>>) =>
    api.put<Routine>(`/routines/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/routines/${id}`),

  share: (id: string) =>
    api.post<{ shareCode: string }>(`/routines/${id}/share`).then((r) => r.data),

  revokeShare: (id: string) => api.delete(`/routines/${id}/share`),

  importByCode: (code: string) =>
    api.post<Routine>(`/routines/import/${code}`).then((r) => r.data),

  getPublic: (code: string) =>
    api.get<Routine>(`/routines/public/${code}`).then((r) => r.data),

  publish: (id: string) =>
    api.post<{ isPublic: boolean }>(`/routines/${id}/publish`).then((r) => r.data),

  unpublish: (id: string) => api.delete(`/routines/${id}/publish`),
}
