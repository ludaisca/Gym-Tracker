import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { getRoutineDays, getDayIds, calcStreak, calcWeekVolume, getBestKgForWeek } from '../../lib/fitness'
import { bodyWeightApi, type BodyWeightEntry } from '../../api/bodyweight'

// ── Achievements ─────────────────────────────────────────────────────────────
interface Achievement {
  id: string; icon: string; title: string; desc: string
  check: (sessions: ReturnType<typeof useSessions>['sessions'], streak: number, totalComplete: number) => boolean
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-session',  icon: '🎯', title: 'Primera sesión',    desc: 'Completaste tu primer entreno',              check: (_s, _st, t) => t >= 1 },
  { id: 'decena',         icon: '💪', title: 'Decatleta',          desc: '10 sesiones completadas',                    check: (_s, _st, t) => t >= 10 },
  { id: 'cincuenta',      icon: '🥈', title: 'Veterano',           desc: '50 sesiones completadas',                    check: (_s, _st, t) => t >= 50 },
  { id: 'centurion',      icon: '🏆', title: 'Centurión',          desc: '100 sesiones completadas',                   check: (_s, _st, t) => t >= 100 },
  { id: 'racha-2',        icon: '🔥', title: 'Racha inicial',      desc: '2 semanas consecutivas (≥75%)',              check: (_s, s) => s >= 2 },
  { id: 'racha-4',        icon: '🔥🔥', title: 'Racha de fuego',  desc: '4 semanas consecutivas (≥75%)',              check: (_s, s) => s >= 4 },
  { id: 'racha-8',        icon: '⚡', title: 'Imparable',          desc: '8 semanas consecutivas (≥75%)',              check: (_s, s) => s >= 8 },
  { id: 'volumen-5k',     icon: '📈', title: 'Volumen 5K',         desc: '5,000 kg×reps en una semana',               check: (sessions) => sessions.some(s => s.exercises.reduce((a, ex) => a + ex.sets.reduce((b, set) => b + (parseFloat(set.kg) * parseFloat(set.reps) || 0), 0), 0) >= 5000) },
  { id: 'volumen-10k',    icon: '🚀', title: 'Volumen 10K',        desc: '10,000 kg×reps en una semana',              check: (sessions) => sessions.some(s => s.exercises.reduce((a, ex) => a + ex.sets.reduce((b, set) => b + (parseFloat(set.kg) * parseFloat(set.reps) || 0), 0), 0) >= 10000) },
  { id: 'notas',          icon: '📝', title: 'Anotador',           desc: 'Registraste notas en una sesión',            check: (sessions) => sessions.some(s => s.notes && s.notes.trim().length > 0) },
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
    bodyWeightApi.list().then(setEntries).catch(() => {})
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
          <div className="empty-icon">⚖️</div>
          <p>Registra tu primer peso para ver la evolución.</p>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Stats() {
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const routineDays = useMemo(() => getRoutineDays(activeRoutineId, []), [activeRoutineId])
  const dayIds = useMemo(() => getDayIds(activeRoutineId, []), [activeRoutineId])

  const { sessions } = useSessions(weekNumber)
  const [tab, setTab] = useState<'progreso' | 'peso' | 'logros'>('progreso')
  const [selectedExercise, setSelectedExercise] = useState<string>('')

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
  ], [routineDays])

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
    const result = []
    for (let w = 1; w <= weekNumber; w++) {
      const vol = Math.round(calcWeekVolume(sessions, w, dayIds))
      if (vol > 0) result.push({ week: `S${w}`, kg: vol })
    }
    return result
  }, [sessions, weekNumber, dayIds])

  const exerciseHistory = useMemo(() => {
    if (!selectedExercise) return []
    const data = []
    for (let w = 1; w <= weekNumber; w++) {
      const best = getBestKgForWeek(sessions, dayIds, selectedExercise, w, routineDays)
      if (best > 0) data.push({ week: `S${w}`, kg: best })
    }
    return data
  }, [selectedExercise, sessions, weekNumber, dayIds, routineDays])

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter(a => a.check(sessions, streak, totalCompleteSessions)),
    [sessions, streak, totalCompleteSessions]
  )

  return (
    <>
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
          <div className="kpi-value">{streak > 0 ? '🔥 ' : ''}{streak}</div>
          <div className="kpi-meta">{streak >= 2 ? 'semanas consecutivas' : 'semanas'}</div>
        </article>
      </div>

      {/* Tabs */}
      <div className="stats-tabs">
        {(['progreso', 'peso', 'logros'] as const).map(t => (
          <button key={t} className={`stats-tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'progreso' ? '📊 Progreso' : t === 'peso' ? '⚖️ Peso' : `🏆 Logros (${unlockedAchievements.length}/${ACHIEVEMENTS.length})`}
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
                <div><h3>🏆 Tabla de PRs</h3><p>Máximo kg por ejercicio.</p></div>
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
                      <span className="pill">{s?.complete ? '✓ done' : 'open'}</span>
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
                  return (
                    <div key={a.id} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
                      <div className="achievement-icon">{unlocked ? a.icon : '🔒'}</div>
                      <div className="achievement-title">{a.title}</div>
                      <div className="achievement-desc">{a.desc}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
