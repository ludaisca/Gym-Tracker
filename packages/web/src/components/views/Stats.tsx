import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../../store'
import { useRoutines } from '../../hooks/useRoutines'
import { sessionsApi } from '../../api/sessions'
import { getRoutineDays, getDayIds, calcStreak, getBestKgForWeek, calc1RM } from '../../lib/fitness'
import { bodyWeightApi, type BodyWeightEntry } from '../../api/bodyweight'
import { analyticsApi, type WeekAnalytics, type ExerciseAnalyticsPoint } from '../../api/analytics'
import { goalsApi, type LiftGoal } from '../../api/goals'
import { getMuscleVolume, MUSCLE_NAMES } from '../../lib/muscleMap'
import BodySvg from '../ui/BodySvg'
import type { WorkoutSession } from '../../types/domain'

type Sessions = WorkoutSession[]

// ── Icons ────────────────────────────────────────────────────────────────────
import { IconCheck, IconLock } from '../ui/Icons'
import EmptyState from '../ui/EmptyState'

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
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  // Goals (Feature 5)
  const [goals, setGoals] = useState<LiftGoal[]>([])
  const [newGoalExercise, setNewGoalExercise] = useState('')
  const [newGoalKg, setNewGoalKg] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const loadGoals = useCallback(() => {
    goalsApi.list().then(setGoals).catch((err: unknown) => console.warn('[goals]', err))
  }, [])
  useEffect(() => { loadGoals() }, [loadGoals])

  const handleSaveGoal = async () => {
    const kg = parseFloat(newGoalKg)
    if (!newGoalExercise || !kg || kg <= 0) return
    setSavingGoal(true)
    try {
      await goalsApi.upsert(newGoalExercise, kg)
      setNewGoalKg('')
      loadGoals()
    } finally { setSavingGoal(false) }
  }

  const handleDeleteGoal = async (exerciseName: string) => {
    await goalsApi.remove(exerciseName)
    loadGoals()
  }

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

  // Muscle volume (Feature 4)
  const muscleVolume = useMemo(() => {
    const weekSessions = sessions.filter(s => s.weekNumber === weekNumber)
    return getMuscleVolume(weekSessions)
  }, [sessions, weekNumber])

  const topMuscles = useMemo(() => {
    return Object.entries(muscleVolume)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => MUSCLE_NAMES[id] ?? id)
  }, [muscleVolume])

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
    <div className="content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* KPIs */}
      <div className="kpis-3">
        <div className="kpi-card animate-in" style={{ animationDelay: '60ms' }}>
          <div className="kpi-label">Sesiones</div>
          <div className="kpi-value">{completedDays}<span className="unit">/{dayIds.length}</span></div>
          <div className="kpi-delta neutral">semana {weekNumber}</div>
        </div>
        <div className="kpi-card animate-in" style={{ animationDelay: '120ms' }}>
          <div className="kpi-label">Histórico</div>
          <div className="kpi-value">{totalCompleteSessions}</div>
          <div className="kpi-delta neutral">sesiones totales</div>
        </div>
        <div className="kpi-card kpi-accent animate-in" style={{ animationDelay: '180ms' }}>
          <div className="kpi-label">Racha</div>
          <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {streak > 0 && <IconFire className="accent-fire" />}
            {streak}<span className="unit">sem</span>
          </div>
          <div className={`kpi-delta ${streak > 0 ? 'up' : 'neutral'}`}>
            {streak >= 2 ? '▲ consecutivas' : streak === 1 ? '▲ 1 semana' : '— sin racha'}
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<IconChart className="" />}
          title="Sin datos de progreso aún"
          body="Completa tus primeros entrenamientos para ver gráficas de volumen, PRs y evolución."
          action={{ label: 'Empezar a entrenar', href: '/dashboard' }}
        />
      ) : (
        <>
          {/* Volumen semanal */}
          {volData.length >= 2 && (
            <section>
              <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>Volumen semanal</div>
              <div className="card" style={{ padding: 'var(--space-4)' }}>
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

          {/* Progreso por ejercicio */}
          {allExercises.length > 0 && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div className="dv-section-label">Progreso por ejercicio</div>
                <select className="input" style={{ maxWidth: 180, fontSize: 'var(--text-xs)', padding: '.4rem .6rem' }} value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
                  {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
              <div className="card" style={{ padding: 'var(--space-4)' }}>
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

          {/* PRs y 1RM */}
          {prRows.length > 0 && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div className="dv-section-label">Mejores levantamientos</div>
                <button className="ghost-btn" style={{ padding: '.3rem .7rem', fontSize: 'var(--text-xs)' }} onClick={() => navigate('/historial')}>
                  Historial →
                </button>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="pr-table-wrap" style={{ padding: 'var(--space-4)' }}>
                  <table className="pr-table">
                    <thead><tr><th>Ejercicio</th><th>Mejor kg</th><th>1RM est.</th></tr></thead>
                    <tbody>
                      {prRows.slice(0, 8).map(r => {
                        const rm = oneRMData.find(o => o.name === r.name)
                        return (
                          <tr key={r.name}>
                            <td>{r.name}</td>
                            <td><strong>{r.bestKg} kg</strong></td>
                            <td>{rm ? `${rm.oneRM} kg` : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Mapa muscular */}
          <section>
            <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>Mapa muscular · semana {weekNumber}</div>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              {Object.keys(muscleVolume).length === 0 ? (
                <p className="muted tiny" style={{ textAlign: 'center', padding: '1rem 0' }}>Completa ejercicios esta semana para ver qué músculos estás trabajando.</p>
              ) : (
                <>
                  <BodySvg activeGroups={muscleVolume} />
                  {topMuscles.length > 0 && (
                    <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {topMuscles.map((m, i) => (
                        <span key={m} className="pill" style={{ background: `color-mix(in srgb, var(--color-primary) ${80 - i * 20}%, transparent)`, color: 'var(--color-primary)', fontWeight: 700 }}>{m}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Metas 1RM */}
          <section>
            <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>Objetivos 1RM</div>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div className="goal-form" style={{ marginBottom: goals.length ? 'var(--space-4)' : 0 }}>
                <select className="input" value={newGoalExercise} onChange={e => setNewGoalExercise(e.target.value)}>
                  <option value="">Ejercicio</option>
                  {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
                <input className="input" type="number" placeholder="Meta (kg)" min="1" max="1000" step="0.5" value={newGoalKg} onChange={e => setNewGoalKg(e.target.value)} />
                <button className="primary-btn" disabled={savingGoal || !newGoalExercise || !newGoalKg} onClick={handleSaveGoal}>
                  {savingGoal ? '…' : 'Añadir'}
                </button>
              </div>
              {goals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {goals.map(goal => {
                    const best1RM = sessions.reduce((best, s) => {
                      const ex = s.exercises.find(e => e.name === goal.exerciseName && e.done)
                      if (!ex) return best
                      for (const set of ex.sets) {
                        const rm = calc1RM(set.kg, set.reps)
                        if (rm && rm > best) return rm
                      }
                      return best
                    }, 0)
                    const pct = best1RM > 0 ? Math.min(100, Math.round(best1RM / goal.targetKg * 100)) : 0
                    return (
                      <div key={goal.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{goal.exerciseName}</div>
                            <div className="tiny muted">{best1RM > 0 ? `${best1RM} kg` : 'sin datos'} → meta {goal.targetKg} kg</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ fontWeight: 800, color: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>{pct}%</span>
                            <button className="ghost-btn" style={{ padding: '.2rem .5rem', fontSize: 'var(--text-xs)' }} onClick={() => handleDeleteGoal(goal.exerciseName)}>×</button>
                          </div>
                        </div>
                        <div className="progress"><span style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : undefined }} /></div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Peso corporal */}
          <section>
            <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>Peso corporal</div>
            <WeightTab />
          </section>

          {/* Sugerencias de progresión */}
          {progressionSuggestions.length > 0 && (
            <section>
              <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>Sugerencias de progresión</div>
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {progressionSuggestions.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
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

          {/* Logros */}
          <section>
            <div className="dv-section-label" style={{ marginBottom: 'var(--space-3)' }}>Logros · {unlockedAchievements.length}/{ACHIEVEMENTS.length}</div>
            <div className="achievements-grid">
              {ACHIEVEMENTS.map(a => {
                const unlocked = unlockedAchievements.some(u => u.id === a.id)
                const unlockedAt = achievementDates[a.id]
                const unlockedLabel = unlockedAt ? new Date(unlockedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : null
                return (
                  <div key={a.id} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
                    <div className={`achievement-icon ${unlocked ? 'unlocked' : ''}`}>
                      {unlocked ? a.icon : <IconLock />}
                    </div>
                    <div className="achievement-title">{a.title}</div>
                    <div className="achievement-desc">{a.desc}</div>
                    {unlocked && unlockedLabel && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: 4 }}>{unlockedLabel}</div>}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
