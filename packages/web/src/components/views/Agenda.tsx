import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { getRoutineDays, getDayIds } from '../../lib/fitness'
import { CheckCircle2, CalendarDays } from 'lucide-react'
import EmptyState from '../ui/EmptyState'

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

  if (dayIds.length === 0) {
    return (
      <div className="fade-in">
        <EmptyState
          icon={<CalendarDays size={36} />}
          title="Sin rutina activa"
          body="Elige una rutina para ver tu plan semanal aquí."
          action={{ label: 'Ver rutinas', href: '/rutinas' }}
        />
      </div>
    )
  }

  return (
    <div className="fade-in">
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
          const pct = total > 0 ? Math.round(done / total * 100) : 0
          return (
            <article key={day} className={`summary-card${session?.complete ? ' status-done' : done > 0 ? ' status-partial' : ''}`}>
              <div className="summary-row">
                <h4>{capitalize(day)} · {dayDef?.label ?? day}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', alignItems: 'flex-end' }}>
                  <span className="tiny muted">{done}/{total}</span>
                  <div className="progress" style={{ width: 60 }}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <p className="tiny muted">{dayDef?.subtitle ?? ''}</p>
              {session?.cardio?.duration && (
                <p className="tiny muted" style={{ marginTop: '.3rem' }}>
                  Cardio: {session.cardio.duration}
                </p>
              )}
              <p className="tiny muted" style={{ marginTop: '.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {session?.complete
                  ? <><CheckCircle2 size={12} /> Completada</>
                  : done > 0 ? `${done}/${total} ejercicios` : 'Pendiente'}
              </p>
              <button
                className="ghost-btn"
                onClick={() => navigate(`/entrenamiento/${day}`)}
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Abrir día
              </button>
            </article>
          )
        })}
      </div>
    </section>
    </div>
  )
}
