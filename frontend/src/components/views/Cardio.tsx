import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { getDayIds } from '../../lib/fitness'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Cardio() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const dayIds = useMemo(() => getDayIds(activeRoutineId, []), [activeRoutineId])

  const { sessions } = useSessions(weekNumber)

  return (
    <section className="card">
      <div className="panel-head">
        <div><h3>Cardio tracker</h3><p>Resumen centralizado del cardio de la semana.</p></div>
      </div>
      <div className="panel-body day-grid">
        {dayIds.map(day => {
          const session = sessions.find(s => s.weekNumber === weekNumber && s.dayId === day)
          const cardio = session?.cardio
          return (
            <article key={day} className="day-card">
              <header>
                <div>
                  <h4>{capitalize(day)}</h4>
                  <div className="tiny muted">{cardio?.machine ?? '—'}</div>
                </div>
                <span className="pill">{cardio?.duration || '--'}</span>
              </header>
              <p className="tiny muted">{cardio?.intensity || 'Sin intensidad capturada'}</p>
              <button
                className="ghost-btn"
                style={{ marginTop: '1rem' }}
                onClick={() => navigate(`/entrenamiento/${day}`)}
              >
                Editar
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
