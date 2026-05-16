import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useUser } from '../../hooks/useUser'
import { useRoutines } from '../../hooks/useRoutines'
import { usersApi } from '../../api/users'
import { sessionsApi } from '../../api/sessions'
import { getRoutineDays, getDayIds, calcStreak, getTodayDayId } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import MigrationModal from '../modals/MigrationModal'
import { IconFire, IconRocket, IconMoon, IconTarget, IconCheck } from '../ui/Icons'
import type { WorkoutSession } from '../../types/domain'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Dashboard() {
  useUser()
  const navigate = useNavigate()
  const { user, setAuth, accessToken } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null

  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const routineName = activeRoutineId
    ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom')
    : 'Sin rutina'

  // Sessions de la semana actual (para KPIs y cards del día)
  const { sessions, loading } = useSessions(weekNumber)
  // Todas las sesiones para heatmap y racha (cargado en segundo plano)
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    sessionsApi.listAll().then(setAllSessions).catch((err: unknown) => console.warn('[Dashboard]', err))
  }, [])

  // Hybrid logic: detect if week should advance
  const [showAdvanceBanner, setShowAdvanceBanner] = useState(false)
  const [expectedWeek, setExpectedWeek] = useState(weekNumber)

  useEffect(() => {
    if (user?.routineStartDate) {
      const start = new Date(user.routineStartDate)
      const now = new Date()
      // Calcular diferencia en días (redondeando hacia abajo)
      const diffTime = now.getTime() - start.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const calcWeek = Math.floor(diffDays / 7) + 1
      
      if (calcWeek > weekNumber) {
        setExpectedWeek(calcWeek)
        setShowAdvanceBanner(true)
      } else {
        setShowAdvanceBanner(false)
      }
    }
  }, [user?.routineStartDate, weekNumber])

  async function handleAdvanceWeek() {
    try {
      const updated = await usersApi.update({ currentWeek: expectedWeek })
      setAuth(updated, accessToken ?? '')
      setShowAdvanceBanner(false)
    } catch (err) {
      console.error('Error advancing week:', err)
    }
  }

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
  const streak = useMemo(() => calcStreak(allSessions, dayIds, weekNumber), [allSessions, dayIds, weekNumber])
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
        const s = allSessions.find(s => s.weekNumber === w && s.dayId === d)
        if (!s) return 'empty'
        if (s.complete) return 'done'
        const hasDone = s.exercises.some(e => e.done)
        return hasDone ? 'partial' : 'empty'
      })
      weeks.push({ w, cells })
    }
    return weeks
  }, [allSessions, dayIds, weekNumber])

  if (loading && sessions.length === 0) {
    return (
      <div className="content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-xl)' }} />
        <div className="kpis">
          <div className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
          <div className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
          <div className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
          <div className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
        </div>
        <div className="skeleton" style={{ height: '250px', borderRadius: 'var(--radius-xl)' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {showMigration && <MigrationModal onDone={() => setShowMigration(false)} />}

      {/* Banner de avance de semana (Híbrido) */}
      {showAdvanceBanner && (
        <div className="card advance-banner" style={{ border: '1px solid var(--color-primary)', background: 'rgba(var(--color-primary-rgb), 0.05)' }}>
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <div>
              <h4 style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <IconRocket className="accent-primary" /> ¡Nueva semana detectada!
              </h4>
              <p className="tiny muted">Han pasado 7 días. ¿Quieres avanzar a la <strong>Semana {expectedWeek}</strong> para nuevos registros?</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="ghost-btn" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setShowAdvanceBanner(false)}>Ahora no</button>
              <button className="primary-btn" style={{ padding: '.4rem .8rem', fontSize: 'var(--text-xs)' }} onClick={handleAdvanceWeek}>
                Avanzar a S{expectedWeek}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget de hoy */}
      {todayId ? (
        <div className="today-widget">
          <div>
            <div className="today-widget-chip">Entrenamiento de hoy</div>
            <div className="today-widget-name">
              {capitalize(todayId)} · {(routineDays[todayId] as { label?: string })?.label ?? todayId}
            </div>
            <div className="today-widget-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {sessions.find(s => s.dayId === todayId)?.exercises.filter(e => e.done).length ?? 0}/{routineDays[todayId]?.exercises.length ?? 0} ejercicios · {sessions.find(s => s.dayId === todayId)?.complete ? <><IconCheck size={14} /> completado</> : 'pendiente'}
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
          <span className="rest-day-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconMoon size={16} /> Rest day
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="kpis">
        <article className="card kpi">
          <div className="kpi-label">Sesiones semana</div>
          <div className="kpi-value">{completedSessions}/{dayIds.length}</div>
          <div className="kpi-meta">Objetivo semanal</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Ejercicios <IconCheck size={12} /></div>
          <div className="kpi-value">{doneExercises}</div>
          <div className="kpi-meta">De {totalExercises} totales</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Progreso</div>
          <div className="kpi-value">{progress}%</div>
          <div className="kpi-meta">Avance global semana</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Racha activa</div>
          <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {streak > 0 && <IconFire className="accent-fire" />} {streak}
          </div>
          <div className="kpi-meta">
            {streak >= 2 ? 'semanas consecutivas' : streak === 1 ? 'semana completada' : 'sin racha aún'}
          </div>
        </article>
      </div>

      {/* Heatmap de actividad */}
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

      {/* Semana actual — días de la rutina */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Semana {weekNumber}</h3><p>{routineName}</p></div>
        </div>
        <div className="panel-body day-grid">
          {dayIds.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><IconTarget size={48} /></span>
              <p>No tienes rutina activa.<br />Configura una en <strong>Mis Rutinas</strong>.</p>
              <button className="primary-btn" onClick={() => navigate('/rutinas')}>Ir a Rutinas</button>
            </div>
          ) : dayIds.map(day => {
            const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === day)
            const total = s ? s.exercises.length : (routineDays[day]?.exercises.length ?? 0)
            const done = s ? s.exercises.filter(e => e.done).length : 0
            const pct = total ? Math.round(done / total * 100) : 0
            const isToday = day === todayId
            return (
              <article key={day} className={`day-card ${isToday ? 'day-card-today' : ''}`}>
                <header>
                  <div>
                    <h4>
                      {isToday && <span className="day-today-dot" />}
                      {capitalize(day)} · {(routineDays[day] as { label?: string })?.label ?? day}
                    </h4>
                    <div className="tiny muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{done}/{total} ejercicios · {s?.complete ? <><IconCheck size={12} /> cerrada</> : 'abierta'}</div>
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
  )
}
