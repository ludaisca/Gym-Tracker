import { api } from './client'

export interface LiftGoal {
  id: string
  userId: string
  exerciseName: string
  targetKg: number
  createdAt: string
}

export const goalsApi = {
  list: async (): Promise<LiftGoal[]> => {
    const { data } = await api.get<LiftGoal[]>('/goals')
    return data
  },
  upsert: async (exerciseName: string, targetKg: number): Promise<LiftGoal> => {
    const { data } = await api.post<LiftGoal>('/goals', { exerciseName, targetKg })
    return data
  },
  remove: async (exerciseName: string): Promise<void> => {
    await api.delete(`/goals/${encodeURIComponent(exerciseName)}`)
  },
}
