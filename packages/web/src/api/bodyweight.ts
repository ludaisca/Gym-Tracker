import { api } from './client'

export interface BodyWeightEntry {
  id: string
  date: string
  weight_kg: number
  notes?: string | null
  createdAt: string
}

export const bodyWeightApi = {
  list: (): Promise<BodyWeightEntry[]> =>
    api.get('/users/me/bodyweight').then(r => r.data),

  upsert: (date: string, weight_kg: number, notes?: string): Promise<BodyWeightEntry> =>
    api.post('/users/me/bodyweight', { date, weight_kg, notes }).then(r => r.data),

  remove: (date: string): Promise<void> =>
    api.delete(`/users/me/bodyweight/${date}`).then(r => r.data),
}
