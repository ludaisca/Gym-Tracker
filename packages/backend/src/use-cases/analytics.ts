import type { WorkoutSession } from '@prisma/client'
import type { SessionRepository } from '../repositories/SessionRepository'
import { extractBestOneRMs } from '../types/domain'
import { ucErr, UCError } from './errors'

interface ExerciseEntry {
  name?: string
  done?: boolean
  sets?: Array<{ kg: string; reps: string }>
}

export async function getWeekAnalytics(
  sessions: SessionRepository,
  userId: string,
  week: number
): Promise<{
  week: number
  sessions: number
  totalVolume: number
  exercises: Array<{ name: string; volume: number }>
  prs: Array<{ name: string; kg: number; reps: number; oneRM: number }>
} | UCError> {
  if (isNaN(week) || week < 1) return ucErr('Número de semana inválido.', 400)

  const sessionList = await sessions.findByWeek(userId, week)

  const byExercise = new Map<string, number>()
  let totalVolume = 0

  for (const s of sessionList) {
    const exercises = Array.isArray(s.exercises) ? s.exercises as ExerciseEntry[] : []
    for (const ex of exercises) {
      if (!ex?.name) continue
      const vol = (ex.sets ?? []).reduce((a, set) => {
        const kg = parseFloat(set.kg)
        const reps = parseFloat(set.reps)
        return a + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
      }, 0)
      byExercise.set(ex.name, (byExercise.get(ex.name) ?? 0) + vol)
      totalVolume += vol
    }
  }

  const bests = extractBestOneRMs(sessionList)
  const prs = Object.values(bests)
    .map(b => ({ name: b.name, kg: b.weight, reps: b.reps, oneRM: b.oneRM }))
    .sort((a, b) => b.oneRM - a.oneRM)

  const exercises = [...byExercise.entries()]
    .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume)

  return { week, sessions: sessionList.length, totalVolume: Math.round(totalVolume), exercises, prs }
}

export async function getExerciseProgress(
  sessionRepo: SessionRepository,
  userId: string,
  name: string
): Promise<Array<{ week: number; bestKg: number; bestReps: number; oneRM: number }> | UCError> {
  if (!name) return ucErr('Parámetro name requerido.', 400)

  const sessions = await sessionRepo.findAll(userId)
  const byWeek = new Map<number, { bestKg: number; bestReps: number; oneRM: number }>()

  for (const s of sessions) {
    const exercises = Array.isArray(s.exercises) ? s.exercises as ExerciseEntry[] : []
    for (const ex of exercises) {
      if (!ex?.name || ex.name.toLowerCase() !== name.toLowerCase()) continue
      for (const set of (ex.sets ?? [])) {
        const kg = parseFloat(set.kg)
        const reps = parseFloat(set.reps)
        if (isNaN(kg) || isNaN(reps) || kg <= 0 || reps <= 0) continue
        const oneRM = Math.round(kg * (1 + reps / 30))
        const prev = byWeek.get(s.weekNumber)
        if (!prev || oneRM > prev.oneRM) {
          byWeek.set(s.weekNumber, { bestKg: kg, bestReps: reps, oneRM })
        }
      }
    }
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, data]) => ({ week, ...data }))
}

export { UCError }
// Re-export WorkoutSession for use in session operations
export type { WorkoutSession }
