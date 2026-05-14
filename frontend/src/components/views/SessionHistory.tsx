import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { sessionsApi } from '../../api/sessions'
import { useRoutines } from '../../hooks/useRoutines'
import { getRoutineDays } from '../../lib/fitness'
import type { WorkoutSession } from '../../types/domain'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function SessionHistory() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const routineDays = useMemo(
    () => getRoutineDays(activeRoutineId, customRoutines),
    [activeRoutineId, customRoutines]
  )

  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    sessionsApi.listAll()
      .then(data => {
        setSessions(data)
        // Expandir la semana más reciente por defecto
        if (data.length) {
          const maxWeek = Math.max(...data.map(s => s.weekNumber))
          setExpandedWeek(maxWeek)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const byWeek = useMemo(() => {
    const map = new Map<number, WorkoutSession[]>()
    for (const s of sessions) {
      const list = map.get(s.weekNumber) ?? []
      list.push(s)
      map.set(s.weekNumber, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([week, ss]) => ({
        week,
        sessions: ss.sort((a, b) => a.dayId.localeCompare(b.dayId)),
        completed: ss.filter(s => s.complete).length,
        total: ss.length,
      }))
  }, [sessions])

  if (loading) return <div className="content"><div className="spinner" /></div>

  if (byWeek.length === 0) {
    return (
      <div className="fade-in">
        <div className="panel-head" style={{ padding: '0 0 var(--space-6)' }}>
          <div><h3>Historial de sesiones</h3><p>Todas tus semanas de entrenamiento.</p></div>
        </div>
        <div className="empty-state">
          <p>No hay sesiones registradas aún.</p>
          <button className="primary-btn" onClick={() => navigate('/dashboard')}>Ir al dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="panel-head" style={{ padding: '0 0 var(--space-6)' }}>
        <div>
          <h3>Historial de sesiones</h3>
          <p>{sessions.length} sesiones en {byWeek.length} semanas</p>
        </div>
        <button className="ghost-btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {byWeek.map(({ week, sessions: weekSessions, completed, total }) => {
          const isOpen = expandedWeek === week
          const isCurrent = week === (user?.currentWeek ?? 1)
          return (
            <section key={week} className="card" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedWeek(isOpen ? null : week)}
                style={{
                  width: '100%', padding: 'var(--space-5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer', gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      Semana {week}
                      {isCurrent && (
                        <span className="active-badge" style={{ fontSize: '10px' }}>Actual</span>
                      )}
                    </div>
                    <div className="tiny muted">{completed}/{total} sesiones completadas</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div className="progress" style={{ width: 80 }}>
                    <span style={{ width: `${total ? Math.round(completed / total * 100) : 0}%` }} />
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-text-muted)" strokeWidth="2"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '0 var(--space-5) var(--space-5)', display: 'grid', gap: 'var(--space-3)' }}>
                  {weekSessions.map(session => {
                    const sessionKey = `${session.weekNumber}-${session.dayId}`
                    const isSessionOpen = expandedSession === sessionKey
                    const dayDef = routineDays[session.dayId]
                    const doneCount = session.exercises.filter(e => e.done).length
                    const totalEx = session.exercises.length

                    return (
                      <div
                        key={sessionKey}
                        className={`summary-card${session.complete ? ' status-done' : doneCount > 0 ? ' status-partial' : ''}`}
                        style={{ cursor: 'default' }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                          onClick={() => setExpandedSession(isSessionOpen ? null : sessionKey)}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {capitalize(session.dayId)}
                              {(dayDef as { label?: string })?.label && ` · ${(dayDef as { label?: string }).label}`}
                            </div>
                            <div className="tiny muted">
                              {doneCount}/{totalEx} ejercicios
                              {session.complete && ' · ✓ Completada'}
                              {session.notes && ' · 📝'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <button
                              className="ghost-btn"
                              style={{ padding: '.3rem .6rem', fontSize: 'var(--text-xs)' }}
                              onClick={e => { e.stopPropagation(); navigate(`/entrenamiento/${session.dayId}`) }}
                            >
                              Abrir
                            </button>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="var(--color-text-muted)" strokeWidth="2"
                              style={{ transform: isSessionOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>

                        {isSessionOpen && (
                          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-divider)' }}>
                            {session.exercises.map((ex, idx) => {
                              const exDef = (dayDef?.exercises ?? [])[idx]
                              const name = exDef?.name ?? `Ejercicio ${idx + 1}`
                              const bestSet = ex.sets.reduce((best, s) => {
                                const kg = parseFloat(s.kg)
                                return (!isNaN(kg) && kg > parseFloat(best.kg || '0')) ? s : best
                              }, ex.sets[0] ?? { kg: '', reps: '' })
                              return (
                                <div key={idx} style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: 'var(--space-2) 0',
                                  borderBottom: '1px solid var(--color-divider)',
                                  opacity: ex.done ? 1 : 0.45,
                                }}>
                                  <div>
                                    <span style={{ fontWeight: ex.done ? 600 : 400, fontSize: 'var(--text-sm)' }}>
                                      {ex.done ? '✓ ' : '○ '}{name}
                                    </span>
                                  </div>
                                  <div className="tiny muted">
                                    {bestSet?.kg ? `${bestSet.kg}kg × ${bestSet.reps}` : '—'}
                                  </div>
                                </div>
                              )
                            })}
                            {session.cardio?.duration && (
                              <div className="tiny muted" style={{ marginTop: 'var(--space-2)' }}>
                                Cardio: {session.cardio.machine || 'N/A'} · {session.cardio.duration}
                                {session.cardio.intensity ? ` · ${session.cardio.intensity}` : ''}
                              </div>
                            )}
                            {session.notes && (
                              <div className="tiny muted" style={{ marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
                                📝 {session.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
