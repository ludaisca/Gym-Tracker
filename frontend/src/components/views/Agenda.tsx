import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { getRoutineDays, getDayIds } from '../../lib/fitness'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Agenda() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])

  const { sessions } = useSessions(weekNumber)

  return (
    <section className="card">
      <div className="panel-head">
        <div><h3>Agenda semanal</h3><p>Vista centralizada para planear la semana.</p></div>
      </div>
      <div className="panel-body triple">
        {dayIds.map(day => {
          const session = sessions.find(s => s.weekNumber === weekNumber && s.dayId === day)
          const dayDef = routineDays[day] as { label?: string; subtitle?: string; exercises?: unknown[] } | undefined
          const total = session ? session.exercises.length : (dayDef?.exercises?.length ?? 0)
          const done = session ? session.exercises.filter(e => e.done).length : 0
          return (
            <article key={day} className={`summary-card${session?.complete ? ' status-done' : done > 0 ? ' status-partial' : ''}`}>
              <div className="summary-row">
                <h4>{capitalize(day)} · {dayDef?.label ?? day}</h4>
                <span className="pill">{done}/{total}</span>
              </div>
              <p className="tiny muted">{dayDef?.subtitle ?? ''}</p>
              <p className="tiny muted" style={{ marginTop: '.3rem' }}>
                Cardio: {session?.cardio?.duration || '—'}
              </p>
              <p className="tiny muted" style={{ marginTop: '.3rem' }}>
                Estado: {session?.complete ? '✓ Completada' : done > 0 ? `${done}/${total} ejercicios` : 'Pendiente'}
              </p>
              <button
                className={`complete-btn${session?.complete ? ' is-complete' : ''}`}
                onClick={() => navigate(`/entrenamiento/${day}`)}
                style={{ marginTop: '1rem' }}
              >
                Abrir día
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
