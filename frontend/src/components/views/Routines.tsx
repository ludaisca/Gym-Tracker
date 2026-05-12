import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { usersApi } from '../../api/users'
import { routinesApi } from '../../api/routines'
import { api } from '../../api/client'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import type { Routine } from '../../types/domain'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Routines() {
  const navigate = useNavigate()
  const { user, setAuth } = useAuthStore()
  const [customRoutines, setCustomRoutines] = useState<Routine[]>([])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [clearWeek, setClearWeek] = useState(false)
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    routinesApi.list().then(setCustomRoutines).catch(() => {})
  }, [])

  const activeId = user?.activeRoutineId ?? null

  const allRoutines = useMemo(() => {
    const presets = Object.values(PRESET_ROUTINES).map(r => ({ ...r, isCustom: false }))
    const customs = customRoutines.map(r => ({ ...r, isPreset: false, isCustom: true, description: r.description ?? '' }))
    return [...presets, ...customs]
  }, [customRoutines])

  async function activate(id: string) {
    if (!user) return
    const updated = await usersApi.update({ activeRoutineId: id })
    setAuth(updated, useAuthStore.getState().accessToken ?? '')
  }

  async function confirmActivate() {
    if (!pendingId) return
    setActivating(true)
    try {
      if (clearWeek && user?.currentWeek) {
        await api.delete(`/sessions/week/${user.currentWeek}`)
      }
      await activate(pendingId)
    } finally {
      setActivating(false)
      setPendingId(null)
      setClearWeek(false)
    }
  }

  async function deleteRoutine(id: string) {
    await routinesApi.delete(id)
    setCustomRoutines(prev => prev.filter(r => r.id !== id))
    if (activeId === id) {
      await activate('torso-pierna')
    }
  }

  const pendingRoutine = pendingId ? allRoutines.find(r => r.id === pendingId) : null

  return (
    <>
      <div className="panel-head" style={{ padding: '0 0 var(--space-4)' }}>
        <div><h3>Rutinas disponibles</h3><p>Presets y rutinas personalizadas.</p></div>
        <button className="primary-btn" onClick={() => navigate('/rutinas/nueva')}>+ Nueva rutina</button>
      </div>
      <div className="routine-grid">
        {allRoutines.map(r => {
          const isActive = r.id === activeId
          const dayEntries = Object.entries(r.days ?? {})
          const exCount = dayEntries.reduce((a, [, d]) => a + ((d as { exercises?: unknown[] }).exercises?.length ?? 0), 0)
          return (
            <article key={r.id} className={`routine-card${isActive ? ' active' : ''}`}>
              <div className="routine-card-head">
                <div>
                  <div className="routine-card-name">
                    {r.name}
                    {isActive && <span className="pr-badge" style={{ marginLeft: '.5rem' }}>Activa</span>}
                  </div>
                  <div className="tiny muted" style={{ marginTop: '.3rem' }}>{r.description ?? ''}</div>
                </div>
                {r.isCustom && (
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32 }}
                    onClick={() => deleteRoutine(r.id)}
                    title="Eliminar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', margin: '.6rem 0' }}>
                {dayEntries.map(([d, day]) => (
                  <span key={d} className="pill" style={{ fontSize: 11 }}>
                    {capitalize(d)} · {(day as { label?: string }).label ?? d}
                  </span>
                ))}
              </div>
              <div className="tiny muted">{dayEntries.length} días · {exCount} ejercicios</div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                {!isActive && (
                  <button className="primary-btn" style={{ padding: '.5rem .9rem' }} onClick={() => setPendingId(r.id)}>
                    Activar
                  </button>
                )}
                {r.isCustom && (
                  <button className="ghost-btn" style={{ padding: '.5rem .9rem' }} onClick={() => navigate(`/rutinas/${r.id}`)}>
                    Editar
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {pendingId && (
        <div
          className="confirm-overlay open"
          onClick={e => { if (e.target === e.currentTarget) { setPendingId(null); setClearWeek(false) } }}
        >
          <div className="confirm-sheet">
            <div className="confirm-sheet-handle" />
            <h3>Cambiar rutina</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 'var(--space-3) 0 var(--space-4)' }}>
              Vas a activar <strong>{pendingRoutine?.name}</strong>. Tu historial de entrenamientos se conserva, pero los ejercicios registrados pueden quedar desincronizados si la nueva rutina tiene días o ejercicios diferentes.
            </p>
            <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', fontSize: 'var(--text-sm)', cursor: 'pointer', padding: 'var(--space-3)', background: 'var(--color-surface-alt, var(--color-surface-offset))', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }}>
              <input type="checkbox" checked={clearWeek} onChange={e => setClearWeek(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600 }}>Limpiar sesiones de la semana actual</div>
                <div style={{ color: 'var(--color-text-faint)', marginTop: 3 }}>
                  Borra los datos de entrenamiento de la semana {user?.currentWeek} para empezar desde cero con la nueva rutina.
                </div>
              </div>
            </label>
            <div className="confirm-sheet-actions">
              <button className="primary-btn" onClick={confirmActivate} disabled={activating}>
                {activating ? 'Cambiando…' : 'Confirmar cambio'}
              </button>
              <button className="ghost-btn" onClick={() => { setPendingId(null); setClearWeek(false) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
