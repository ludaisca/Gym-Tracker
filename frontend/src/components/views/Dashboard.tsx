import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useUser } from '../../hooks/useUser'
import { getRoutineDays, getDayIds, calcStreak, getTodayDayId } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import MigrationModal from '../modals/MigrationModal'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Dashboard() {
  useUser()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null

  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, []), [activeRoutineId])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, []), [activeRoutineId])
  const routineName = activeRoutineId
    ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom')
    : 'Sin rutina'

  const { sessions, loading } = useSessions(weekNumber)

  const completedSessions = useMemo(
    () => dayIds.filter(d => sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)?.complete).length,
    [sessions, dayIds, weekNumber]
  )

  const totalExercises = useMemo(
    () => dayIds.reduce((a, d) => {
      const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)
      return a + (s ? s.exercises.length : (routineDays[d]?.exercises.length ?? 0))
    }, 0),
    [sessions, dayIds, weekNumber, routineDays]
  )

  const doneExercises = useMemo(
    () => dayIds.reduce((a, d) => {
      const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)
      return a + (s ? s.exercises.filter(e => e.done).length : 0)
    }, 0),
    [sessions, dayIds, weekNumber]
  )

  const progress = totalExercises ? Math.round(doneExercises / totalExercises * 100) : 0
  const streak = useMemo(() => calcStreak(sessions, dayIds, weekNumber), [sessions, dayIds, weekNumber])
  const todayId = useMemo(() => getTodayDayId(dayIds), [dayIds])

  const [showMigration, setShowMigration] = useState(false)
  useEffect(() => {
    const hasData = !!localStorage.getItem('gymtracker_v3')
    const alreadyMigrated = !!localStorage.getItem('gym_migrated')
    if (hasData && !alreadyMigrated) setShowMigration(true)
  }, [])

  const heatmapWeeks = useMemo(() => {
    const weeks = []
    const start = Math.max(1, weekNumber - 11)
    for (let w = start; w <= weekNumber; w++) {
      const cells = dayIds.map(d => {
        const s = sessions.find(s => s.weekNumber === w && s.dayId === d)
        if (!s) return 'empty'
        if (s.complete) return 'done'
        const hasDone = s.exercises.some(e => e.done)
        return hasDone ? 'partial' : 'empty'
      })
      weeks.push({ w, cells })
    }
    return weeks
  }, [sessions, dayIds, weekNumber])

  if (loading && sessions.length === 0) {
    return <div className="content"><div className="spinner" /></div>
  }

  return (
    <>
      {showMigration && <MigrationModal onDone={() => setShowMigration(false)} />}
      {todayId ? (
        <div className="today-widget">
          <div>
            <div className="today-widget-chip">Entrenamiento de hoy</div>
            <div className="today-widget-name">
              {capitalize(todayId)} · {(routineDays[todayId] as { label?: string })?.label ?? todayId}
            </div>
            <div className="today-widget-sub">
              {sessions.find(s => s.dayId === todayId)?.exercises.filter(e => e.done).length ?? 0}/{routineDays[todayId]?.exercises.length ?? 0} ejercicios · {sessions.find(s => s.dayId === todayId)?.complete ? '✓ completado' : 'pendiente'}
            </div>
          </div>
          <button className="primary-btn" onClick={() => navigate(`/entrenamiento/${todayId}`)}>
            Ir ahora →
          </button>
        </div>
      ) : (
        <div className="today-widget">
          <div>
            <div className="today-widget-chip">Hoy</div>
            <div className="today-widget-name">Día de descanso</div>
            <div className="today-widget-sub">Recupera bien para el próximo entreno</div>
          </div>
          <span className="rest-day-tag">😴 Rest day</span>
        </div>
      )}

      <div className="kpis">
        <article className="card kpi">
          <div className="kpi-label">Sesiones completadas</div>
          <div className="kpi-value">{completedSessions}/{dayIds.length}</div>
          <div className="kpi-meta">Objetivo semanal</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Ejercicios marcados</div>
          <div className="kpi-value">{doneExercises}</div>
          <div className="kpi-meta">De {totalExercises} totales</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Progreso semanal</div>
          <div className="kpi-value">{progress}%</div>
          <div className="kpi-meta">Avance global</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Racha activa</div>
          <div className="kpi-value">{streak > 0 ? '🔥 ' : ''}{streak}</div>
          <div className="kpi-meta">
            {streak >= 2 ? 'semanas consecutivas' : streak === 1 ? 'semana completada' : 'sin racha aún'}
          </div>
        </article>
      </div>

      {heatmapWeeks.length > 1 && (
        <section className="card heatmap-card">
          <div className="panel-head">
            <div><h3>Historial de actividad</h3><p>Últimas {heatmapWeeks.length} semanas</p></div>
            <div className="heatmap-legend">
              <span className="heatmap-cell done" />
              <span className="tiny muted">Completa</span>
              <span className="heatmap-cell partial" />
              <span className="tiny muted">Parcial</span>
              <span className="heatmap-cell empty" />
              <span className="tiny muted">Sin datos</span>
            </div>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <div className="heatmap">
              <div className="heatmap-days">
                {dayIds.map(d => (
                  <div key={d} className="heatmap-day-label">{capitalize(d).slice(0, 3)}</div>
                ))}
              </div>
              <div className="heatmap-grid">
                {heatmapWeeks.map(({ w, cells }) => (
                  <div key={w} className="heatmap-col">
                    <div className="heatmap-week-label">S{w}</div>
                    {cells.map((state, i) => (
                      <div key={i} className={`heatmap-cell ${state}`} title={`Semana ${w} · ${dayIds[i]}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="layout">
        <section className="card">
          <div className="panel-head">
            <div><h3>Módulos de la app</h3><p>Navegación estilo panel.</p></div>
          </div>
          <div className="panel-body day-grid">
            {[
              ['Insights IA', 'Análisis de progreso y recomendaciones.', '/insights'],
              ['Agenda semanal', 'Vista operativa para revisar la semana completa.', '/agenda'],
              ['Estadísticas', 'Resumen consolidado de avance y adherencia.', '/stats'],
              ['Mis Rutinas', 'Gestionar y personalizar rutinas de entrenamiento.', '/rutinas'],
            ].map(([title, desc, path]) => (
              <article key={path} className="day-card">
                <header>
                  <div>
                    <h4>{title}</h4>
                    <div className="tiny muted">{desc}</div>
                  </div>
                  <button className="primary-btn" style={{ padding: '.55rem .9rem' }} onClick={() => navigate(path)}>
                    Abrir
                  </button>
                </header>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div><h3>Semana {weekNumber}</h3><p>{routineName}</p></div>
          </div>
          <div className="panel-body day-grid">
            {dayIds.map(day => {
              const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === day)
              const total = s ? s.exercises.length : (routineDays[day]?.exercises.length ?? 0)
              const done = s ? s.exercises.filter(e => e.done).length : 0
              const pct = total ? Math.round(done / total * 100) : 0
              return (
                <article key={day} className="day-card">
                  <header>
                    <div>
                      <h4>{capitalize(day)} · {(routineDays[day] as { label?: string })?.label ?? day}</h4>
                      <div className="tiny muted">{done}/{total} ejercicios · {s?.complete ? 'cerrada' : 'abierta'}</div>
                    </div>
                    <button className="ghost-btn" style={{ padding: '.45rem .8rem' }} onClick={() => navigate(`/entrenamiento/${day}`)}>
                      Entrar
                    </button>
                  </header>
                  <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
