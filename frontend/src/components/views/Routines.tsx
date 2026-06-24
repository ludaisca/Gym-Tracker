import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { usersApi } from '../../api/users'
import { routinesApi } from '../../api/routines'
import { api } from '../../api/client'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import type { Routine } from '../../types/domain'
import { IconTarget, IconTrash, IconEdit, IconCopy, IconEye, IconPlus, IconCheck, IconClose } from '../ui/Icons'
import { toast } from '../../lib/toast'

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
  const [tab, setTab] = useState<'presets' | 'custom'>('presets')
  const [previewRoutine, setPreviewRoutine] = useState<Routine | null>(null)

  const load = () => routinesApi.list().then(setCustomRoutines).catch(() => {})
  useEffect(() => { load() }, [])

  const activeId = user?.activeRoutineId ?? null

  const presets = useMemo(() => Object.values(PRESET_ROUTINES).map(r => ({ ...r, userId: 'preset', isCustom: false, isPreset: true })), [])
  const customs = useMemo(() => customRoutines.map(r => ({ ...r, isPreset: false, isCustom: true, description: r.description ?? '' })), [customRoutines])

  async function activate(id: string) {
    if (!user) return
    const updated = await usersApi.update({ activeRoutineId: id, routineStartDate: new Date().toISOString(), currentWeek: 1 })
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
      setPendingId(null)
      toast('Rutina activada correctamente')
    } catch {
      toast('Error al activar la rutina', 'error')
    } finally {
      setActivating(false)
      setClearWeek(false)
    }
  }

  async function deleteRoutine(id: string) {
    if (!confirm('¿Seguro que quieres eliminar esta rutina?')) return
    await routinesApi.delete(id)
    setCustomRoutines(prev => prev.filter(r => r.id !== id))
    if (activeId === id) await activate('torso-pierna')
  }

  async function cloneRoutine(r: Routine) {
    const name = `Copia de ${r.name}`
    try {
      await routinesApi.create({ name, description: r.description, days: r.days })
      await load()
      setTab('custom')
      toast(`"${name}" creada en Mis Creaciones`)
    } catch {
      toast('Error al clonar la rutina', 'error')
    }
  }

  const activeRoutines = tab === 'presets' ? presets : customs
  const pendingRoutineData = pendingId ? [...presets, ...customs].find(r => r.id === pendingId) : null

  return (
    <div className="fade-in">
      <div className="panel-head" style={{ padding: '0 0 var(--space-6)' }}>
        <div>
          <h3>Mis Rutinas</h3>
          <p>Selecciona o crea tu plan de entrenamiento.</p>
        </div>
        <button className="primary-btn" onClick={() => navigate('/rutinas/nueva')}>
          <IconPlus size={18} /> Nueva rutina
        </button>
      </div>

      <div className="stats-tabs">
        <button className={`stats-tab-btn ${tab === 'presets' ? 'active' : ''}`} onClick={() => setTab('presets')}>
          <IconTarget size={18} /> Predeterminadas
        </button>
        <button className={`stats-tab-btn ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>
          <IconEdit size={18} /> Mis Creaciones ({customs.length})
        </button>
      </div>

      {activeRoutines.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-12) 0' }}>
          <div className="empty-icon"><IconTarget size={48} /></div>
          <p>No tienes rutinas personalizadas aún.</p>
          <button className="ghost-btn" onClick={() => setTab('presets')}>Ver predeterminadas</button>
        </div>
      ) : (
        <div className="routine-grid">
          {activeRoutines.map(r => {
            const isActive = r.id === activeId
            const dayEntries = Object.entries(r.days ?? {})
            const exCount = dayEntries.reduce((a, [, d]) => a + ((d as any).exercises?.length ?? 0), 0)
            return (
              <article key={r.id} className={`routine-card-premium ${isActive ? 'active' : ''}`}>
                <div className="routine-card-content">
                  <div className="routine-card-header">
                    <div className="routine-card-info">
                      <h4 className="routine-card-title">
                        {r.name}
                        {isActive && <span className="active-badge"><IconCheck size={12} /> Activa</span>}
                      </h4>
                      <p className="routine-card-desc">{r.description || 'Sin descripción'}</p>
                    </div>
                    <div className="routine-card-actions-top">
                      <button className="icon-btn-subtle" onClick={() => setPreviewRoutine(r)} title="Previsualizar" aria-label="Previsualizar rutina">
                        <IconEye size={18} />
                      </button>
                      <button className="icon-btn-subtle" onClick={() => cloneRoutine(r)} title="Clonar" aria-label="Clonar rutina">
                        <IconCopy size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="routine-card-days">
                    {dayEntries.slice(0, 4).map(([d, _day]) => (
                      <span key={d} className="routine-day-pill">
                        {capitalize(d).slice(0, 2)}
                      </span>
                    ))}
                    {dayEntries.length > 4 && <span className="routine-day-pill muted">+{dayEntries.length - 4}</span>}
                  </div>

                  <div className="routine-card-stats">
                    <span><strong>{dayEntries.length}</strong> días</span>
                    <span className="dot-sep" />
                    <span><strong>{exCount}</strong> ejercicios</span>
                  </div>

                  <div className="routine-card-footer">
                    {isActive ? (
                      <button className="primary-btn disabled" disabled>Activa actualmente</button>
                    ) : (
                      <button className="primary-btn-outline" onClick={() => setPendingId(r.id!)}>Activar plan</button>
                    )}
                    {r.isCustom && (
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="icon-btn-danger" onClick={() => deleteRoutine(r.id!)} title="Eliminar" aria-label="Eliminar rutina">
                          <IconTrash size={18} />
                        </button>
                        <button className="icon-btn-accent" onClick={() => navigate(`/rutinas/${r.id}`)} title="Editar" aria-label="Editar rutina">
                          <IconEdit size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Confirmation Panel — portal para escapar overflow de .main */}
      {pendingId && createPortal(
        <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) { setPendingId(null); setClearWeek(false) } }}>
          <div className="side-panel">
            <div className="side-panel-drag-handle" />

            <div className="side-panel-header">
              <div className="side-panel-title-area">
                <h3>Cambiar rutina</h3>
                <p>{pendingRoutineData?.name}</p>
              </div>
              <button className="side-panel-close-btn" onClick={() => { setPendingId(null); setClearWeek(false) }} aria-label="Cerrar">
                <IconClose size={18} />
                <span>Cerrar</span>
              </button>
            </div>

            <div className="side-panel-body">
              <div className="preview-day-card">
                <div className="preview-day-card-head">
                  <span className="preview-day-label">Antes de continuar</span>
                </div>
                <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Tu historial se conserva, pero los registros de la semana actual pueden desincronizarse con la nueva rutina.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-3)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
                    <input type="checkbox" checked={clearWeek} onChange={e => setClearWeek(e.target.checked)} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Limpiar semana actual</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>Recomendado si empiezas un nuevo ciclo de entrenamiento.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="side-panel-footer">
              <button className="primary-btn" onClick={confirmActivate} disabled={activating} style={{ flex: 1, padding: '1rem' }}>
                {activating ? 'Activando...' : 'Confirmar e iniciar'}
              </button>
              <button className="ghost-btn" onClick={() => { setPendingId(null); setClearWeek(false) }} style={{ flex: 0 }}>Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Preview Side Panel — portal para escapar overflow de .main */}
      {createPortal(
      <div className={`side-panel-overlay ${previewRoutine ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setPreviewRoutine(null) }}>
        <div className="side-panel">
          {/* Drag handle visible en móvil */}
          <div className="side-panel-drag-handle" />

          <div className="side-panel-header">
            <div className="side-panel-title-area">
              <h3>{previewRoutine?.name}</h3>
              <p>{previewRoutine?.description || 'Plan de entrenamiento detallado'}</p>
            </div>
            <button className="side-panel-close-btn" onClick={() => setPreviewRoutine(null)} aria-label="Cerrar vista previa">
              <IconClose size={18} />
              <span>Cerrar</span>
            </button>
          </div>

          <div className="side-panel-body">
            {Object.entries(previewRoutine?.days || {}).length === 0 ? (
              <div className="preview-empty-state">
                <p>Esta rutina no tiene días configurados.</p>
              </div>
            ) : (
              Object.entries(previewRoutine?.days || {}).map(([id, day]) => {
                const d = day as any
                const exs: any[] = d.exercises ?? []
                return (
                  <div key={id} className="preview-day-card">
                    <div className="preview-day-card-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="preview-day-label">{capitalize(id)}</span>
                        {d.label && <span className="preview-day-subtitle">{d.label}</span>}
                      </div>
                      <span className="preview-day-badge">{exs.length} ejercicios</span>
                    </div>
                    <div className="preview-day-exercises">
                      {exs.length === 0 ? (
                        <div className="preview-no-exercises">Sin ejercicios configurados</div>
                      ) : exs.map((ex: any, idx: number) => (
                        <div key={idx} className="preview-exercise-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                            <span className="preview-exercise-idx">{idx + 1}</span>
                            <div style={{ minWidth: 0 }}>
                              <div className="preview-exercise-name">{ex.name}</div>
                              {ex.rest > 0 && <div className="preview-exercise-rest">{ex.sets} series · {ex.reps} reps · {ex.rest}s descanso</div>}
                            </div>
                          </div>
                          <div className="preview-exercise-meta">{ex.sets}×{ex.reps}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="side-panel-footer">
            <button
              className="primary-btn"
              style={{ flex: 1, padding: '1rem' }}
              onClick={() => {
                if (previewRoutine) {
                  setPendingId(previewRoutine.id!);
                  setPreviewRoutine(null);
                }
              }}
            >
              Activar este plan
            </button>
            <button className="ghost-btn" style={{ flex: 0 }} onClick={() => setPreviewRoutine(null)}>
              Cerrar
            </button>
          </div>
        </div>
      </div>,
      document.body
      )}
    </div>
  )
}
