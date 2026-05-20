import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../../store'
import { useRoutines } from '../../hooks/useRoutines'
import { sessionsApi } from '../../api/sessions'
import { getRoutineDays, getDayIds, calcStreak, getBestKgForWeek } from '../../lib/fitness'
import { bodyWeightApi, type BodyWeightEntry } from '../../api/bodyweight'
import { analyticsApi, type WeekAnalytics, type ExerciseAnalyticsPoint } from '../../api/analytics'
import type { WorkoutSession } from '../../types/domain'

type Sessions = WorkoutSession[]

// ── Icons ────────────────────────────────────────────────────────────────────
import { IconCheck, IconLock } from '../ui/Icons'

function IconTarget({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
function IconBicep({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5l-3 3-4-2.5 1.5 5 2.5 1.5-1.5 4.5 4.5 1.5 5.5-2.5 1.5-6.5-6.5-4z"/><path d="M11 12l1 1"/><path d="M9 16c0 1 1 2 2 2s2-1 2-2"/></svg>
}
function IconTrophy({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
}
function IconFire({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
}
function IconLightning({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
}
function IconChart({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
}
function IconRocket({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/></svg>
}
function IconNote({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12c0 2.21-1.79 4-4 4H4"/></svg>
}
function IconWeight({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
}
// ── Achievements ─────────────────────────────────────────────────────────────
interface Achievement {
  id: string; icon: React.ReactNode; title: string; desc: string
  check: (sessions: Sessions, streak: number, totalComplete: number) => boolean
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-session',  icon: <IconTarget />, title: 'Primera sesión',    desc: 'Completaste tu primer entreno',              check: (_s, _st, t) => t >= 1 },
  { id: 'decena',         icon: <IconBicep />, title: 'Decatleta',          desc: '10 sesiones completadas',                    check: (_s, _st, t) => t >= 10 },
  { id: 'cincuenta',      icon: <IconTrophy />, title: 'Veterano',           desc: '50 sesiones completadas',                    check: (_s, _st, t) => t >= 50 },
  { id: 'centurion',      icon: <IconTrophy />, title: 'Centurión',          desc: '100 sesiones completadas',                   check: (_s, _st, t) => t >= 100 },
  { id: 'racha-2',        icon: <IconFire />, title: 'Racha inicial',      desc: '2 semanas consecutivas (≥75%)',              check: (_s, s) => s >= 2 },
  { id: 'racha-4',        icon: <IconFire />, title: 'Racha de fuego',  desc: '4 semanas consecutivas (≥75%)',              check: (_s, s) => s >= 4 },
  { id: 'racha-8',        icon: <IconLightning />, title: 'Imparable',          desc: '8 semanas consecutivas (≥75%)',              check: (_s, s) => s >= 8 },
  { id: 'volumen-5k',     icon: <IconChart />, title: 'Volumen 5K',         desc: '5,000 kg×reps en una semana',               check: (sessions) => sessions.some(s => s.exercises.reduce((a, ex) => a + ex.sets.reduce((b, set) => b + (parseFloat(set.kg) * parseFloat(set.reps) || 0), 0), 0) >= 5000) },
  { id: 'volumen-10k',    icon: <IconRocket />, title: 'Volumen 10K',        desc: '10,000 kg×reps en una semana',              check: (sessions) => sessions.some(s => s.exercises.reduce((a, ex) => a + ex.sets.reduce((b, set) => b + (parseFloat(set.kg) * parseFloat(set.reps) || 0), 0), 0) >= 10000) },
  { id: 'notas',          icon: <IconNote />, title: 'Anotador',           desc: 'Registraste notas en una sesión',            check: (sessions) => sessions.some(s => s.notes && s.notes.trim().length > 0) },
]

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, unit = 'kg' }: { active?: boolean; payload?: { value: number }[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">Semana {label}</div>
      <div className="chart-tooltip-value">{payload[0].value.toLocaleString()} {unit}</div>
    </div>
  )
}

// ── Weight Tab ────────────────────────────────────────────────────────────────
function WeightTab() {
  const [entries, setEntries] = useState<BodyWeightEntry[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [kg, setKg] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    bodyWeightApi.list().then(setEntries).catch((err: unknown) => console.warn("[load]", err))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    const val = parseFloat(kg)
    if (!val || val <= 0) return
    setSaving(true)
    try {
      await bodyWeightApi.upsert(date, val)
      setKg('')
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (d: string) => {
    await bodyWeightApi.remove(d)
    load()
  }

  const chartData = entries.map(e => ({ date: e.date.slice(5), kg: e.weight_kg }))
  const minKg = entries.length ? Math.min(...entries.map(e => e.weight_kg)) - 2 : 50
  const maxKg = entries.length ? Math.max(...entries.map(e => e.weight_kg)) + 2 : 100

  return (
    <div className="stats-tab-content">
      <section className="card">
        <div className="panel-head">
          <div><h3>Registrar peso</h3><p>Un registro por día.</p></div>
        </div>
        <div className="panel-body">
          <div className="weight-form">
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            <input type="number" className="input" placeholder="kg (ej. 78.5)" step="0.1" min="20" max="300" value={kg} onChange={e => setKg(e.target.value)} />
            <button className="primary-btn" onClick={handleSave} disabled={saving || !kg}>
              {saving ? '…' : 'Guardar'}
            </button>
          </div>
        </div>
      </section>

      {entries.length >= 2 && (
        <section className="card">
          <div className="panel-head">
            <div><h3>Evolución de peso</h3><p>{entries.length} registros</p></div>
          </div>
          <div className="panel-body">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis domain={[minKg, maxKg]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} unit=" kg" />
                <Tooltip content={<ChartTooltip unit="kg" />} />
                <Area type="monotone" dataKey="kg" stroke="var(--color-primary)" strokeWidth={2} fill="url(#weightGrad)" dot={{ fill: 'var(--color-primary)', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <section className="card">
          <div className="panel-head"><div><h3>Historial</h3></div></div>
          <div className="panel-body">
            <div className="weight-list">
              {[...entries].reverse().slice(0, 10).map(e => (
                <div key={e.date} className="weight-row">
                  <span className="weight-date">{e.date}</span>
                  <span className="weight-val">{e.weight_kg} kg</span>
                  <button className="ghost-btn weight-del" onClick={() => handleDelete(e.date)}>×</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {entries.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><IconWeight /></div>
          <p>Registra tu primer peso para ver la evolución.</p>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Stats() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])

  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    sessionsApi.listAll().then(setAllSessions).catch((err: unknown) => console.warn("[load]", err))
  }, [])

  const sessions = allSessions
  const [tab, setTab] = useState<'progreso' | 'peso' | 'logros'>('progreso')
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  const [weekData, setWeekData] = useState<WeekAnalytics | null>(null)
  const [exerciseData, setExerciseData] = useState<ExerciseAnalyticsPoint[] | null>(null)

  useEffect(() => {
    let cancelled = false
    analyticsApi.getWeek(weekNumber)
      .then(d => { if (!cancelled) setWeekData(d) })
      .catch((err: unknown) => console.warn('[analytics/week]', err))
    return () => { cancelled = true }
  }, [weekNumber])

  useEffect(() => {
    if (!selectedExercise) { setExerciseData(null); return }
    let cancelled = false
    analyticsApi.getExercise(selectedExercise)
      .then(d => { if (!cancelled) setExerciseData(d) })
      .catch((err: unknown) => console.warn('[analytics/exercise]', err))
    return () => { cancelled = true }
  }, [selectedExercise])

  const totalCompleted = useMemo(
    () => dayIds.reduce((a, d) => {
      const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)
      return a + (s ? s.exercises.filter(e => e.done).length : 0)
    }, 0),
    [sessions, dayIds, weekNumber]
  )

  const completedDays = dayIds.filter(d => sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)?.complete).length
  const streak = useMemo(() => calcStreak(sessions, dayIds, weekNumber), [sessions, dayIds, weekNumber])
  const totalCompleteSessions = useMemo(() => sessions.filter(s => s.complete).length, [sessions])

  const allExercises = useMemo(() => [
    ...new Set(Object.values(routineDays).flatMap(d => d.exercises.map(e => e.name)))
  ].sort((a, b) => a.localeCompare(b, 'es')), [routineDays])

  useEffect(() => { if (allExercises.length && !selectedExercise) setSelectedExercise(allExercises[0]) }, [allExercises, selectedExercise])

  const prRows = useMemo(() => allExercises.map(name => {
    let bestKg = 0, bestWeek: number | null = null
    for (let w = 1; w <= weekNumber; w++) {
      const kg = getBestKgForWeek(sessions, dayIds, name, w, routineDays)
      if (kg > bestKg) { bestKg = kg; bestWeek = w }
    }
    return { name, bestKg, bestWeek }
  }).filter(r => r.bestKg > 0), [sessions, dayIds, weekNumber, allExercises, routineDays])

  const volData = useMemo(() => {
    const byWeek = new Map<number, number>()
    for (const s of sessions) {
      const vol = s.exercises.reduce((a, ex) =>
        a + ex.sets.reduce((t, set) => {
          const kg = parseFloat(set.kg)
          const reps = parseFloat(set.reps)
          return t + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
        }, 0), 0)
      byWeek.set(s.weekNumber, (byWeek.get(s.weekNumber) ?? 0) + vol)
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .filter(([, vol]) => vol > 0)
      .map(([w, vol]) => ({ week: `S${w}`, kg: Math.round(vol) }))
  }, [sessions])

  const exerciseHistoryLocal = useMemo(() => {
    if (!selectedExercise) return []
    const data = []
    for (let w = 1; w <= weekNumber; w++) {
      const best = getBestKgForWeek(sessions, dayIds, selectedExercise, w, routineDays)
      if (best > 0) data.push({ week: `S${w}`, kg: best })
    }
    return data
  }, [selectedExercise, sessions, weekNumber, dayIds, routineDays])

  // Prefiere datos del backend (incluyen 1RM por semana). Fallback al cálculo local.
  const exerciseHistory = useMemo(() => {
    if (exerciseData && exerciseData.length) {
      return exerciseData.map(p => ({ week: `S${p.week}`, kg: p.bestKg }))
    }
    return exerciseHistoryLocal
  }, [exerciseData, exerciseHistoryLocal])

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter(a => a.check(sessions, streak, totalCompleteSessions)),
    [sessions, streak, totalCompleteSessions]
  )

  // F4 — Proyección 1RM (Epley: peso × (1 + reps/30))
  const oneRMDataLocal = useMemo(() => {
    const bests: Record<string, { name: string; weight: number; reps: number; oneRM: number }> = {}
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (!ex.done || !ex.name) continue
        for (const set of ex.sets) {
          const kg = parseFloat(set.kg)
          const reps = parseFloat(set.reps)
          if (!(kg > 0) || !(reps > 0)) continue
          const oneRM = Math.round(kg * (1 + reps / 30) * 10) / 10
          const prev = bests[ex.name]
          if (!prev || oneRM > prev.oneRM) {
            bests[ex.name] = { name: ex.name, weight: kg, reps, oneRM }
          }
        }
      }
    }
    return Object.values(bests).sort((a, b) => b.oneRM - a.oneRM).slice(0, 12)
  }, [sessions])

  // Prefiere PRs del backend (calculados sobre toda la sesión y centralizados).
  const oneRMData = useMemo(() => {
    if (weekData && weekData.prs.length) {
      return weekData.prs.slice(0, 12).map(p => ({ name: p.name, weight: p.kg, reps: p.reps, oneRM: p.oneRM }))
    }
    return oneRMDataLocal
  }, [weekData, oneRMDataLocal])

  // Top ejercicios por volumen de la semana actual (solo backend).
  const topVolume = useMemo(
    () => (weekData?.exercises ?? []).slice(0, 5),
    [weekData]
  )

  // F3 — Sugerencias de progresión de peso
  const progressionSuggestions = useMemo(() => {
    const suggestions: { name: string; currentKg: number; suggestedKg: number }[] = []
    for (const exercise of allExercises) {
      const relevantSessions = [...sessions]
        .sort((a, b) => b.weekNumber - a.weekNumber)
        .filter(s => s.exercises.some(e => e.name === exercise && e.done))
        .slice(0, 3)
      if (relevantSessions.length < 3) continue
      const stats = relevantSessions.map(s => {
        const ex = s.exercises.find(e => e.name === exercise && e.done)
        if (!ex || !ex.sets.length) return null
        const weights = ex.sets.map(set => parseFloat(set.kg)).filter(w => w > 0)
        if (!weights.length) return null
        const maxWeight = Math.max(...weights)
        const allRepsComplete = ex.sets.every(set => parseFloat(set.reps) > 0)
        return { maxWeight, allRepsComplete }
      }).filter(Boolean) as { maxWeight: number; allRepsComplete: boolean }[]
      if (stats.length < 3) continue
      if (!stats.every(s => s.allRepsComplete)) continue
      const allSameWeight = stats.every(s => s.maxWeight === stats[0].maxWeight) && stats[0].maxWeight > 0
      if (allSameWeight) {
        suggestions.push({ name: exercise, currentKg: stats[0].maxWeight, suggestedKg: stats[0].maxWeight + 2.5 })
      }
    }
    return suggestions
  }, [sessions, allExercises])

  // Persistir fechas de desbloqueo en localStorage por userId
  const [achievementDates, setAchievementDates] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!user?.id) return
    const stored = localStorage.getItem(`gym_achievements_${user.id}`)
    const saved: Record<string, string> = stored ? JSON.parse(stored) : {}
    let changed = false
    for (const a of unlockedAchievements) {
      if (!saved[a.id]) {
        saved[a.id] = new Date().toISOString()
        changed = true
      }
    }
    if (changed) {
      localStorage.setItem(`gym_achievements_${user.id}`, JSON.stringify(saved))
    }
    setAchievementDates(saved)
  }, [unlockedAchievements, user?.id])

  return (
    <div className="fade-in">
      <div className="kpis">
        <article className="card kpi">
          <div className="kpi-label">Ejercicios marcados</div>
          <div className="kpi-value">{totalCompleted}</div>
          <div className="kpi-meta">esta semana</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Sesiones cerradas</div>
          <div className="kpi-value">{completedDays}/{dayIds.length}</div>
          <div className="kpi-meta">semana {weekNumber}</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Total sesiones</div>
          <div className="kpi-value">{totalCompleteSessions}</div>
          <div className="kpi-meta">historial completo</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Racha activa</div>
          <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {streak > 0 && <IconFire className="accent-fire" />}
            {streak}
          </div>
          <div className="kpi-meta">{streak >= 2 ? 'semanas consecutivas' : 'semanas'}</div>
        </article>
      </div>

      {/* Tabs */}
      <div className="stats-tabs">
        {(['progreso', 'peso', 'logros'] as const).map(t => (
          <button key={t} className={`stats-tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'progreso' ? <><IconChart /> Progreso</> : t === 'peso' ? <><IconWeight /> Peso</> : <><IconTrophy /> Logros ({unlockedAchievements.length})</>}
          </button>
        ))}
      </div>

      {tab === 'progreso' && (
        <div className="stats-tab-content">
          {volData.length >= 2 && (
            <section className="card">
              <div className="panel-head">
                <div><h3>Volumen semanal</h3><p>kg × reps acumulados.</p></div>
              </div>
              <div className="panel-body">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={volData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                    <Tooltip content={<ChartTooltip unit="kg×r" />} />
                    <Area type="monotone" dataKey="kg" stroke="var(--color-primary)" strokeWidth={2} fill="url(#volGrad)" dot={{ fill: 'var(--color-primary)', r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {allExercises.length > 0 && (
            <section className="card">
              <div className="panel-head">
                <div><h3>Progreso por ejercicio</h3><p>Mejor kg registrado por semana.</p></div>
                <select className="input" style={{ maxWidth: 200 }} value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
                  {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
              <div className="panel-body">
                {exerciseHistory.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={exerciseHistory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} unit=" kg" />
                      <Tooltip content={<ChartTooltip unit="kg" />} />
                      <Line type="monotone" dataKey="kg" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted tiny" style={{ textAlign: 'center', padding: '1rem 0' }}>
                    Necesitas al menos 2 semanas con datos para {selectedExercise}.
                  </p>
                )}
              </div>
            </section>
          )}

          {prRows.length > 0 && (
            <section className="card">
              <div className="panel-head">
                <div><h3>Tabla de PRs</h3><p>Máximo kg por ejercicio (ejercicios completados).</p></div>
                <button
                  className="ghost-btn"
                  style={{ padding: '.4rem .8rem', fontSize: 'var(--text-xs)', flexShrink: 0 }}
                  onClick={() => navigate('/historial')}
                >
                  Ver historial completo →
                </button>
              </div>
              <div className="panel-body">
                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead><tr><th>Ejercicio</th><th>Mejor kg</th><th>Semana</th></tr></thead>
                    <tbody>
                      {prRows.map(r => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          <td><strong>{r.bestKg} kg</strong></td>
                          <td><span className="pill">S{r.bestWeek}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {oneRMData.length > 0 && (
            <section className="card">
              <div className="panel-head">
                <div><h3>Proyección 1RM</h3><p>Máximo estimado con una repetición (fórmula Epley).</p></div>
              </div>
              <div className="panel-body">
                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead><tr><th>Ejercicio</th><th>Mejor set</th><th>1RM est.</th></tr></thead>
                    <tbody>
                      {oneRMData.map(r => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          <td className="muted">{r.weight} kg × {r.reps} reps</td>
                          <td><strong>{r.oneRM} kg</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {topVolume.length > 0 && (
            <section className="card">
              <div className="panel-head">
                <div>
                  <h3>Top ejercicios por volumen</h3>
                  <p>Semana {weekNumber} · {weekData?.sessions ?? 0} sesiones · {(weekData?.totalVolume ?? 0).toLocaleString()} kg×r totales.</p>
                </div>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {topVolume.map((e, i) => {
                    const max = topVolume[0].volume || 1
                    const pct = Math.max(8, (e.volume / max) * 100)
                    return (
                      <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="pill" style={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                            <span className="tiny muted" style={{ flexShrink: 0 }}>{e.volume.toLocaleString()} kg×r</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 'var(--radius-full)' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {progressionSuggestions.length > 0 && (
            <section className="card">
              <div className="panel-head">
                <div>
                  <h3>Sugerencias de progresión</h3>
                  <p>Ejercicios con peso consistente en las últimas 3 sesiones.</p>
                </div>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {progressionSuggestions.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{s.name}</div>
                        <div className="tiny muted">Actual: {s.currentKg} kg</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>+2.5 kg</div>
                        <div className="tiny muted">→ {s.suggestedKg} kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="card">
            <div className="panel-head">
              <div><h3>Resumen por día</h3><p>Semana {weekNumber}.</p></div>
            </div>
            <div className="panel-body day-grid">
              {dayIds.map(day => {
                const s = sessions.find(s => s.weekNumber === weekNumber && s.dayId === day)
                const dayLabel = (routineDays[day] as { label?: string })?.label ?? day
                return (
                  <article key={day} className="day-card">
                    <header>
                      <div>
                        <h4>{capitalize(day)} · {dayLabel}</h4>
                        <div className="tiny muted">{s ? s.exercises.filter(e => e.done).length : 0} ejercicios marcados</div>
                      </div>
                      <span className="pill" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {s?.complete ? <><IconCheck size={10} strokeWidth={3} /> done</> : 'open'}
                      </span>
                    </header>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {tab === 'peso' && <WeightTab />}

      {tab === 'logros' && (
        <div className="stats-tab-content">
          <section className="card">
            <div className="panel-head">
              <div><h3>Logros desbloqueados</h3><p>{unlockedAchievements.length} de {ACHIEVEMENTS.length}</p></div>
            </div>
            <div className="panel-body">
              <div className="achievements-grid">
                {ACHIEVEMENTS.map(a => {
                  const unlocked = unlockedAchievements.some(u => u.id === a.id)
                  const unlockedAt = achievementDates[a.id]
                  const unlockedLabel = unlockedAt
                    ? new Date(unlockedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                    : null
                  return (
                    <div key={a.id} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`} style={{ position: 'relative' }}>
                      <div className={`achievement-icon ${unlocked ? 'unlocked' : ''}`}>
                        {unlocked ? a.icon : <IconLock />}
                      </div>
                      <div className="achievement-title">{a.title}</div>
                      <div className="achievement-desc">{a.desc}</div>
                      {unlocked && unlockedLabel && (
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {unlockedLabel}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
