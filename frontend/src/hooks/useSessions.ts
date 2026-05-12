import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionsApi } from '../api/sessions'
import { useAuthStore } from '../store'
import type { WorkoutSession, ExerciseSession, CardioData } from '../types/domain'
import { getRoutineDays } from '../lib/fitness'

export function useSessions(weekNumber: number) {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sessionsApi.list(weekNumber)
      setSessions(data)
    } catch {
      // offline or error — keep existing
    } finally {
      setLoading(false)
    }
  }, [weekNumber])

  useEffect(() => { load() }, [load])

  const upsert = useCallback(async (
    dayId: string,
    patch: Partial<Pick<WorkoutSession, 'complete' | 'notes' | 'exercises'> & { cardio: CardioData | null }>
  ) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.weekNumber === weekNumber && s.dayId === dayId)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], ...patch }
        return updated
      }
      return [...prev, { id: '', userId: user?.id ?? '', weekNumber, dayId, complete: false, notes: '', cardio: null, exercises: [], createdAt: '', updatedAt: '', ...patch }]
    })
    try {
      const result = await sessionsApi.upsert(weekNumber, dayId, patch)
      setSessions((prev) => prev.map((s) => s.weekNumber === weekNumber && s.dayId === dayId ? result : s))
    } catch {
      // offline — optimistic update remains, will sync later
    }
  }, [weekNumber, user?.id])

  const getSession = useCallback((dayId: string): WorkoutSession | undefined => {
    return sessions.find((s) => s.weekNumber === weekNumber && s.dayId === dayId)
  }, [sessions, weekNumber])

  return { sessions, loading, upsert, getSession, reload: load }
}

export function useEnsuredSession(weekNumber: number, dayId: string) {
  const { user } = useAuthStore()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeRoutineId = user?.activeRoutineId
  const routineDays = getRoutineDays(activeRoutineId, [])

  useEffect(() => {
    sessionsApi.list(weekNumber).then((all) => {
      const found = all.find((s) => s.dayId === dayId)
      if (found) {
        setSession(found)
      } else {
        // Build a local session based on routine
        const dayDef = routineDays[dayId]
        const exercises: ExerciseSession[] = (dayDef?.exercises ?? []).map((ex) => ({
          done: false,
          sets: Array.from({ length: ex.sets }, () => ({ kg: '', reps: '' })),
        }))
        setSession({
          id: '', userId: user?.id ?? '', weekNumber, dayId,
          complete: false, notes: '', cardio: { machine: 'Caminadora inclinada', duration: '', intensity: '' },
          exercises, createdAt: '', updatedAt: '',
        })
      }
    }).catch(() => {})
  }, [weekNumber, dayId])

  const flush = useCallback(async (current: WorkoutSession) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await sessionsApi.upsert(current.weekNumber, current.dayId, {
          complete: current.complete,
          notes: current.notes ?? '',
          exercises: current.exercises,
          cardio: current.cardio ?? null,
        })
        setSession(result)
      } catch {
        // offline — local state remains
      }
    }, 800)
  }, [])

  const update = useCallback((patch: Partial<WorkoutSession>) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      flush(next)
      return next
    })
  }, [flush])

  return { session, update }
}
