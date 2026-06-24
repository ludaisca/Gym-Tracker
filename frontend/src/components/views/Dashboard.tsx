import { useMemo, useState, useEffect, useCallback } from 'react'
import { SkeletonDashboard } from '../ui/Skeleton'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { usersApi } from '../../api/users'
import { sessionsApi } from '../../api/sessions'
import { nutritionApi } from '../../api/nutrition'
import { getRoutineDays, getDayIds, calcStreak, getTodayDayId } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import MigrationModal from '../modals/MigrationModal'
import { IconFire, IconRocket, IconMoon, IconTarget } from '../ui/Icons'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import DashboardEditor from './DashboardEditor'
import type { WorkoutSession, DashboardWidgetConfig, NutritionDay, FoodEntry } from '../../types/domain'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const DEFAULT_LAYOUT: DashboardWidgetConfig[] = [
  { id: 'w-today',     type: 'today',     visible: true,  width: 'full', order: 0 },
  { id: 'w-kpis',      type: 'kpis',      visible: true,  width: 'full', order: 1 },
  { id: 'w-heatmap',   type: 'heatmap',   visible: true,  width: 'full', order: 2 },
  { id: 'w-week',      type: 'week',      visible: true,  width: 'full', order: 3 },
  { id: 'w-volume',    type: 'volume',    visible: false, width: 'half', order: 4 },
  { id: 'w-nutrition', type: 'nutrition', visible: false, width: 'half', order: 5 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, setAuth, accessToken } = useAuthStore()
  const { dashboardEditorOpen, closeDashboardEditor } = useUIStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null

  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const routineName = activeRoutineId
    ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom')
    : 'Sin rutina'

  const { sessions, loading } = useSessions(weekNumber)
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  const [todayNutrition, setTodayNutrition] = useState<NutritionDay | null>(null)

  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const loadAll = useCallback(() => {
    sessionsApi.listAll().then(setAllSessions).catch(() => {})
    nutritionApi.getDay(todayDate).then(setTodayNutrition).catch(() => setTodayNutrition(null))
  }, [todayDate])
  useEffect(() => { loadAll() }, [loadAll])

  const { refreshing } = usePullToRefresh(loadAll)

  const [showAdvanceBanner, setShowAdvanceBanner] = useState(false)
  const [expectedWeek, setExpectedWeek] = useState(weekNumber)
  const [showEditor, setShowEditor] = useState(false)

  // Abrir editor cuando el topbar lo solicita via UIStore
  useEffect(() => {
    if (dashboardEditorOpen) {
      setShowEditor(true)
      closeDashboardEditor()
    }
  }, [dashboardEditorOpen, closeDashboardEditor])

  useEffect(() => {
    if (user?.routineStartDate) {
      const start = new Date(user.routineStartDate)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
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

  const { completedSessions, totalExercises, doneExercises } = useMemo(() => {
    const byDay = new Map(sessions.map(s => [s.dayId, s]))
    let completedSessions = 0, totalExercises = 0, doneExercises = 0
    for (const d of dayIds) {
      const s = byDay.get(d)
      if (s?.complete) completedSessions++
      totalExercises += s ? s.exercises.length : (routineDays[d]?.exercises.length ?? 0)
      doneExercises  += s ? s.exercises.filter(e => e.done).length : 0
    }
    return { completedSessions, totalExercises, doneExercises }
  }, [sessions, dayIds, routineDays])

  const weeklyVolume = useMemo(() => {
    return sessions
      .filter(s => s.weekNumber === weekNumber)
      .reduce((total, s) => total + s.exercises.reduce((a, ex) =>
        a + ex.sets.reduce((b, set) => {
          const kg = parseFloat(set.kg); const reps = parseFloat(set.reps)
          return b + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
        }, 0)
      , 0), 0)
  }, [sessions, weekNumber])

  const progress = totalExercises ? Math.round(doneExercises / totalExercises * 100) : 0
  const streak = useMemo(() => calcStreak(allSessions, dayIds, weekNumber), [allSessions, dayIds, weekNumber])
  const todayId = useMemo(() => getTodayDayId(dayIds), [dayIds])

  const prevWeekVolume = useMemo(() => {
    return allSessions
      .filter(s => s.weekNumber === weekNumber - 1)
      .reduce((total, s) => total + s.exercises.reduce((a, ex) =>
        a + ex.sets.reduce((b, set) => {
          const kg = parseFloat(set.kg); const reps = parseFloat(set.reps)
          return b + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
        }, 0)
      , 0), 0)
  }, [allSessions, weekNumber])

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

  const heatmapStats = useMemo(() => {
    let done = 0, partial = 0, total = 0
    for (const { cells } of heatmapWeeks) {
      total += cells.length
      for (const c of cells) {
        if (c === 'done') done++
        else if (c === 'partial') partial++
      }
    }
    return { done, partial, pct: total ? Math.round((done + partial) / total * 100) : 0 }
  }, [heatmapWeeks])

  const layout = useMemo(() => {
    const saved = user?.settings?.dashboardLayout
    if (!saved) return DEFAULT_LAYOUT
    // Añadir widgets nuevos que no estaban en el layout guardado
    const savedTypes = new Set(saved.map(w => w.type))
    const missing = DEFAULT_LAYOUT.filter(w => !savedTypes.has(w.type))
    if (missing.length === 0) return saved
    const maxOrder = Math.max(...saved.map(w => w.order))
    return [...saved, ...missing.map((w, i) => ({ ...w, order: maxOrder + i + 1 }))]
  }, [user?.settings?.dashboardLayout])

  function renderWidget(w: DashboardWidgetConfig) {
    switch (w.type) {
      case 'today':
        return todayId ? (
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
            <span className="rest-day-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <IconMoon size={16} /> Rest day
            </span>
          </div>
        )

      case 'kpis':
        return (
          <div className="kpis">
            <article className="card kpi">
              <div className="kpi-label">Sesiones semana</div>
              <div className="kpi-value">{completedSessions}/{dayIds.length}</div>
              <div className="kpi-meta">Objetivo semanal</div>
            </article>
            <article className="card kpi">
              <div className="kpi-label">Ejercicios ✓</div>
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
        )

      case 'heatmap':
        if (heatmapWeeks.length <= 1) return null
        return (
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
            <div className="panel-body" style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
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
            <div className="heatmap-summary">
              <span><strong>{heatmapStats.done}</strong> completas</span>
              <span className="heatmap-summary-dot" />
              <span><strong>{heatmapStats.partial}</strong> parciales</span>
              <span className="heatmap-summary-dot" />
              <span><strong>{heatmapStats.pct}%</strong> de actividad</span>
            </div>
          </section>
        )

      case 'week':
        return (
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
                        <div className="tiny muted">{done}/{total} ejercicios · {s?.complete ? '✓ cerrada' : 'abierta'}</div>
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
        )

      case 'volume': {
        const vol = Math.round(weeklyVolume)
        const prev = Math.round(prevWeekVolume)
        const display = vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : `${vol}`
        const diff = vol - prev
        const diffDisplay = Math.abs(diff) >= 1000
          ? `${(Math.abs(diff) / 1000).toFixed(1)}k`
          : `${Math.abs(diff)}`
        return (
          <article className="card kpi widget-volume-card">
            <div className="kpi-label">Volumen semanal</div>
            <div className="kpi-value">{display}</div>
            <div className="kpi-meta">kg × reps esta semana</div>
            {prev > 0 && (
              <div className={`volume-compare ${diff >= 0 ? 'up' : 'down'}`}>
                {diff >= 0 ? '↑' : '↓'} {diffDisplay} vs semana anterior
              </div>
            )}
          </article>
        )
      }

      case 'nutrition': {
        const goals = user?.settings
        const allFoods: FoodEntry[] = Object.values(todayNutrition?.meals ?? {}).flat() as FoodEntry[]
        const kcal    = Math.round(allFoods.reduce((a, f) => a + f.kcal, 0))
        const protein = Math.round(allFoods.reduce((a, f) => a + f.protein, 0))
        const carbs   = Math.round(allFoods.reduce((a, f) => a + f.carbs, 0))
        const fat     = Math.round(allFoods.reduce((a, f) => a + f.fat, 0))
        const water   = todayNutrition?.water ?? 0
        const kcalGoal    = goals?.calorieGoal ?? 2500
        const proteinGoal = goals?.proteinGoal ?? 150
        const waterGoal   = goals?.waterGoal ?? 8
        const kcalPct = Math.min(100, Math.round(kcal / kcalGoal * 100))
        return (
          <article className="card nutrition-widget">
            <div className="nutrition-widget-head">
              <span className="kpi-label">Nutrición hoy</span>
              <button className="ghost-btn" style={{ fontSize: 'var(--text-xs)', padding: '.25rem .6rem' }} onClick={() => navigate('/nutricion')}>Ver →</button>
            </div>
            <div className="nutrition-kcal">
              <span className="nutrition-kcal-val">{kcal}</span>
              <span className="nutrition-kcal-goal">/ {kcalGoal} kcal</span>
            </div>
            <div className="progress" style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ width: `${kcalPct}%`, background: kcalPct > 100 ? 'var(--color-error)' : undefined }} />
            </div>
            <div className="nutrition-macros">
              <div className="nutrition-macro">
                <span className="nutrition-macro-val">{protein}g</span>
                <span className="nutrition-macro-label">Proteína</span>
                <span className="nutrition-macro-goal">/ {proteinGoal}g</span>
              </div>
              <div className="nutrition-macro">
                <span className="nutrition-macro-val">{carbs}g</span>
                <span className="nutrition-macro-label">Carbos</span>
              </div>
              <div className="nutrition-macro">
                <span className="nutrition-macro-val">{fat}g</span>
                <span className="nutrition-macro-label">Grasas</span>
              </div>
              <div className="nutrition-macro">
                <span className="nutrition-macro-val">{water}</span>
                <span className="nutrition-macro-label">Agua</span>
                <span className="nutrition-macro-goal">/ {waterGoal}</span>
              </div>
            </div>
          </article>
        )
      }

      default:
        return null
    }
  }

  if (loading && sessions.length === 0) {
    return <SkeletonDashboard />
  }

  const visibleWidgets = layout
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="fade-in">
      {refreshing && (
        <div className="ptr-indicator" aria-label="Actualizando" aria-live="polite">
          <div className="spinner" />
        </div>
      )}
      {showMigration && <MigrationModal onDone={() => setShowMigration(false)} />}

      {/* Banner de avance de semana */}
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

      {/* Grid de widgets configurable */}
      <div className="dashboard-grid">
        {visibleWidgets.map(w => {
          const content = renderWidget(w)
          if (content === null) return null
          return (
            <div key={w.id} className={`dashboard-widget widget-${w.width}`}>
              {content}
            </div>
          )
        })}
      </div>

      {/* Editor de layout */}
      <DashboardEditor
        open={showEditor}
        layout={layout}
        onClose={() => setShowEditor(false)}
        onSave={newLayout => {
          if (user) {
            const updated = { ...user, settings: { ...user.settings!, dashboardLayout: newLayout } }
            setAuth(updated, accessToken ?? '')
          }
          setShowEditor(false)
        }}
      />
    </div>
  )
}
