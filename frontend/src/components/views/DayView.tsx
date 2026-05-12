import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useEnsuredSession } from '../../hooks/useSessions'
import { useSessions } from '../../hooks/useSessions'
import { getRoutineDays, getDayIds } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import ExerciseCard from '../workout/ExerciseCard'
import RestTimerModal from '../modals/RestTimerModal'
import type { CardioData } from '../../types/domain'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DayView() {
  const { dayId } = useParams<{ dayId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, []), [activeRoutineId])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, []), [activeRoutineId])

  const { sessions: allSessions } = useSessions(weekNumber)
  const { session, update } = useEnsuredSession(weekNumber, dayId ?? '')

  const [timer, setTimer] = useState<{ seconds: number; label: string } | null>(null)

  if (!dayId || !routineDays[dayId]) {
    return (
      <div className="content">
        <p>Día no encontrado en tu rutina activa.</p>
        <button className="ghost-btn" onClick={() => navigate('/dashboard')}>Volver al dashboard</button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="content">
        <div className="spinner" />
      </div>
    )
  }

  const dayDef = routineDays[dayId]
  const routineName = activeRoutineId ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom') : 'Sin rutina'
  const total = session.exercises.length
  const done = session.exercises.filter(e => e.done).length
  const pct = total > 0 ? Math.round(done / total * 100) : 0

  function toggleDone(exIdx: number) {
    const updated = session!.exercises.map((ex, i) =>
      i === exIdx ? { ...ex, done: !ex.done } : ex
    )
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

  function updateCardio(field: keyof CardioData, value: string) {
    const current: CardioData = session!.cardio ?? { machine: 'Caminadora inclinada', duration: '', intensity: '' }
    update({ cardio: { ...current, [field]: value } })
  }

  function toggleComplete() {
    update({ complete: !session!.complete })
  }

  const dayLabel = (dayDef as { label?: string }).label ?? dayId
  const daySubtitle = (dayDef as { subtitle?: string }).subtitle ?? routineName
  const exercises = dayDef.exercises ?? []

  return (
    <section className="card">
      <div className="panel-head">
        <div>
          <h3>{capitalize(dayId)} · {dayLabel}</h3>
          <p>{daySubtitle}</p>
        </div>
        <div style={{ flexShrink: 0, minWidth: 120 }}>
          <div className="tiny muted" style={{ marginBottom: '.45rem' }}>
            Progreso {done}/{total}
          </div>
          <div className="progress">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="panel-body" style={{ display: 'grid', gap: '1rem' }}>
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
                onStartTimer={(seconds, label) => setTimer({ seconds, label })}
              />
            )
          })}
        </div>

        <div className="split">
          <section className="card">
            <div className="panel-head">
              <div><h3>Cardio</h3><p>Al final de la sesión.</p></div>
            </div>
            <div className="panel-body split">
              <div className="field">
                <label>Máquina</label>
                <input
                  value={session.cardio?.machine ?? ''}
                  onChange={(e) => updateCardio('machine', e.target.value)}
                />
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

          <section className="card notes">
            <div className="panel-head">
              <div><h3>Notas</h3><p>Sensaciones, técnica, PRs.</p></div>
            </div>
            <div className="panel-body">
              <textarea
                placeholder="Notas de la sesión..."
                value={session.notes ?? ''}
                onChange={(e) => update({ notes: e.target.value })}
              />
              <button
                className={`complete-btn${session.complete ? ' is-complete' : ''}`}
                onClick={toggleComplete}
              >
                {session.complete ? 'Sesión completada ✓' : 'Marcar sesión como completada'}
              </button>
            </div>
          </section>
        </div>
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
