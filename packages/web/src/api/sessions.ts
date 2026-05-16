import { api } from './client'
import type { WorkoutSession, CardioData } from '../types/domain'

export const sessionsApi = {
  list: (week: number) =>
    api.get<WorkoutSession[]>('/sessions', { params: { week } }).then((r) => r.data),

  listAll: () =>
    api.get<WorkoutSession[]>('/sessions').then((r) => r.data),

  upsert: (
    weekNumber: number,
    dayId: string,
    data: Partial<Pick<WorkoutSession, 'complete' | 'notes' | 'exercises'> & { cardio: CardioData | null }>
  ) => api.put<WorkoutSession>(`/sessions/${weekNumber}/${dayId}`, data).then((r) => r.data),

  delete: (weekNumber: number, dayId: string) =>
    api.delete(`/sessions/${weekNumber}/${dayId}`),
}
