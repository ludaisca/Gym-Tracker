import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { challengesApi, type Challenge, type VersusData } from '../../api/challenges'
import { useAuthStore } from '../../store'
import { IconTrophy, IconCamera, IconStats, IconCheck, IconClose, IconUser, IconCopy, IconFire } from '../ui/Icons'
import { toast } from '../../lib/toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const total = Math.ceil((end - start) / 86400000)
  const remaining = Math.max(0, Math.ceil((end - now) / 86400000))
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
  return { total, remaining, pct, startLabel: new Date(startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }), endLabel: new Date(endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) }
}

async function shareOrCopy(code: string) {
  const text = `Únete a mi reto en Gym Tracker con el código: ${code}`
  if (navigator.share) {
    try { await navigator.share({ title: 'Reto · Gym Tracker', text }) } catch { /* canceló */ }
  } else {
    try { await navigator.clipboard.writeText(code); toast('¡Código copiado!') } catch { toast('No se pudo copiar', 'error') }
  }
}

const TYPE_LABELS: Record<string, string> = { checkin: 'Asistencia', versus: 'Pesos', both: 'Completo' }

function Avatar({ user }: { user: { name: string; avatar?: string } }) {
  if (user.avatar) return <img src={user.avatar} alt={user.name} className="duel-avatar" />
  return (
    <div className="duel-vs-avatar">
      <IconUser size={18} />
    </div>
  )
}

// ── Canvas watermark ──────────────────────────────────────────────────────────
async function captureWithWatermark(videoEl: HTMLVideoElement, userName: string, hash: string): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth || 640
  canvas.height = videoEl.videoHeight || 480
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoEl, 0, 0)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, canvas.height - 56, canvas.width, 56)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px monospace'
  ctx.fillText(`${userName} · ${new Date().toLocaleString('es-MX')}`, 12, canvas.height - 32)
  ctx.font = '11px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText(`ID: ${hash || 'pendiente'}`, 12, canvas.height - 12)
  return canvas.toDataURL('image/jpeg', 0.85)
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onCreateOpen, onJoinOpen }: { onCreateOpen: () => void; onJoinOpen: () => void }) {
  return (
    <div className="card duel-empty-card">
      <div className="duel-empty-icon"><IconTrophy size={48} /></div>
      <h2>Duelos</h2>
      <p className="muted" style={{ maxWidth: 380, margin: 'var(--space-2) auto var(--space-6)', lineHeight: 1.6 }}>
        Reta a un amigo, registra tu asistencia con foto validada y compara pesos. ¡El más constante gana!
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="primary-btn" onClick={onCreateOpen}>+ Crear reto</button>
        <button className="ghost-btn" onClick={onJoinOpen}>Unirme con código</button>
      </div>
      <div className="duel-features">
        {[
          { icon: <IconCamera size={20} />, t: 'Check-in validado', d: 'Foto con marca de agua y hora del servidor' },
          { icon: <IconStats size={20} />,  t: 'VERSUS pesos',       d: 'Compara 1RM estimado por ejercicio' },
          { icon: <IconFire size={20} />,   t: 'Constancia',          d: 'Días de asistencia en el período del reto' },
        ].map(f => (
          <div key={f.t} className="day-card duel-feature-card">
            <div className="duel-feature-icon">{f.icon}</div>
            <div className="duel-feature-title">{f.t}</div>
            <div className="tiny muted">{f.d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ChallengeCard ─────────────────────────────────────────────────────────────
function ChallengeCard({ challenge, myId, onCheckIn, onVersus, onSelect }: {
  challenge: Challenge; myId: string
  onCheckIn: (c: Challenge) => void
  onVersus: (c: Challenge) => void
  onSelect: (c: Challenge) => void
}) {
  const isCreator = challenge.creator.id === myId
  const rival = isCreator ? challenge.opponent : challenge.creator
  const myStats = isCreator ? challenge.stats?.creator : challenge.stats?.opponent
  const rivalStats = isCreator ? challenge.stats?.opponent : challenge.stats?.creator
  const today = new Date().toISOString().slice(0, 10)
  const todayCheckedIn = myStats?.dates.includes(today) ?? false
  const rivalCheckedInToday = rivalStats?.dates.includes(today) ?? false
  const period = calcPeriod(challenge.startDate, challenge.endDate)

  const isFinished = challenge.status === 'finished' || (period && period.remaining === 0)
  const myScore = myStats?.checkInDays ?? 0
  const rivalScore = rivalStats?.checkInDays ?? 0
  const iWin = myScore > rivalScore
  const tied = myScore === rivalScore

  return (
    <article className="card duel-card">
      <div className="panel-head">
        <div className="duel-card-head-meta">
          <h3>Reto #{challenge.code}</h3>
          <span className="duel-type-badge">{TYPE_LABELS[challenge.type]}</span>
        </div>
        <button className="ghost-btn duel-detail-btn" onClick={() => onSelect(challenge)}>
          Ver detalle
        </button>
      </div>

      {/* Barra de progreso del período */}
      {challenge.status === 'active' && period && (
        <div className="duel-period-bar">
          <div className="duel-period-bar-labels">
            <span>{period.startLabel}</span>
            <span>{period.remaining > 0 ? `${period.remaining} días restantes` : 'Finalizado'}</span>
            <span>{period.endLabel}</span>
          </div>
          <div className="progress"><span style={{ width: `${period.pct}%` }} /></div>
        </div>
      )}

      {/* Estado: pendiente */}
      {challenge.status === 'pending' && (
        <div className="duel-pending-code">
          <div className="duel-pending-code-val">{challenge.code}</div>
          <div className="tiny muted" style={{ marginTop: 'var(--space-1)' }}>Comparte este código con tu amigo</div>
          <button className="ghost-btn duel-share-btn" onClick={() => shareOrCopy(challenge.code)}>
            <IconCopy size={14} /> Compartir código
          </button>
        </div>
      )}

      {/* Marcador VS */}
      {challenge.status === 'active' && rival && (
        <div className="duel-vs-bar">
          <div className="duel-vs-side">
            <Avatar user={{ name: 'Yo' }} />
            <div className="duel-vs-score">{myScore}</div>
            <div className="tiny muted">Tú</div>
            {todayCheckedIn && <span className="duel-today-badge">✓ hoy</span>}
          </div>
          <div className="duel-vs-label">VS</div>
          <div className="duel-vs-side">
            <Avatar user={rival} />
            <div className="duel-vs-score">{rivalScore}</div>
            <div className="duel-vs-name tiny muted">{rival.name}</div>
            {rivalCheckedInToday && <span className="duel-today-badge">✓ hoy</span>}
          </div>
        </div>
      )}

      {/* Banner de ganador */}
      {isFinished && challenge.stats && (
        <div className="duel-winner-banner">
          <IconTrophy size={14} />
          {tied ? 'Empate — igual de constantes 🤝' : iWin ? '¡Ganaste este reto! 🎉' : `Ganó ${rival?.name ?? 'tu rival'}`}
        </div>
      )}

      {/* Acciones */}
      {challenge.status === 'active' && (
        <div className="duel-card-actions">
          <button
            className={todayCheckedIn ? 'ghost-btn' : 'primary-btn'}
            onClick={() => onCheckIn(challenge)}
            disabled={todayCheckedIn}
          >
            {todayCheckedIn
              ? <><IconCheck size={14} /> Check-in hecho</>
              : <><IconCamera size={14} /> Registrar asistencia</>
            }
          </button>
          {(challenge.type === 'versus' || challenge.type === 'both') && (
            <button className="ghost-btn" onClick={() => onVersus(challenge)}>
              <IconStats size={14} /> VERSUS
            </button>
          )}
        </div>
      )}
    </article>
  )
}

// ── CheckIn Modal ─────────────────────────────────────────────────────────────
function CheckInModal({ challenge, userName, onClose, onDone }: {
  challenge: Challenge; userName: string; onClose: () => void; onDone: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'camera' | 'confirm'>('camera')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setError('No se pudo acceder a la cámara. Verifica los permisos.'))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function capture() {
    if (!videoRef.current) return
    const dataUrl = await captureWithWatermark(videoRef.current, userName, '')
    setPreview(dataUrl)
    setStep('confirm')
    stream?.getTracks().forEach(t => t.stop())
  }

  async function confirm() {
    if (!preview) return
    setLoading(true)
    setError('')
    try {
      let lat: number | undefined, lng: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        )
        lat = pos.coords.latitude; lng = pos.coords.longitude
      } catch { /* GPS opcional */ }
      await challengesApi.checkin(challenge.id, preview, lat, lng)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar asistencia')
    } finally { setLoading(false) }
  }

  return createPortal(
    <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="side-panel">
        <div className="side-panel-drag-handle" />
        <div className="side-panel-header">
          <div className="side-panel-title-area">
            <h3>Check-in al gym</h3>
            <p>{challenge.code} · {step === 'camera' ? 'Toma tu foto' : 'Confirma la foto'}</p>
          </div>
          <button className="side-panel-close-btn" onClick={onClose} aria-label="Cerrar">
            <IconClose size={18} /><span>Cerrar</span>
          </button>
        </div>

        <div className="side-panel-body">
          {error && <p className="duel-modal-error">{error}</p>}

          {step === 'camera' && (
            <div className="preview-day-card">
              <div className="preview-day-card-head">
                <span className="preview-day-label">Cámara</span>
                <span className="preview-day-badge">Se añadirá marca de agua</span>
              </div>
              <div style={{ padding: 'var(--space-3)' }}>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: '#000', aspectRatio: '4/3', objectFit: 'cover' }}
                />
                <p className="tiny muted" style={{ marginTop: 'var(--space-2)', textAlign: 'center' }}>
                  La foto incluirá: nombre, hora del servidor y código de validación.
                </p>
              </div>
            </div>
          )}

          {step === 'confirm' && preview && (
            <div className="preview-day-card">
              <div className="preview-day-card-head">
                <span className="preview-day-label">Vista previa</span>
              </div>
              <div style={{ padding: 'var(--space-3)' }}>
                <img src={preview} alt="Vista previa" style={{ width: '100%', borderRadius: 'var(--radius-lg)' }} />
              </div>
            </div>
          )}
        </div>

        <div className="side-panel-footer">
          {step === 'camera' ? (
            <button className="primary-btn" onClick={capture} disabled={!stream} style={{ flex: 1 }}>
              <IconCamera size={18} /> Tomar foto
            </button>
          ) : (
            <>
              <button className="ghost-btn" onClick={() => { setPreview(null); setStep('camera') }}>Repetir</button>
              <button className="primary-btn" style={{ flex: 1 }} onClick={confirm} disabled={loading}>
                {loading ? 'Enviando…' : <><IconCheck size={16} /> Confirmar</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Versus Modal ──────────────────────────────────────────────────────────────
function VersusModal({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  const [data, setData] = useState<VersusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    challengesApi.versus(challenge.id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [challenge.id])

  return createPortal(
    <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="side-panel">
        <div className="side-panel-drag-handle" />
        <div className="side-panel-header">
          <div className="side-panel-title-area">
            <h3>VERSUS</h3>
            <p>Código · {challenge.code}</p>
          </div>
          <button className="side-panel-close-btn" onClick={onClose} aria-label="Cerrar">
            <IconClose size={18} /><span>Cerrar</span>
          </button>
        </div>

        <div className="side-panel-body">
          {loading && <div className="duel-modal-spinner"><div className="spinner" /></div>}
          {error && <p className="duel-modal-error">{error}</p>}

          {data && (
            <>
              <div className="duel-detail-stats">
                <div className="card kpi">
                  <div className="kpi-label">{challenge.creator.name}</div>
                  <div className="kpi-value">{data.creatorSessions}</div>
                  <div className="kpi-meta">sesiones</div>
                </div>
                <div className="card kpi">
                  <div className="kpi-label">{challenge.opponent?.name ?? '—'}</div>
                  <div className="kpi-value">{data.opponentSessions}</div>
                  <div className="kpi-meta">sesiones</div>
                </div>
              </div>

              {data.versus.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><IconStats size={28} /></div>
                  <p>Aún no hay datos de ejercicios para comparar.</p>
                </div>
              ) : (
                <div className="preview-day-card">
                  <div className="preview-day-card-head">
                    <span className="preview-day-label">Ejercicios</span>
                    <span className="preview-day-badge">{data.versus.length}</span>
                  </div>
                  <div className="preview-day-exercises duel-versus-list">
                    {data.versus.map(row => {
                      const creatorWins = (row.creator?.oneRM ?? 0) >= (row.opponent?.oneRM ?? 0)
                      return (
                        <div key={row.exercise} className="duel-versus-row">
                          <div className="duel-versus-left">
                            <div className={`duel-versus-score${creatorWins ? ' winner' : ''}`}>
                              {row.creator ? `${row.creator.weight}kg × ${row.creator.reps}` : '—'}
                            </div>
                            {row.creator && <div className="tiny muted">1RM ~{row.creator.oneRM}kg</div>}
                          </div>
                          <div className="duel-versus-center">
                            <div className="duel-versus-exname">{row.exercise}</div>
                            <div className="tiny muted">VS</div>
                          </div>
                          <div className="duel-versus-right">
                            <div className={`duel-versus-score${!creatorWins ? ' winner' : ''}`}>
                              {row.opponent ? `${row.opponent.weight}kg × ${row.opponent.reps}` : '—'}
                            </div>
                            {row.opponent && <div className="tiny muted">1RM ~{row.opponent.oneRM}kg</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ challenge, myId, onClose }: { challenge: Challenge; myId: string; onClose: () => void }) {
  const isCreator = challenge.creator.id === myId
  const myStats = isCreator ? challenge.stats?.creator : challenge.stats?.opponent
  const rivalStats = isCreator ? challenge.stats?.opponent : challenge.stats?.creator
  const rival = isCreator ? challenge.opponent : challenge.creator
  const period = calcPeriod(challenge.startDate, challenge.endDate)

  const myScore = myStats?.checkInDays ?? 0
  const rivalScore = rivalStats?.checkInDays ?? 0
  const iWin = myScore > rivalScore
  const tied = myScore === rivalScore

  return createPortal(
    <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="side-panel">
        <div className="side-panel-drag-handle" />
        <div className="side-panel-header">
          <div className="side-panel-title-area">
            <h3>Reto #{challenge.code}</h3>
            <p>{TYPE_LABELS[challenge.type]} · {challenge.status === 'active' ? 'En curso' : challenge.status === 'finished' ? 'Finalizado' : 'Pendiente'}</p>
          </div>
          <button className="side-panel-close-btn" onClick={onClose} aria-label="Cerrar">
            <IconClose size={18} /><span>Cerrar</span>
          </button>
        </div>

        <div className="side-panel-body">
          {/* Período con barra */}
          {period && (
            <div className="preview-day-card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="preview-day-card-head">
                <span className="preview-day-label">Período</span>
                <span className="preview-day-badge">{period.total} días</span>
              </div>
              <div style={{ padding: 'var(--space-4)' }}>
                <div className="progress"><span style={{ width: `${period.pct}%` }} /></div>
                <div className="duel-period-bar-labels" style={{ marginTop: 'var(--space-1)', marginBottom: 0 }}>
                  <span>{period.startLabel}</span>
                  <span>{period.remaining > 0 ? `${period.remaining} días restantes` : 'Terminado'}</span>
                  <span>{period.endLabel}</span>
                </div>
              </div>
            </div>
          )}

          {/* Resultado si finalizó */}
          {challenge.status === 'finished' && challenge.stats && (
            <div className="duel-winner-banner" style={{ borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)', border: '1px solid var(--color-primary)' }}>
              <IconTrophy size={16} />
              {tied ? 'Empate — igual de constantes 🤝' : iWin ? '¡Ganaste este reto! 🎉' : `Ganó ${rival?.name ?? 'tu rival'}`}
            </div>
          )}

          {/* Stats */}
          {challenge.stats && (
            <div className="duel-detail-stats">
              <div className="card kpi">
                <div className="kpi-label">Yo</div>
                <div className="kpi-value">{myScore}</div>
                <div className="kpi-meta">check-ins</div>
              </div>
              <div className="card kpi">
                <div className="kpi-label">{rival?.name ?? 'Rival'}</div>
                <div className="kpi-value">{rivalScore}</div>
                <div className="kpi-meta">check-ins</div>
              </div>
            </div>
          )}

          {/* Mis check-ins */}
          {(myStats?.dates?.length ?? 0) > 0 && (
            <div className="preview-day-card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="preview-day-card-head">
                <span className="preview-day-label">Mis check-ins</span>
                <span className="preview-day-badge">{myStats!.dates.length}</span>
              </div>
              <div style={{ padding: 'var(--space-4)' }}>
                <div className="duel-checkin-dates">
                  {[...myStats!.dates].sort().map(d => (
                    <span key={d} className="duel-checkin-date">{d.slice(5)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Check-ins del rival */}
          {(rivalStats?.dates?.length ?? 0) > 0 && (
            <div className="preview-day-card">
              <div className="preview-day-card-head">
                <span className="preview-day-label">Check-ins de {rival?.name ?? 'rival'}</span>
                <span className="preview-day-badge">{rivalStats!.dates.length}</span>
              </div>
              <div style={{ padding: 'var(--space-4)' }}>
                <div className="duel-checkin-dates">
                  {[...rivalStats!.dates].sort().map(d => (
                    <span key={d} className="duel-checkin-date">{d.slice(5)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="side-panel-footer">
          <button className="ghost-btn" style={{ flex: 0 }} onClick={() => shareOrCopy(challenge.code)}>
            <IconCopy size={16} /> Compartir código
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [7, 14, 30, 60]

export default function Duelos() {
  const { user } = useAuthStore()
  const myId = user?.id ?? ''

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [createType, setCreateType] = useState<'checkin' | 'versus' | 'both'>('both')
  const [createDuration, setCreateDuration] = useState(30)
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{ code: string } | null>(null)

  const [checkInTarget, setCheckInTarget] = useState<Challenge | null>(null)
  const [versusTarget, setVersusTarget] = useState<Challenge | null>(null)
  const [detailTarget, setDetailTarget] = useState<Challenge | null>(null)

  async function load() {
    try {
      setChallenges(await challengesApi.list())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar retos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    setCreateLoading(true)
    try {
      const res = await challengesApi.create(createType, createDuration)
      setCreateResult({ code: res.code })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear reto')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleJoin() {
    if (joinCode.length !== 6) return
    setJoinLoading(true)
    setJoinError('')
    try {
      await challengesApi.join(joinCode.toUpperCase())
      setShowJoin(false)
      setJoinCode('')
      await load()
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Error al unirse')
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) return <div className="content"><div className="spinner" /></div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="duel-view-header">
        <span className="duel-view-count">
          {challenges.length} reto{challenges.length !== 1 ? 's' : ''}
        </span>
        <div className="duel-view-actions">
          <button className="primary-btn" onClick={() => { setShowCreate(true); setCreateResult(null) }}>
            + Crear reto
          </button>
          <button className="ghost-btn" onClick={() => setShowJoin(true)}>
            Unirme
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {challenges.length === 0
        ? <EmptyState onCreateOpen={() => setShowCreate(true)} onJoinOpen={() => setShowJoin(true)} />
        : (
          <div className="duel-list">
            {challenges.map(c => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                myId={myId}
                onCheckIn={setCheckInTarget}
                onVersus={setVersusTarget}
                onSelect={setDetailTarget}
              />
            ))}
          </div>
        )
      }

      {/* Modal: Crear reto */}
      {showCreate && createPortal(
        <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowCreate(false); setCreateResult(null) } }}>
          <div className="side-panel">
            <div className="side-panel-drag-handle" />
            <div className="side-panel-header">
              <div className="side-panel-title-area">
                <h3>{createResult ? '¡Reto creado!' : 'Nuevo reto'}</h3>
                <p>{createResult ? 'Comparte el código con tu amigo' : 'Elige el tipo y la duración'}</p>
              </div>
              <button className="side-panel-close-btn" onClick={() => { setShowCreate(false); setCreateResult(null) }} aria-label="Cerrar">
                <IconClose size={18} /><span>Cerrar</span>
              </button>
            </div>

            <div className="side-panel-body">
              {!createResult ? (
                <>
                  <div className="preview-day-card" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="preview-day-card-head">
                      <span className="preview-day-label">Tipo de reto</span>
                    </div>
                    <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
                      <div className="duel-type-selector">
                        {([
                          { val: 'both',    icon: <IconTrophy size={20} />, lbl: 'Completo'   },
                          { val: 'checkin', icon: <IconCamera size={20} />, lbl: 'Asistencia' },
                          { val: 'versus',  icon: <IconStats size={20} />,  lbl: 'Pesos'      },
                        ] as const).map(({ val, icon, lbl }) => (
                          <button key={val} className={`duel-type-btn${createType === val ? ' active' : ''}`} onClick={() => setCreateType(val)}>
                            {icon}
                            {lbl}
                          </button>
                        ))}
                      </div>
                      <p className="tiny muted" style={{ lineHeight: 1.6 }}>
                        Se generará un código de 6 caracteres que deberás compartir con tu amigo.
                      </p>
                    </div>
                  </div>

                  <div className="preview-day-card">
                    <div className="preview-day-card-head">
                      <span className="preview-day-label">Duración</span>
                    </div>
                    <div style={{ padding: 'var(--space-4)' }}>
                      <div className="duel-duration-selector">
                        {DURATION_OPTIONS.map(d => (
                          <button key={d} className={`duel-duration-btn${createDuration === d ? ' active' : ''}`} onClick={() => setCreateDuration(d)}>
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="preview-day-card">
                  <div className="preview-day-card-head">
                    <span className="preview-day-label">Código del reto</span>
                  </div>
                  <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
                      <IconTrophy size={40} />
                    </div>
                    <div className="duel-code-display">
                      <div className="duel-code-big">{createResult.code}</div>
                    </div>
                    <p className="tiny muted">Tu amigo debe ingresar este código en "Unirme a reto"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="side-panel-footer">
              {!createResult ? (
                <button className="primary-btn" onClick={handleCreate} disabled={createLoading} style={{ flex: 1 }}>
                  {createLoading ? 'Creando…' : 'Crear reto'}
                </button>
              ) : (
                <>
                  <button className="ghost-btn" style={{ flex: 0 }} onClick={() => shareOrCopy(createResult.code)}>
                    <IconCopy size={16} /> Compartir
                  </button>
                  <button className="primary-btn" style={{ flex: 1 }} onClick={() => { setShowCreate(false); setCreateResult(null) }}>
                    Listo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Unirse */}
      {showJoin && createPortal(
        <div className="side-panel-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowJoin(false) }}>
          <div className="side-panel">
            <div className="side-panel-drag-handle" />
            <div className="side-panel-header">
              <div className="side-panel-title-area">
                <h3>Unirme a reto</h3>
                <p>Ingresa el código que te compartió tu amigo</p>
              </div>
              <button className="side-panel-close-btn" onClick={() => setShowJoin(false)} aria-label="Cerrar">
                <IconClose size={18} /><span>Cerrar</span>
              </button>
            </div>

            <div className="side-panel-body">
              <div className="preview-day-card">
                <div className="preview-day-card-head">
                  <span className="preview-day-label">Código del reto</span>
                  <span className="preview-day-badge">6 caracteres</span>
                </div>
                <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="EJ: AB3X7Y"
                    className="duel-code-input"
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    autoFocus
                  />
                  {joinError && <p className="duel-modal-error">{joinError}</p>}
                </div>
              </div>
            </div>

            <div className="side-panel-footer">
              <button className="ghost-btn" onClick={() => setShowJoin(false)}>Cancelar</button>
              <button className="primary-btn" style={{ flex: 1 }} onClick={handleJoin} disabled={joinLoading || joinCode.length !== 6}>
                {joinLoading ? 'Uniéndome…' : 'Unirme al reto'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {checkInTarget && (
        <CheckInModal
          challenge={checkInTarget}
          userName={user?.name ?? 'Usuario'}
          onClose={() => setCheckInTarget(null)}
          onDone={async () => { setCheckInTarget(null); await load() }}
        />
      )}

      {versusTarget && <VersusModal challenge={versusTarget} onClose={() => setVersusTarget(null)} />}
      {detailTarget && <DetailModal challenge={detailTarget} myId={myId} onClose={() => setDetailTarget(null)} />}
    </div>
  )
}
