import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionsApi } from '../api/sessions'
import { useAuthStore } from '../store'
import type { WorkoutSession, ExerciseSession, CardioData, Routine } from '../types/domain'
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
    return sessions.find((s) => s.dayId === dayId)
  }, [sessions])

  return { sessions, loading, upsert, getSession, reload: load }
}

export function useEnsuredSession(weekNumber: number, dayId: string, customRoutines: Routine[]) {
  const { user } = useAuthStore()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [saving, setSaving] = useState<'idle' | 'pending' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushSeqRef = useRef(0)

  const activeRoutineId = user?.activeRoutineId

  useEffect(() => {
    const routineDays = getRoutineDays(activeRoutineId, customRoutines)
    sessionsApi.list(weekNumber).then((all) => {
      const found = all.find((s) => s.dayId === dayId)
      if (found) {
        setSession(found)
      } else {
        const dayDef = routineDays[dayId]
        const exercises: ExerciseSession[] = (dayDef?.exercises ?? []).map((ex) => ({
          done: false,
          sets: Array.from({ length: ex.sets }, () => ({ kg: '', reps: '' })),
        }))
        const cardioDefault = user?.settings?.cardioDefault ?? ''
        setSession({
          id: '', userId: user?.id ?? '', weekNumber, dayId,
          complete: false, notes: '', cardio: { machine: '', duration: cardioDefault, intensity: '' },
          exercises, createdAt: '', updatedAt: '',
        })
      }
    }).catch(() => {})
  }, [weekNumber, dayId, activeRoutineId, customRoutines])

  const flush = useCallback(async (current: WorkoutSession) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaving('pending')
    const seq = ++flushSeqRef.current
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await sessionsApi.upsert(current.weekNumber, current.dayId, {
          complete: current.complete,
          notes: current.notes ?? '',
          exercises: current.exercises,
          cardio: current.cardio ?? null,
        })
        // Ignorar respuestas de requests superadas por una actualización más reciente
        if (seq === flushSeqRef.current) {
          setSession(result)
          setSaving('saved')
          setTimeout(() => setSaving('idle'), 2000)
        }
      } catch {
        if (seq === flushSeqRef.current) setSaving('idle')
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

  return { session, update, saving }
}
