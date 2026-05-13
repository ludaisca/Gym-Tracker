import type { WorkoutSession, ExerciseDef } from '../types/domain'
import { PRESET_ROUTINES } from './presetRoutines'
import type { Routine } from '../types/domain'

export function calc1RM(kg: string | number, reps: string | number): number | null {
  const k = parseFloat(String(kg))
  const r = parseFloat(String(reps))
  if (isNaN(k) || isNaN(r) || k <= 0 || r <= 0) return null
  if (r === 1) return k
  return Math.round(k * (1 + r / 30))
}

export function calcWeekVolume(sessions: WorkoutSession[], weekNum: number, dayIds: string[]): number {
  return dayIds.reduce((total, day) => {
    const session = sessions.find((s) => s.weekNumber === weekNum && s.dayId === day)
    if (!session) return total
    return total + session.exercises.reduce((s, ex) =>
      s + ex.sets.reduce((t, set) => {
        const kg = parseFloat(set.kg)
        const reps = parseFloat(set.reps)
        return t + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
      }, 0)
    , 0)
  }, 0)
}

export function getBestKgForWeek(
  sessions: WorkoutSession[],
  dayIds: string[],
  exName: string,
  week: number,
  routineDays: Record<string, { exercises: ExerciseDef[] }>
): number {
  let best = 0
  for (const day of dayIds) {
    const session = sessions.find((s) => s.weekNumber === week && s.dayId === day)
    if (!session) continue
    const dayExercises = routineDays[day]?.exercises ?? []
    session.exercises.forEach((ex, idx) => {
      if (dayExercises[idx]?.name === exName) {
        ex.sets.forEach((s) => {
          const kg = parseFloat(s.kg)
          if (!isNaN(kg) && kg > best) best = kg
        })
      }
    })
  }
  return best
}

export function getPreviousBest(
  sessions: WorkoutSession[],
  dayIds: string[],
  exName: string,
  currentWeek: number,
  routineDays: Record<string, { exercises: ExerciseDef[] }>
): number {
  let best = 0
  for (let w = 1; w < currentWeek; w++) {
    const b = getBestKgForWeek(sessions, dayIds, exName, w, routineDays)
    if (b > best) best = b
  }
  return best
}

export function getExerciseHistory(
  sessions: WorkoutSession[],
  dayIds: string[],
  exName: string,
  currentWeek: number,
  routineDays: Record<string, { exercises: ExerciseDef[] }>
): { week: number; kg: number }[] {
  const result: { week: number; kg: number }[] = []
  for (let w = 1; w <= currentWeek; w++) {
    const kg = getBestKgForWeek(sessions, dayIds, exName, w, routineDays)
    if (kg > 0) result.push({ week: w, kg })
  }
  return result.slice(-4)
}

export function isPR(
  sessions: WorkoutSession[],
  dayIds: string[],
  exName: string,
  currentKg: string,
  currentWeek: number,
  routineDays: Record<string, { exercises: ExerciseDef[] }>
): boolean {
  if (!currentKg || isNaN(parseFloat(currentKg))) return false
  if (currentWeek <= 1) return false
  const prev = getPreviousBest(sessions, dayIds, exName, currentWeek, routineDays)
  return parseFloat(currentKg) > prev
}

export function calcStreak(
  sessions: WorkoutSession[],
  dayIds: string[],
  currentWeek: number
): number {
  let streak = 0
  for (let w = currentWeek; w >= 1; w--) {
    const done = dayIds.filter((d) =>
      sessions.find((s) => s.weekNumber === w && s.dayId === d)?.complete
    ).length
    if (done >= Math.ceil(dayIds.length * 0.75)) streak++
    else break
  }
  return streak
}

export function getRoutineDays(
  activeRoutineId: string | null | undefined,
  customRoutines: Routine[]
): Record<string, { exercises: ExerciseDef[] }> {
  if (!activeRoutineId) return {}
  if (PRESET_ROUTINES[activeRoutineId]) {
    return PRESET_ROUTINES[activeRoutineId].days as Record<string, { exercises: ExerciseDef[] }>
  }
  const custom = customRoutines.find((r) => r.id === activeRoutineId)
  return (custom?.days ?? {}) as Record<string, { exercises: ExerciseDef[] }>
}

export function getDayIds(
  activeRoutineId: string | null | undefined,
  customRoutines: Routine[]
): string[] {
  return Object.keys(getRoutineDays(activeRoutineId, customRoutines))
}

export function getTodayDayId(dayIds: string[]): string | null {
  const slots = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const today = slots[new Date().getDay()]
  return dayIds.includes(today) ? today : null
}

export function getLastRecordedSets(
  sessions: WorkoutSession[],
  dayIds: string[],
  exName: string,
  currentWeek: number,
  routineDays: Record<string, { exercises: ExerciseDef[] }>
): { kg: string; reps: string }[] | null {
  for (let w = currentWeek - 1; w >= 1; w--) {
    for (const day of dayIds) {
      const session = sessions.find((s) => s.weekNumber === w && s.dayId === day)
      if (!session) continue
      const dayExercises = routineDays[day]?.exercises ?? []
      const exIdx = dayExercises.findIndex((e) => e.name === exName)
      if (exIdx !== -1) {
        const exState = session.exercises[exIdx]
        if (exState && exState.sets && exState.sets.some((s) => parseFloat(s.kg) > 0 || parseFloat(s.reps) > 0)) {
          return exState.sets.map((s) => ({ kg: s.kg, reps: s.reps }))
        }
      }
    }
  }
  return null
}
