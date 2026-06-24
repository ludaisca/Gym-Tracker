import { useState, useMemo, useEffect } from 'react'
import { SkeletonExerciseList } from '../ui/Skeleton'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useEnsuredSession } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { sessionsApi } from '../../api/sessions'
import { getRoutineDays, getDayIds } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import type { WorkoutSession } from '../../types/domain'
import ExerciseCard from '../workout/ExerciseCard'
import RestTimerModal from '../modals/RestTimerModal'
import type { CardioData } from '../../types/domain'


export default function DayView() {
  const { dayId } = useParams<{ dayId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])

  // Todas las sesiones (multi-semana) para historial y autofill de ExerciseCard
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    sessionsApi.listAll().then(setAllSessions).catch(() => {})
  }, [])

  const { session, update, saving } = useEnsuredSession(weekNumber, dayId ?? '', customRoutines)

  const [timer, setTimer] = useState<{ seconds: number; label: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!dayId || !routineDays[dayId]) {
    return (
      <div className="content">
        <p>Día no encontrado en tu rutina activa.</p>
        <button className="ghost-btn" onClick={() => navigate('/dashboard')}>Volver al dashboard</button>
      </div>
    )
  }

  if (!session) {
    return <SkeletonExerciseList count={4} />
  }

  const dayDef = routineDays[dayId]
  const routineName = activeRoutineId ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom') : 'Sin rutina'
  const exercises = dayDef.exercises ?? []

  const totalExercises = session.exercises.length
  const doneExercises = session.exercises.filter(ex => ex.done).length
  const pct = totalExercises > 0 ? Math.round(doneExercises / totalExercises * 100) : 0

  const sessionVolume = Math.round(
    session.exercises.reduce((total, ex) =>
      total + ex.sets.reduce((s, set) => {
        const kg = parseFloat(set.kg), reps = parseFloat(set.reps)
        return s + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
      }, 0)
    , 0)
  )

  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  function toggleDone(exIdx: number) {
    const updated = session!.exercises.map((ex, i) => {
      if (i !== exIdx) return ex
      const newDone = !ex.done
      const sets = ex.sets.map(s =>
        newDone && s.kg && s.reps
          ? { ...s, completed: true }
          : { ...s, completed: false }
      )
      return { ...ex, done: newDone, sets }
    })
    update({ exercises: updated })
  }

  function updateSet(exIdx: number, setIdx: number, field: 'kg' | 'reps', value: string) {
    const updated = session!.exercises.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s)
      return { ...ex, sets }
    })
    update({ exercises: updated })
  }

  function autoFillExercise(exIdx: number, previousSets: { kg: string; reps: string }[]) {
    const updated = session!.exercises.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, si) => {
        const prev = previousSets[si]
        if (!prev) return s
        return { ...s, kg: prev.kg, reps: prev.reps }
      })
      return { ...ex, sets }
    })
    update({ exercises: updated })
  }

  function completeSet(exIdx: number, setIdx: number) {
    const set = session!.exercises[exIdx]?.sets[setIdx]
    if (!set || !set.kg || !set.reps) return
    const updated = session!.exercises.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, si) => si === setIdx ? { ...s, completed: true } : s)
      const allDone = sets.every(s => s.completed)
      return { ...ex, sets, done: allDone }
    })
    update({ exercises: updated })
    const restSecs = exercises[exIdx]?.rest ?? 60
    const label = `${exercises[exIdx]?.name ?? ''} · S${setIdx + 1}`
    setTimer({ seconds: restSecs, label })
  }

  function updateCardio(field: keyof CardioData, value: string) {
    const current: CardioData = session!.cardio ?? { machine: '', duration: user?.settings?.cardioDefault ?? '', intensity: '' }
    update({ cardio: { ...current, [field]: value } })
  }

  function toggleComplete() {
    update({ complete: !session!.complete })
  }

  const daySubtitle = (dayDef as { subtitle?: string }).subtitle ?? routineName

  const volDisplay = sessionVolume >= 1000
    ? `${(sessionVolume / 1000).toFixed(1)}k`
    : `${sessionVolume}`

  return (
    <section className="card fade-in">
      {/* Subtítulo + guardado */}
      <div className="dayview-subhead">
        <p className="muted">{daySubtitle}</p>
        {(saving === 'pending' || saving === 'saved') && (
          <span className={`save-indicator ${saving}`}>
            {saving === 'pending' ? 'Guardando…' : 'Guardado ✓'}
          </span>
        )}
      </div>

      {/* Stats strip */}
      <div className="dayview-stats">
        {sessionVolume > 0 && (
          <div className="dayview-stat">
            <span className="dayview-stat-val">{volDisplay} kg</span>
            <span className="dayview-stat-label">volumen</span>
          </div>
        )}
        <div className="dayview-stat">
          <span className="dayview-stat-val">{elapsedStr}</span>
          <span className="dayview-stat-label">tiempo</span>
        </div>
        <div className="dayview-stat">
          <span className="dayview-stat-val">{doneExercises}/{totalExercises}</span>
          <span className="dayview-stat-label">ejercicios</span>
        </div>
        <div className="dayview-stat dayview-stat-pct">
          <div className="progress" style={{ flex: 1 }}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="dayview-stat-label">{pct}%</span>
        </div>
      </div>

      <div className="panel-body" style={{ display: 'grid', gap: '1rem' }}>
        {/* Ejercicios */}
        <div className="exercise-list">
          {exercises.map((exDef, idx) => {
            const exState = session.exercises[idx]
            if (!exState) return null
            return (
              <ExerciseCard
                key={`${dayId}-${idx}`}
                exDef={exDef}
                exState={exState}
                allSessions={allSessions}
                dayIds={dayIds}
                currentWeek={weekNumber}
                routineDays={routineDays}
                onToggleDone={() => toggleDone(idx)}
                onSetChange={(setIdx, field, value) => updateSet(idx, setIdx, field, value)}
                onCompleteSet={(setIdx) => completeSet(idx, setIdx)}
                onStartTimer={(seconds, label) => setTimer({ seconds, label })}
                onAutoFill={(prevSets) => autoFillExercise(idx, prevSets)}
              />
            )
          })}
        </div>

        {/* Cardio + Notas */}
        <div className="split">
          <section className="card dayview-section">
            <p className="dayview-section-label">Cardio</p>
            <div className="split" style={{ gap: 'var(--space-3)' }}>
              <div className="field">
                <label>Máquina</label>
                <select
                  value={session.cardio?.machine ?? ''}
                  onChange={(e) => updateCardio('machine', e.target.value)}
                >
                  <option value="">Sin cardio</option>
                  <option value="Bicicleta fija">Bicicleta fija</option>
                  <option value="Caminadora">Caminadora</option>
                  <option value="Elíptica">Elíptica</option>
                </select>
              </div>
              <div className="field">
                <label>Duración</label>
                <input
                  placeholder="20 min"
                  value={session.cardio?.duration ?? ''}
                  onChange={(e) => updateCardio('duration', e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Intensidad</label>
                <input
                  placeholder="Ej. Inclinación 8, velocidad 5.5"
                  value={session.cardio?.intensity ?? ''}
                  onChange={(e) => updateCardio('intensity', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="card dayview-section notes">
            <p className="dayview-section-label">Notas de la sesión</p>
            <textarea
              placeholder="Sensaciones, técnica, PRs…"
              value={session.notes ?? ''}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </section>
        </div>

        {/* Botón de completar — standalone al fondo */}
        <button
          className={`complete-btn${session.complete ? ' is-complete' : ''}`}
          onClick={toggleComplete}
        >
          {session.complete ? 'Sesión completada ✓' : 'Marcar como completada'}
        </button>
      </div>

      {timer && (
        <RestTimerModal
          seconds={timer.seconds}
          label={timer.label}
          onClose={() => setTimer(null)}
        />
      )}
    </section>
  )
}
