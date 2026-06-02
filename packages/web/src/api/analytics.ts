import { api } from './client'

export interface WeekAnalyticsPR {
  name: string
  kg: number
  reps: number
  oneRM: number
}

export interface WeekAnalytics {
  week: number
  sessions: number
  totalVolume: number
  exercises: { name: string; volume: number }[]
  prs: WeekAnalyticsPR[]
}

export interface ExerciseAnalyticsPoint {
  week: number
  bestKg: number
  bestReps: number
  oneRM: number
}

export const analyticsApi = {
  getWeek: (week: number) =>
    api.get<WeekAnalytics>(`/analytics/week/${week}`).then((r) => r.data),

  getExercise: (name: string) =>
    api
      .get<ExerciseAnalyticsPoint[]>('/analytics/exercise', { params: { name } })
      .then((r) => r.data),
}
