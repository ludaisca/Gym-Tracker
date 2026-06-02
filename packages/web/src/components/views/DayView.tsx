import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useEnsuredSession } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { sessionsApi } from '../../api/sessions'
import { getRoutineDays, getDayIds } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import type { WorkoutSession, CardioData } from '../../types/domain'
import ExerciseCard from '../workout/ExerciseCard'
import RestTimerModal from '../modals/RestTimerModal'
import { hapticSuccess, hapticSessionComplete } from '../../lib/haptics'
import { Check } from 'lucide-react'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DayView() {
  const { dayId } = useParams<{ dayId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])

  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    sessionsApi.listAll().then(setAllSessions).catch((err: unknown) => console.warn('[DayView]', err))
  }, [])

  const { session, update, saving } = useEnsuredSession(weekNumber, dayId ?? '', customRoutines)
  const [timer, setTimer] = useState<{ seconds: number; label: string } | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  if (!dayId || !routineDays[dayId]) {
    return (
      <div className="content">
        <p>Día no encontrado en tu rutina activa.</p>
        <button className="ghost-btn" onClick={() => navigate('/dashboard')}>Volver</button>
      </div>
    )
  }

  if (!session) {
    return <div className="content"><div className="spinner" /></div>
  }

  const dayDef = routineDays[dayId]
  const routineName = activeRoutineId ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom') : 'Sin rutina'
  const total = session.exercises.length
  const done = session.exercises.filter(e => e.done).length
  const pct = total > 0 ? Math.round(done / total * 100) : 0

  function toggleDone(exIdx: number) {
    const updated = session!.exercises.map((ex, i) => i === exIdx ? { ...ex, done: !ex.done } : ex)
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
        return prev ? { ...s, kg: prev.kg, reps: prev.reps } : s
      })
      return { ...ex, sets }
    })
    update({ exercises: updated })
  }

  function updateCardio(field: keyof CardioData, value: string) {
    const current: CardioData = session!.cardio ?? { machine: '', duration: user?.settings?.cardioDefault ?? '', intensity: '' }
    update({ cardio: { ...current, [field]: value } })
  }

  function toggleComplete() {
    const willComplete = !session!.complete
    if (willComplete) { hapticSessionComplete(); setCelebrate(true); setTimeout(() => setCelebrate(false), 500) }
    else hapticSuccess()
    update({ complete: willComplete })
  }

  const dayLabel = (dayDef as { label?: string }).label ?? dayId
  const daySubtitle = (dayDef as { subtitle?: string }).subtitle ?? routineName
  const exercises = dayDef.exercises ?? []

  return (
    <div className="dv-root fade-in">

      {/* ── Cabecera del día ── */}
      <div className="dv-header">
        <div className="dv-header-text">
          <h2 className="dv-title">{dayLabel}</h2>
          <p className="dv-sub">{capitalize(dayId)} · {daySubtitle}</p>
        </div>
        <div className="dv-header-right">
          {saving === 'pending' && <span className="save-indicator pending">Guardando…</span>}
          {saving === 'saved'   && <span className="save-indicator saved">Guardado ✓</span>}
          <div className="dv-dots">
            {session.exercises.map((ex, i) => (
              <span key={i} className={`dv-dot${ex.done ? ' done' : ''}`} title={`Ejercicio ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Barra de progreso ── */}
      <div className="dv-progress-track">
        <div className="dv-progress-fill" style={{ width: `${pct}%` }} />
        <span className="dv-progress-label">{done}/{total} ejercicios</span>
      </div>

      {/* ── Lista de ejercicios ── */}
      <div className="dv-exercises">
        {exercises.map((exDef, idx) => {
          const exState = session.exercises[idx]
          if (!exState) return null
          return (
            <ExerciseCard
              key={`${dayId}-${idx}`}
              number={idx + 1}
              exDef={exDef}
              exState={exState}
              allSessions={allSessions}
              dayIds={dayIds}
              currentWeek={weekNumber}
              routineDays={routineDays}
              onToggleDone={() => toggleDone(idx)}
              onSetChange={(setIdx, field, value) => updateSet(idx, setIdx, field, value)}
              onStartTimer={(seconds, label) => setTimer({ seconds, label })}
              onAutoFill={(prevSets) => autoFillExercise(idx, prevSets)}
            />
          )
        })}
      </div>

      {/* ── Cardio ── */}
      <div className="dv-section">
        <div className="dv-section-label">Cardio</div>
        <div className="split" style={{ marginTop: 'var(--space-3)' }}>
          <div className="field">
            <label>Máquina</label>
            <input value={session.cardio?.machine ?? ''} onChange={e => updateCardio('machine', e.target.value)} />
          </div>
          <div className="field">
            <label>Duración</label>
            <input placeholder="20 min" value={session.cardio?.duration ?? ''} onChange={e => updateCardio('duration', e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Intensidad</label>
            <input placeholder="Ej. Inclinación 8, vel. 5.5" value={session.cardio?.intensity ?? ''} onChange={e => updateCardio('intensity', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Notas ── */}
      <div className="dv-section notes">
        <div className="dv-section-label">Notas</div>
        <textarea
          style={{ marginTop: 'var(--space-3)' }}
          placeholder="Sensaciones, técnica, PRs…"
          value={session.notes ?? ''}
          onChange={e => update({ notes: e.target.value })}
        />
      </div>

      {/* ── Botón completar ── */}
      <button
        className={`dv-complete-btn${session.complete ? ' done' : ''}${saving === 'pending' ? ' saving' : ''}${celebrate ? ' celebrate' : ''}`}
        onClick={toggleComplete}
        disabled={saving === 'pending'}
      >
        {saving === 'pending'
          ? <div className="spinner-small" />
          : session.complete
            ? <><Check size={20} /> Sesión completada</>
            : 'Marcar sesión como completada'
        }
      </button>

      {session.complete && (
        <div className="session-summary">
          <div className="session-summary-row">
            <span>{done}/{total} ejercicios</span>
            {done === total && total > 0 && <span style={{ color: 'var(--color-success)' }}>Todo hecho ✓</span>}
          </div>
        </div>
      )}

      {timer && (
        <RestTimerModal seconds={timer.seconds} label={timer.label} onClose={() => setTimer(null)} />
      )}
    </div>
  )
}
