import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { usersApi } from '../../api/users'
import { routinesApi } from '../../api/routines'
import { api } from '../../api/client'
import { PRESET_ROUTINES } from '../../lib/presetRoutines'
import type { Routine } from '../../types/domain'
import { IconTarget, IconTrash, IconEdit, IconCopy, IconEye, IconPlus, IconCheck, IconClose, IconDownload } from '../ui/Icons'
import { toast } from '../../lib/toast'
import { motion, AnimatePresence } from 'framer-motion'
import { hapticImpact } from '../../lib/haptics'

function IconShare({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}
function IconGlobe({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface MarketplaceRoutine {
  id: string; name: string; description?: string | null; days: unknown
  downloadCount: number; user: { name: string }
}

export default function Routines() {
  const navigate = useNavigate()
  const { user, setAuth } = useAuthStore()

  const [customRoutines, setCustomRoutines] = useState<Routine[]>([])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [clearWeek, setClearWeek] = useState(false)
  const [activating, setActivating] = useState(false)
  const [tab, setTab] = useState<'presets' | 'custom' | 'mercado'>('presets')
  const [previewRoutine, setPreviewRoutine] = useState<Routine | null>(null)
  const [importCode, setImportCode] = useState('')
  const [importing, setImporting] = useState(false)
  const [marketplaceRoutines, setMarketplaceRoutines] = useState<MarketplaceRoutine[]>([])
  const [loadingMarket, setLoadingMarket] = useState(false)

  const load = () => routinesApi.list().then(data => setCustomRoutines(Array.isArray(data) ? data : [])).catch((err: unknown) => console.warn("[load]", err))
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (tab !== 'mercado' || marketplaceRoutines.length > 0) return
    setLoadingMarket(true)
    api.get<MarketplaceRoutine[]>('/marketplace')
      .then(r => setMarketplaceRoutines(Array.isArray(r.data) ? r.data : []))
      .catch((err: unknown) => console.warn('[marketplace]', err))
      .finally(() => setLoadingMarket(false))
  }, [tab, marketplaceRoutines.length])

  const activeId = user?.activeRoutineId ?? null

  const presets = useMemo(() => Object.values(PRESET_ROUTINES).map(r => ({ ...r, userId: 'preset', isCustom: false, isPreset: true })), [])
  const customs = useMemo(() => (Array.isArray(customRoutines) ? customRoutines : []).map(r => ({ ...r, isPreset: false, isCustom: true, description: r.description ?? '' })), [customRoutines])

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

  async function shareRoutine(id: string) {
    try {
      const r = await api.post<{ shareCode: string }>(`/routines/${id}/share`)
      const code = r.data.shareCode
      await navigator.clipboard.writeText(code)
      toast(`Código copiado: ${code}`)
    } catch {
      toast('Error al generar el enlace', 'error')
    }
  }

  async function togglePublish(r: Routine & { isPublic?: boolean }) {
    try {
      if (r.isPublic) {
        await api.delete(`/routines/${r.id}/publish`)
        toast('Rutina retirada del mercado')
      } else {
        await api.post(`/routines/${r.id}/publish`)
        toast('Rutina publicada en el mercado')
      }
      await load()
    } catch {
      toast('Error al cambiar visibilidad', 'error')
    }
  }

  async function handleImportByCode() {
    const code = importCode.trim().toUpperCase()
    if (!code) return
    setImporting(true)
    try {
      await api.post(`/routines/import/${code}`)
      await load()
      setTab('custom')
      setImportCode('')
      toast('Rutina importada a Mis Creaciones')
    } catch {
      toast('Código inválido o rutina no encontrada', 'error')
    } finally {
      setImporting(false)
    }
  }

  async function cloneMarketplace(id: string) {
    try {
      await api.post(`/marketplace/clone/${id}`)
      await load()
      setTab('custom')
      toast('Rutina añadida a Mis Creaciones')
    } catch {
      toast('Error al clonar la rutina', 'error')
    }
  }

  const activeRoutines = tab === 'presets' ? presets : customs
  const pendingRoutineData = pendingId ? [...presets, ...customs].find(r => r.id === pendingId) : null

  return (
    <div className="routines-wrap">

      {/* ── Header + Tabs ── */}
      <section className="card">
        <div className="panel-head">
          <div>
            <h3>Mis Rutinas</h3>
            <p>Selecciona o crea tu plan de entrenamiento.</p>
          </div>
          <button className="primary-btn" onClick={() => navigate('/rutinas/nueva')}>
            <IconPlus size={16} /> Nueva
          </button>
        </div>

        <div className="routines-tab-bar">
          <button className={`routines-tab-btn${tab === 'presets' ? ' active' : ''}`} onClick={() => setTab('presets')}>
            <IconTarget size={15} /> Predeterminadas
          </button>
          <button className={`routines-tab-btn${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>
            <IconEdit size={15} /> Mis Creaciones
            {customs.length > 0 && <span className="tab-count">{customs.length}</span>}
          </button>
          <button className={`routines-tab-btn${tab === 'mercado' ? ' active' : ''}`} onClick={() => setTab('mercado')}>
            <IconGlobe size={15} /> Mercado
          </button>
        </div>

        {tab === 'custom' && (
          <div className="import-code-row">
            <input
              className="code-input"
              placeholder="Código de rutina (ej. AB3X7Y9Z)"
              value={importCode}
              onChange={e => setImportCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <button className="ghost-btn" onClick={handleImportByCode} disabled={importing || !importCode.trim()}>
              {importing ? '…' : 'Importar'}
            </button>
          </div>
        )}
      </section>

      {/* ── Marketplace ── */}
      {tab === 'mercado' && (
        loadingMarket ? (
          <div className="empty-state"><p>Cargando rutinas...</p></div>
        ) : marketplaceRoutines.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><IconGlobe size={40} /></div>
            <p>No hay rutinas públicas todavía.</p>
            <p className="tiny muted">Publica tu propia rutina desde Mis Creaciones.</p>
          </div>
        ) : (
          <div className="rcard-list">
            {marketplaceRoutines.map(r => {
              const dayEntries = Object.entries((r.days as Record<string, unknown>) ?? {})
              const exCount = dayEntries.reduce((a, [, d]) => a + ((d as { exercises?: unknown[] }).exercises?.length ?? 0), 0)
              return (
                <article key={r.id} className="rcard">
                  <div className="rcard-top">
                    <h4 className="rcard-name">{r.name}</h4>
                    <span className="pill">{dayEntries.length}d</span>
                  </div>
                  <p className="rcard-desc">{r.description || 'Sin descripción'}</p>
                  <p className="tiny muted">{exCount} ejercicios · por {r.user.name} · {r.downloadCount} descargas</p>
                  <button className="primary-btn-outline" style={{ marginTop: 'var(--space-3)' }} onClick={() => cloneMarketplace(r.id)}>
                    <IconDownload size={14} /> Añadir a mis rutinas
                  </button>
                </article>
              )
            })}
          </div>
        )
      )}

      {/* ── Presets & Custom ── */}
      {tab !== 'mercado' && (
        activeRoutines.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><IconTarget size={40} /></div>
            <p>No tienes rutinas personalizadas aún.</p>
            <button className="ghost-btn" onClick={() => setTab('presets')}>Ver predeterminadas</button>
          </div>
        ) : (
          <div className="rcard-list">
            {activeRoutines.map(r => {
              const isActive = r.id === activeId
              const dayEntries = Object.entries(r.days ?? {})
              const exCount = dayEntries.reduce((a, [, d]) => a + ((d as { exercises?: unknown[] }).exercises?.length ?? 0), 0)
              const rExt = r as Routine & { isCustom?: boolean; isPublic?: boolean }
              return (
                <motion.article
                  key={r.id}
                  className={`rcard${isActive ? ' rcard--active' : ''}`}
                  onClick={() => hapticImpact('light')}
                >
                  {/* Name row */}
                  <div className="rcard-top">
                    <h4 className="rcard-name">
                      {r.name}
                      {isActive && <span className="active-badge"><IconCheck size={10} /> Activa</span>}
                    </h4>
                    <span className="pill">{dayEntries.length}d</span>
                  </div>

                  {/* Description */}
                  <p className="rcard-desc">{r.description || 'Sin descripción'}</p>

                  {/* Day pills */}
                  <div className="routine-card-days">
                    {dayEntries.map(([d]) => (
                      <span key={d} className="routine-day-pill">{capitalize(d).slice(0, 2)}</span>
                    ))}
                  </div>

                  {/* Stats */}
                  <p className="tiny muted">{exCount} ejercicios · {dayEntries.length} {dayEntries.length === 1 ? 'día' : 'días'}</p>

                  {/* Actions row */}
                  <div className="rcard-actions">
                    <div className="rcard-icons">
                      <button className="icon-btn-subtle" onClick={e => { e.stopPropagation(); setPreviewRoutine(r) }} title="Vista previa">
                        <IconEye size={15} />
                      </button>
                      <button className="icon-btn-subtle" onClick={e => { e.stopPropagation(); cloneRoutine(r) }} title="Clonar">
                        <IconCopy size={15} />
                      </button>
                      {rExt.isCustom && <>
                        <button className="icon-btn-subtle" onClick={e => { e.stopPropagation(); shareRoutine(r.id!) }} title="Compartir código">
                          <IconShare size={15} />
                        </button>
                        <button
                          className="icon-btn-subtle"
                          onClick={e => { e.stopPropagation(); togglePublish(rExt) }}
                          title={rExt.isPublic ? 'Quitar del mercado' : 'Publicar en mercado'}
                          style={{ color: rExt.isPublic ? 'var(--color-primary)' : undefined }}
                        >
                          <IconGlobe size={15} />
                        </button>
                        <button className="icon-btn-subtle" onClick={e => { e.stopPropagation(); navigate(`/rutinas/${r.id}`) }} title="Editar">
                          <IconEdit size={15} />
                        </button>
                        <button
                          className="icon-btn-subtle"
                          style={{ color: 'var(--color-warning)' }}
                          onClick={e => { e.stopPropagation(); deleteRoutine(r.id!) }}
                          title="Eliminar"
                        >
                          <IconTrash size={15} />
                        </button>
                      </>}
                    </div>
                    <button
                      className={isActive ? 'routine-active-btn' : 'primary-btn-outline'}
                      disabled={isActive}
                      onClick={e => { e.stopPropagation(); if (!isActive) setPendingId(r.id!) }}
                    >
                      {isActive ? <><IconCheck size={13} /> Activa</> : 'Activar'}
                    </button>
                  </div>
                </motion.article>
              )
            })}
          </div>
        )
      )}

      {/* ── Confirmation Bottom Sheet ── */}
      {createPortal(
        <AnimatePresence>
          {pendingId && (
            <motion.div
              className="bottom-sheet-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) { setPendingId(null); setClearWeek(false) } }}
            >
              <motion.div
                className="bottom-sheet"
                drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.4}
                onDragEnd={(_, info) => { if (info.offset.y > 100) { setPendingId(null); setClearWeek(false) } }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <div className="drag-handle"><div className="bottom-sheet-drag" /></div>
                <div className="bottom-sheet-content">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <IconTarget size={18} /> Cambiar rutina
                  </h3>
                  <p className="confirm-sheet-text" style={{ marginBottom: 'var(--space-4)' }}>
                    Vas a activar <strong>{pendingRoutineData?.name}</strong>. Tu historial se conserva, pero los registros de la semana actual pueden desincronizarse.
                  </p>
                  <div className="confirm-option-card" style={{ marginBottom: 'var(--space-5)' }}>
                    <label className="checkbox-container">
                      <input type="checkbox" checked={clearWeek} onChange={e => setClearWeek(e.target.checked)} />
                      <span className="checkmark" />
                      <div className="option-label">
                        <strong>Limpiar semana actual</strong>
                        <p>Recomendado si empiezas un nuevo ciclo de entrenamiento.</p>
                      </div>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button className="ghost-btn" onClick={() => { setPendingId(null); setClearWeek(false) }} style={{ flex: 1 }}>Cancelar</button>
                    <button className="primary-btn" onClick={confirmActivate} disabled={activating} style={{ flex: 2 }}>
                      {activating ? 'Activando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Preview Bottom Sheet ── */}
      {createPortal(
        <AnimatePresence>
          {previewRoutine && (
            <motion.div
              className="bottom-sheet-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => e.target === e.currentTarget && setPreviewRoutine(null)}
            >
              <motion.div
                className="bottom-sheet"
                drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.4}
                onDragEnd={(_, info) => { if (info.offset.y > 100) setPreviewRoutine(null) }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <div className="drag-handle"><div className="bottom-sheet-drag" /></div>
                <div className="bottom-sheet-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <div>
                      <h3>{previewRoutine.name}</h3>
                      <p className="tiny muted">{previewRoutine.description || 'Plan de entrenamiento'}</p>
                    </div>
                    <button className="icon-btn-subtle" onClick={() => setPreviewRoutine(null)}>
                      <IconClose size={20} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {Object.entries(previewRoutine.days || {}).map(([id, day]) => {
                      const d = day as unknown as { label?: string; exercises?: { name: string; sets: number; reps: number; rest: number }[] }
                      return (
                        <div key={id} className="preview-day-card">
                          <div className="preview-day-card-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span className="preview-day-label">{capitalize(id)}</span>
                              <span className="preview-day-badge">{d.exercises?.length ?? 0} ejercicios</span>
                            </div>
                            <span className="preview-day-subtitle">{d.label}</span>
                          </div>
                          <div className="preview-day-exercises">
                            {d.exercises?.map((ex, idx) => (
                              <div key={idx} className="preview-exercise-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                                  <span className="preview-exercise-idx">{idx + 1}</span>
                                  <div style={{ minWidth: 0 }}>
                                    <div className="preview-exercise-name">{ex.name}</div>
                                    {ex.rest > 0 && <div className="preview-exercise-rest">{ex.rest}s descanso</div>}
                                  </div>
                                </div>
                                <div className="preview-exercise-meta">{ex.sets}×{ex.reps}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    className="primary-btn"
                    style={{ width: '100%', padding: '1rem', marginTop: 'var(--space-4)' }}
                    onClick={() => { setPendingId(previewRoutine.id!); setPreviewRoutine(null) }}
                  >
                    Activar este plan ahora
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
