import { api } from './client'
import type { GlobalNote } from '../types/domain'

export const notesApi = {
  list: () => api.get<GlobalNote[]>('/notes').then((r) => r.data),

  create: (text: string) => api.post<GlobalNote>('/notes', { text }).then((r) => r.data),

  update: (id: string, data: Partial<Pick<GlobalNote, 'text' | 'done' | 'position'>>) =>
    api.put<GlobalNote>(`/notes/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/notes/${id}`),

  reorder: (ids: string[]) => api.put('/notes/reorder', { ids }),
}
