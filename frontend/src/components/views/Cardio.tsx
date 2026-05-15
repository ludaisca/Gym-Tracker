import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { useRoutines } from '../../hooks/useRoutines'
import { sessionsApi } from '../../api/sessions'
import { getDayIds } from '../../lib/fitness'
import type { WorkoutSession } from '../../types/domain'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function parseDurationMin(s?: string): number {
  if (!s) return 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{payload[0].value} min</div>
    </div>
  )
}

export default function Cardio() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const customRoutines = useRoutines()
  const dayIds = useMemo(() => getDayIds(activeRoutineId, customRoutines), [activeRoutineId, customRoutines])

  const { sessions } = useSessions(weekNumber)
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    sessionsApi.listAll().then(setAllSessions).catch(() => {})
  }, [])

  // Volumen cardio por semana (sum de minutos)
  const weeklyChart = useMemo(() => {
    const byWeek = new Map<number, number>()
    for (const s of allSessions) {
      const min = parseDurationMin(s.cardio?.duration)
      if (min > 0) byWeek.set(s.weekNumber, (byWeek.get(s.weekNumber) ?? 0) + min)
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([w, min]) => ({ week: `S${w}`, min }))
  }, [allSessions])

  // Máquina más usada
  const topMachine = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of allSessions) {
      const m = s.cardio?.machine?.trim()
      if (m) counts.set(m, (counts.get(m) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    return [...counts.entries()].sort(([, a], [, b]) => b - a)[0][0]
  }, [allSessions])

  // Total minutos semana actual
  const totalMinThisWeek = useMemo(() =>
    sessions.reduce((a, s) => a + parseDurationMin(s.cardio?.duration), 0),
    [sessions])

  // Total minutos histórico acumulado
  const totalMinHistoric = useMemo(() =>
    allSessions.reduce((a, s) => a + parseDurationMin(s.cardio?.duration), 0),
    [allSessions])

  return (
    <div className="fade-in">
      {/* KPIs */}
      <div className="kpis">
        <article className="card kpi">
          <div className="kpi-label">Esta semana</div>
          <div className="kpi-value">{totalMinThisWeek}</div>
          <div className="kpi-meta">minutos de cardio</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Máquina favorita</div>
          <div className="kpi-value" style={{ fontSize: 'var(--text-xl)' }}>{topMachine ?? '—'}</div>
          <div className="kpi-meta">más usada en historial</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Semanas con cardio</div>
          <div className="kpi-value">{weeklyChart.length}</div>
          <div className="kpi-meta">de {weekNumber} total</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Total acumulado</div>
          <div className="kpi-value">{totalMinHistoric}</div>
          <div className="kpi-meta">minutos históricos</div>
        </article>
      </div>

      {/* Gráfico de tendencia */}
      {weeklyChart.length >= 2 && (
        <section className="card">
          <div className="panel-head">
            <div><h3>Tendencia de cardio</h3><p>Minutos acumulados por semana.</p></div>
          </div>
          <div className="panel-body">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="cardioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} unit=" m" />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="min"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#cardioGrad)"
                  dot={{ fill: 'var(--color-primary)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Tabla de días */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Cardio tracker</h3><p>Semana {weekNumber} — resumen por día.</p></div>
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
    </div>
  )
}
