import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { getRoutineDays, getDayIds, getTodayDayId } from '../../lib/fitness'
import { IconTarget } from '../ui/Icons'
import type { ExerciseDef } from '../../types/domain'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function estimateMinutes(exercises: ExerciseDef[]): number {
  // ~3 min por serie (trabajo + descanso) + 5 min calentamiento
  return exercises.reduce((acc, e) => acc + e.sets * 3, 5)
}

export default function Agenda() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const todayId = useMemo(() => getTodayDayId(dayIds), [dayIds])

  const { sessions } = useSessions(weekNumber)

  const completedDays = useMemo(
    () => sessions.filter(s => s.weekNumber === weekNumber && s.complete).length,
    [sessions, weekNumber]
  )

  if (dayIds.length === 0) {
    return (
      <div className="fade-in empty-state" style={{ marginTop: 'var(--space-10)' }}>
        <span className="empty-icon"><IconTarget size={48} /></span>
        <p>No tienes rutina activa.<br />Configura una en <strong>Mis Rutinas</strong>.</p>
        <button className="primary-btn" onClick={() => navigate('/rutinas')}>Ir a Rutinas</button>
      </div>
    )
  }

  return (
    <div className="agenda fade-in">

      {/* Cabecera de semana */}
      <div className="agenda-week-header">
        <div>
          <span className="agenda-week-label">Semana {weekNumber}</span>
          <span className="agenda-week-sub">{completedDays}/{dayIds.length} días completados</span>
        </div>
        <div className="agenda-week-bar">
          <div
            className="agenda-week-bar-fill"
            style={{ width: `${dayIds.length ? Math.round(completedDays / dayIds.length * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Cards de días */}
      {dayIds.map(day => {
        const session = sessions.find(s => s.weekNumber === weekNumber && s.dayId === day)
        const dayDef = routineDays[day] as { label?: string; subtitle?: string; exercises?: ExerciseDef[] } | undefined
        const exercises: ExerciseDef[] = dayDef?.exercises ?? []
        const total = session ? session.exercises.length : exercises.length
        const done = session ? session.exercises.filter(e => e.done).length : 0
        const pct = total ? Math.round(done / total * 100) : 0
        const isToday = day === todayId
        const isComplete = !!session?.complete
        const isPartial = !isComplete && done > 0
        const hasCardio = !!session?.cardio?.duration
        const estMin = exercises.length > 0 ? estimateMinutes(exercises) : null
        const MAX_VISIBLE = 4
        const visibleEx = exercises.slice(0, MAX_VISIBLE)
        const hiddenCount = exercises.length - MAX_VISIBLE

        return (
          <article
            key={day}
            className={`agenda-card${isToday ? ' agenda-today' : ''}${isComplete ? ' agenda-done' : isPartial ? ' agenda-partial' : ''}`}
          >
            {/* Header */}
            <div className="agenda-card-header">
              <div className="agenda-card-title">
                {isToday && <span className="agenda-today-dot" />}
                <div>
                  <h4>{capitalize(day)} · {dayDef?.label ?? day}</h4>
                  <div className="agenda-card-meta-row">
                    {estMin && <span className="agenda-meta-tag">~{estMin} min</span>}
                    {hasCardio && <span className="agenda-meta-tag">🏃 {session!.cardio!.duration}</span>}
                  </div>
                </div>
              </div>
              <span className={`agenda-status-chip${isComplete ? ' done' : isPartial ? ' partial' : ''}`}>
                {isComplete ? '✓ Lista' : `${done}/${total}`}
              </span>
            </div>

            {/* Progreso */}
            <div className="progress agenda-progress">
              <span style={{ width: `${pct}%` }} />
            </div>

            {/* Lista de ejercicios */}
            {exercises.length > 0 && (
              <ul className="agenda-ex-list">
                {visibleEx.map((ex, i) => (
                  <li key={i} className={`agenda-ex-item${session?.exercises[i]?.done ? ' done' : ''}`}>
                    <span className="agenda-ex-dot" />
                    <span className="agenda-ex-name">{ex.name}</span>
                    <span className="agenda-ex-detail">{ex.sets}×{ex.reps}</span>
                  </li>
                ))}
                {hiddenCount > 0 && (
                  <li className="agenda-ex-more">+{hiddenCount} más</li>
                )}
              </ul>
            )}

            {/* Botón */}
            <button
              className={`agenda-open-btn${isComplete ? ' is-complete' : ''}`}
              onClick={() => navigate(`/entrenamiento/${day}`)}
            >
              {isComplete ? 'Ver sesión' : isToday ? 'Entrenar ahora →' : 'Abrir día'}
            </button>
          </article>
        )
      })}
    </div>
  )
}
