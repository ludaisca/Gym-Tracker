import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useUser } from '../../hooks/useUser'
import { useRoutines } from '../../hooks/useRoutines'
import { usersApi } from '../../api/users'
import { sessionsApi } from '../../api/sessions'
import { aiApi } from '../../api/ai'
import { getRoutineDays, getDayIds, calcStreak, getTodayDayId, calcWeekVolume } from '../../lib/fitness'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import MigrationModal from '../modals/MigrationModal'
import { IconRocket, IconTarget, IconCheck, IconMoon, IconFire } from '../ui/Icons'
import EmptyState from '../ui/EmptyState'
import type { WorkoutSession } from '../../types/domain'

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

const DAY_NAMES_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTH_NAMES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function addRipple(el: HTMLElement, e: MouseEvent | TouchEvent) {
  const r = document.createElement('span')
  r.className = 'ripple-el'
  const rect = el.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  r.style.left = (clientX - rect.left) + 'px'
  r.style.top  = (clientY - rect.top)  + 'px'
  el.appendChild(r)
  r.addEventListener('animationend', () => r.remove())
}

function BarChart({ dayIds, dayVolumes }: { dayIds: string[], dayVolumes: number[] }) {
  const max = Math.max(...dayVolumes, 1)
  return (
    <div className="bar-chart-wrap">
      {dayIds.map((dayId, i) => {
        const vol = dayVolumes[i]
        const h = vol > 0 ? Math.max(12, Math.round(vol / max * 74)) : 4
        const cls = vol > 0 ? 'bar-col bar-filled animate-bar' : 'bar-col bar-empty animate-bar'
        return (
          <div key={dayId} className="bar-group" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="bar-wrap">
              <div className={cls} style={{ height: h, animationDelay: `${i * 60}ms` }} />
            </div>
            <span className="bar-day">{capitalize(dayId).slice(0, 2)}</span>
          </div>
        )
      })}
    </div>
  )
}

function WeeklyBriefCard({ weekNumber, sessions, dayIds, hasAI, completedSessions }: {
  weekNumber: number
  sessions: WorkoutSession[]
  dayIds: string[]
  hasAI: boolean
  completedSessions: number
}) {
  const [brief, setBrief] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const cacheKey = `weekly-brief-${weekNumber}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { setBrief(cached); return }
    setLoading(true)
    try {
      const text = await aiApi.getWeeklyBrief()
      if (text) { sessionStorage.setItem(cacheKey, text); setBrief(text) }
    } catch { /* brief es opcional */ } finally { setLoading(false) }
  }, [weekNumber])

  useEffect(() => {
    if (hasAI && completedSessions >= 3) load()
  }, [hasAI, completedSessions, load])

  const totalVolume = Math.round(calcWeekVolume(sessions, weekNumber, dayIds))

  return (
    <section>
      <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>
        {hasAI && completedSessions >= 3 ? 'Resumen IA' : 'Semana en números'}
      </div>
      {hasAI && completedSessions >= 3 ? (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          {loading ? (
            <>
              <div className="skeleton text-line" style={{ marginBottom: 8 }} />
              <div className="skeleton text-line" style={{ marginBottom: 8, width: '85%' }} />
              <div className="skeleton text-line" style={{ width: '70%' }} />
            </>
          ) : brief ? (
            <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.65, color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>{brief}</p>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>No se pudo cargar el análisis. Verifica tu clave de IA en Configuración.</p>
          )}
        </div>
      ) : completedSessions > 0 ? (
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div className="card" style={{ padding: 'var(--space-4)', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>{completedSessions}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Sesiones</div>
          </div>
          {totalVolume > 0 && (
            <div className="card" style={{ padding: 'var(--space-4)', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{(totalVolume / 1000).toFixed(1)}k</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>kg·reps</div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
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

  const { sessions, loading } = useSessions(weekNumber)
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    sessionsApi.listAll().then(setAllSessions).catch((err: unknown) => console.warn('[Dashboard]', err))
  }, [])

  const [showAdvanceBanner, setShowAdvanceBanner] = useState(false)
  const [expectedWeek, setExpectedWeek] = useState(weekNumber)
  useEffect(() => {
    if (user?.routineStartDate) {
      const diffDays = Math.floor((Date.now() - new Date(user.routineStartDate).getTime()) / 86400000)
      const calcWeek = Math.floor(diffDays / 7) + 1
      if (calcWeek > weekNumber) { setExpectedWeek(calcWeek); setShowAdvanceBanner(true) }
      else setShowAdvanceBanner(false)
    }
  }, [user?.routineStartDate, weekNumber])

  async function handleAdvanceWeek() {
    try {
      const updated = await usersApi.update({ currentWeek: expectedWeek })
      setAuth(updated, accessToken ?? '')
      setShowAdvanceBanner(false)
    } catch (err) { console.error('Error advancing week:', err) }
  }

  const completedSessions = useMemo(
    () => dayIds.filter(d => sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)?.complete).length,
    [sessions, dayIds, weekNumber]
  )
  const todayId = useMemo(() => getTodayDayId(dayIds), [dayIds])
  const streak = useMemo(() => calcStreak(allSessions, dayIds, weekNumber), [allSessions, dayIds, weekNumber])
  const weekVolume = useMemo(() => Math.round(calcWeekVolume(sessions, weekNumber, dayIds)), [sessions, weekNumber, dayIds])
  const dayVolumes = useMemo(() =>
    dayIds.map(dayId => {
      const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === dayId)
      if (!s) return 0
      return s.exercises.reduce((total, ex) =>
        total + ex.sets.reduce((t, set) => {
          const kg = parseFloat(set.kg) || 0
          const reps = parseFloat(set.reps) || 0
          return t + kg * reps
        }, 0), 0)
    }), [sessions, dayIds, weekNumber])

  const recentPRs = useMemo(() => {
    const bests: Record<string, { kg: number, week: number }> = {}
    for (const session of allSessions) {
      for (const ex of session.exercises) {
        if (!ex.done || !ex.name) continue
        const maxKg = Math.max(...ex.sets.map(s => parseFloat(s.kg) || 0))
        if (maxKg <= 0) continue
        if (!bests[ex.name] || maxKg > bests[ex.name].kg) {
          bests[ex.name] = { kg: maxKg, week: session.weekNumber }
        }
      }
    }
    return Object.entries(bests)
      .sort((a, b) => b[1].week - a[1].week)
      .slice(0, 3)
      .map(([name, { kg }]) => ({ name, kg }))
  }, [allSessions])

  const heatmapWeeks = useMemo(() => {
    const weeks = []
    const start = Math.max(1, weekNumber - 11)
    for (let w = start; w <= weekNumber; w++) {
      const cells = dayIds.map(d => {
        const s = allSessions.find(s => s.weekNumber === w && s.dayId === d)
        if (!s) return 'empty'
        if (s.complete) return 'done'
        return s.exercises.some(e => e.done) ? 'partial' : 'empty'
      })
      weeks.push({ w, cells })
    }
    return weeks
  }, [allSessions, dayIds, weekNumber])

  const [showMigration, setShowMigration] = useState(false)
  useEffect(() => {
    if (localStorage.getItem('gymtracker_v3') && !localStorage.getItem('gym_migrated')) setShowMigration(true)
  }, [])

  const workoutCardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = workoutCardRef.current
    if (!el) return
    const handler = (e: MouseEvent | TouchEvent) => addRipple(el, e)
    el.addEventListener('click', handler as EventListener)
    return () => el.removeEventListener('click', handler as EventListener)
  }, [])

  const now = new Date()
  const greetingDay = DAY_NAMES_ES[now.getDay()].toUpperCase()
  const greetingDate = `${now.getDate()} ${MONTH_NAMES_ES[now.getMonth()].toUpperCase()}`
  const firstName = user?.name?.split(' ')[0] ?? 'Atleta'

  const todaySession = todayId ? sessions.find(s => s.dayId === todayId) : undefined
  const todayTotal = todayId ? (todaySession?.exercises.length ?? (routineDays[todayId]?.exercises.length ?? 0)) : 0
  const todayDone  = todaySession?.exercises.filter(e => e.done).length ?? 0
  const routineName = activeRoutineId ? (PRESET_ROUTINES[activeRoutineId]?.name ?? 'Rutina custom') : ''

  if (loading && sessions.length === 0) {
    return (
      <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="skeleton text-line" style={{ width: '40%', marginBottom: 4 }} />
        <div className="skeleton text-title" style={{ width: '60%', height: 32, marginBottom: 16 }} />
        <div className="kpis-3">
          {[0,1,2].map(i => <div key={i} className="skeleton card-skel" style={{ height: 88 }} />)}
        </div>
        <div className="skeleton card-skel" style={{ height: 140 }} />
        <div className="skeleton card-skel" style={{ height: 88 }} />
      </div>
    )
  }

  return (
    <div className="content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {showMigration && <MigrationModal onDone={() => setShowMigration(false)} />}

      {/* Week advance banner */}
      {showAdvanceBanner && (
        <div className="card" style={{ border: '1px solid var(--color-primary)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <IconRocket size={14} /> ¡Nueva semana detectada!
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>¿Avanzar a la <strong>Semana {expectedWeek}</strong>?</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button className="ghost-btn" style={{ fontSize: 'var(--text-xs)', padding: '.4rem .8rem' }} onClick={() => setShowAdvanceBanner(false)}>Ahora no</button>
            <button className="primary-btn" style={{ fontSize: 'var(--text-xs)', padding: '.4rem .8rem' }} onClick={handleAdvanceWeek}>S{expectedWeek} →</button>
          </div>
        </div>
      )}

      {/* Greeting */}
      <section>
        <div className="greeting-date">{greetingDay} · {greetingDate}</div>
        <div className="greeting-name">Hola, {firstName}</div>
      </section>

      {/* KPIs 3-col */}
      {!activeRoutineId ? (
        <EmptyState
          icon={<IconTarget size={36} />}
          title="Sin rutina activa"
          body="Elige un programa de entrenamiento para ver tu plan aquí y empezar a registrar sesiones."
          action={{ label: 'Ver rutinas', href: '/rutinas' }}
        />
      ) : (
        <>
          <div className="kpis-3">
            <div className="kpi-card animate-in" style={{ animationDelay: '80ms' }}>
              <div className="kpi-label">Racha</div>
              <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {streak > 0 && <IconFire size={18} style={{ color: 'var(--color-energy, #FFAB40)', flexShrink: 0 }} />}
                {streak}<span className="unit">sem</span>
              </div>
              <div className={`kpi-delta ${streak > 0 ? 'up' : 'neutral'}`}>
                {streak > 0 ? `▲ ${streak} semana${streak > 1 ? 's' : ''}` : '— sin racha'}
              </div>
            </div>
            <div className="kpi-card animate-in" style={{ animationDelay: '140ms' }}>
              <div className="kpi-label">Sesiones</div>
              <div className="kpi-value">{completedSessions}<span className="unit">/{dayIds.length}</span></div>
              <div className={`kpi-delta ${completedSessions === dayIds.length ? 'up' : completedSessions > 0 ? 'up' : 'neutral'}`}>
                {completedSessions === dayIds.length ? '▲ Meta' : completedSessions > 0 ? `▲ en curso` : '— pendiente'}
              </div>
            </div>
            <div className="kpi-card kpi-accent animate-in" style={{ animationDelay: '200ms' }}>
              <div className="kpi-label">Volumen</div>
              <div className="kpi-value">
                {weekVolume > 999 ? `${(weekVolume/1000).toFixed(1)}` : weekVolume}
                <span className="unit">{weekVolume > 999 ? 'k kg' : 'kg'}</span>
              </div>
              <div className={`kpi-delta ${weekVolume > 0 ? 'up' : 'neutral'}`}>
                {weekVolume > 0 ? '▲ esta semana' : '— sin datos'}
              </div>
            </div>
          </div>

          {/* Volume bar chart */}
          {dayIds.length > 0 && (
            <div className="chart-card animate-in" style={{ animationDelay: '260ms' }}>
              <div className="chart-card-header">
                <span className="chart-card-title">Volumen diario</span>
                <span className="chart-card-sub">kg·reps · semana {weekNumber}</span>
              </div>
              <BarChart dayIds={dayIds} dayVolumes={dayVolumes} />
            </div>
          )}

          {/* Today's workout card */}
          {todayId ? (
            <div
              ref={workoutCardRef}
              className="workout-card ripple-host animate-in"
              role="button"
              tabIndex={0}
              style={{ animationDelay: '320ms', cursor: 'pointer' }}
              onClick={() => navigate(`/entrenamiento/${todayId}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/entrenamiento/${todayId}`) }}
              aria-label={`Iniciar entrenamiento: ${capitalize(todayId)}`}
            >
              <div className="w-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5h11M6.5 17.5h11M4 12h2m14 0h2M6 8.5v7M18 8.5v7"/>
                </svg>
              </div>
              <div className="w-info">
                <div className="w-name">{capitalize(todayId)} · {(routineDays[todayId] as { label?: string })?.label ?? todayId}</div>
                <div className="w-meta">
                  <div className="w-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    {todayTotal} ej.
                  </div>
                  {todayDone > 0 && (
                    <div className="w-meta-item" style={{ color: 'var(--color-success)' }}>
                      <IconCheck size={12} />
                      {todayDone}/{todayTotal}
                    </div>
                  )}
                </div>
              </div>
              <div className="play-btn" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          ) : (
            <div className="workout-card animate-in" style={{ animationDelay: '320ms', cursor: 'default' }}>
              <div className="w-icon" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-divider)' }}>
                <IconMoon size={22} style={{ color: 'var(--color-text-faint)' }} />
              </div>
              <div className="w-info">
                <div className="w-name">Día de descanso</div>
                <div className="w-meta">
                  <div className="w-meta-item">Recupera bien para el próximo entreno</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent PRs */}
          {recentPRs.length > 0 && (
            <section className="animate-in" style={{ animationDelay: '380ms' }}>
              <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>PRs recientes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {recentPRs.map(pr => (
                  <div key={pr.name} className="pr-feed-item">
                    <div className="pr-feed-icon">PR</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pr-feed-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.name}</div>
                      <div className="pr-feed-val">{pr.kg} kg</div>
                    </div>
                    <div className="pr-feed-delta">↑ personal best</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Heatmap */}
          {heatmapWeeks.length > 1 && (
            <section className="card animate-in" style={{ animationDelay: '440ms', overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)' }}>
                <div className="dv-section-label">Actividad · {heatmapWeeks.length} semanas</div>
              </div>
              <div style={{ overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
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
                          <div key={i} className={`heatmap-cell ${state}`} title={`S${w} · ${dayIds[i]}`} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Weekly brief (solo si hay datos) */}
          {completedSessions > 0 && (
            <WeeklyBriefCard
              weekNumber={weekNumber}
              sessions={sessions}
              dayIds={dayIds}
              hasAI={!!(user?.settings?.aiKeySet)}
              completedSessions={completedSessions}
            />
          )}

          {/* Routine info footer */}
          <div style={{ textAlign: 'center', paddingBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              {routineName} · Semana {weekNumber} · {completedSessions}/{dayIds.length} sesiones
            </span>
          </div>
        </>
      )}
    </div>
  )
}
