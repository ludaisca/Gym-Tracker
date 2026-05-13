import { useState, useEffect, useRef } from 'react'
import { challengesApi, type Challenge, type VersusData } from '../../api/challenges'
import { useAuthStore } from '../../store'
import { IconTrophy, IconCamera, IconStats, IconCheck } from '../ui/Icons'

// ── Canvas watermark helper ──────────────────────────────────────────────
async function captureWithWatermark(
  videoEl: HTMLVideoElement,
  userName: string,
  hash: string
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth || 640
  canvas.height = videoEl.videoHeight || 480
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoEl, 0, 0)
  // Watermark bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, canvas.height - 56, canvas.width, 56)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px monospace'
  const now = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
  ctx.fillText(`${userName} · ${now}`, 12, canvas.height - 32)
  ctx.font = '11px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText(`ID: ${hash || 'pendiente'}`, 12, canvas.height - 12)
  return canvas.toDataURL('image/jpeg', 0.85)
}

// ── Sub-components ────────────────────────────────────────────────────────
function EmptyState({ onCreateOpen, onJoinOpen }: { onCreateOpen: () => void; onJoinOpen: () => void }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
        <IconTrophy size={48} style={{ color: 'var(--color-primary)' }} />
      </div>
      <h2 style={{ marginBottom: '.5rem' }}>Duelos</h2>
      <p className="muted" style={{ maxWidth: 400, margin: '0 auto 2rem', lineHeight: 1.6 }}>
        Reta a un amigo, registra tu asistencia al gym con foto validada
        y compara pesos y repeticiones. ¡El más constante gana!
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="primary-btn" onClick={onCreateOpen}>+ Crear reto</button>
        <button className="ghost-btn" onClick={onJoinOpen}>Unirme con código</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '1rem', maxWidth: 520, margin: '2rem auto 0' }}>
        {[
          { icon: <IconCamera size={20} />, t: 'Check-in validado', d: 'Foto con marca de agua y hora del servidor' },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, t: 'VERSUS pesos', d: 'Compara 1RM estimado por ejercicio' },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-4 4-4 9a4 4 0 0 0 8 0c0-5-4-9-4-9Z"/><path d="M12 11a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z"/></svg>, t: 'Constancia', d: 'Días de asistencia en el período del reto' },
        ].map(f => (
          <div key={f.t} className="day-card" style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '.4rem', color: 'var(--color-primary)' }}>{f.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 4 }}>{f.t}</div>
            <div className="tiny muted">{f.d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChallengeCard({
  challenge,
  myId,
  onCheckIn,
  onVersus,
  onSelect,
}: {
  challenge: Challenge
  myId: string
  onCheckIn: (c: Challenge) => void
  onVersus: (c: Challenge) => void
  onSelect: (c: Challenge) => void
}) {
  const isCreator = challenge.creator.id === myId
  const me = isCreator ? challenge.creator : challenge.opponent!
  const rival = isCreator ? challenge.opponent : challenge.creator
  const myStats = isCreator ? challenge.stats?.creator : challenge.stats?.opponent
  const rivalStats = isCreator ? challenge.stats?.opponent : challenge.stats?.creator
  const todayCheckedIn = myStats?.dates.includes(new Date().toISOString().slice(0, 10)) ?? false

  const days = challenge.startDate
    ? Math.ceil((new Date(challenge.endDate ?? Date.now()).getTime() - Date.now()) / 86400000)
    : null

  return (
    <article className="card" style={{ overflow: 'hidden' }}>
      <div className="panel-head">
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            {challenge.status === 'pending'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v8a6 6 0 0 1-12 0V4Z"/><path d="M6 8H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4"/><path d="M18 8h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
            }
            Reto #{challenge.code}
          </h3>
          <p>
            {challenge.status === 'pending'
              ? 'Esperando oponente…'
              : days !== null
                ? `${days > 0 ? `${days} días restantes` : 'Finalizado'}`
                : 'Activo'}
          </p>
        </div>
        <button className="ghost-btn" style={{ padding: '.4rem .8rem', fontSize: 'var(--text-xs)', flexShrink: 0 }} onClick={() => onSelect(challenge)}>
          Ver detalle
        </button>
      </div>

      {challenge.status === 'active' && rival && (
        <div className="duel-vs-bar">
          {/* Me */}
          <div className="duel-vs-side">
            <div className="duel-vs-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-xl)', fontFamily: 'var(--font-mono)' }}>{myStats?.checkInDays ?? 0}</div>
            <div className="tiny muted">Tú</div>
          </div>
          <div className="duel-vs-label">VS</div>
          {/* Rival */}
          <div className="duel-vs-side">
            <div className="duel-vs-avatar" style={{ background: 'var(--color-surface-offset)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-xl)', fontFamily: 'var(--font-mono)' }}>{rivalStats?.checkInDays ?? 0}</div>
            <div className="tiny muted" style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rival.name}</div>
          </div>
        </div>
      )}

      {challenge.status === 'pending' && (
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '.15em', color: 'var(--color-primary)' }}>{challenge.code}</div>
            <div className="tiny muted" style={{ marginTop: '.3rem' }}>Comparte este código con tu amigo</div>
          </div>
        </div>
      )}

      {challenge.status === 'active' && (
        <div className="duel-card-actions">
          <button
            className={todayCheckedIn ? 'ghost-btn' : 'primary-btn'}
            style={{ flex: 1, padding: '.65rem .8rem', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}
            onClick={() => onCheckIn(challenge)}
            disabled={todayCheckedIn}
          >
            {todayCheckedIn
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Check-in hecho</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg> Registrar asistencia</>
            }
          </button>
          {(challenge.type === 'versus' || challenge.type === 'both') && (
            <button
              className="ghost-btn"
              style={{ flex: 1, padding: '.65rem .8rem', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}
              onClick={() => onVersus(challenge)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              VERSUS
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function CheckInModal({
  challenge,
  userName,
  onClose,
  onDone,
}: {
  challenge: Challenge
  userName: string
  onClose: () => void
  onDone: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'camera' | 'confirm'>('camera')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => {
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
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
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch { /* GPS opcional */ }
      await challengesApi.checkin(challenge.id, preview, lat, lng)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar asistencia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <IconCamera size={18} /> Check-in al gym
          </h3>
          <button onClick={onClose} style={{ fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {step === 'camera' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: '#000', aspectRatio: '4/3', objectFit: 'cover' }}
              />
              <p className="tiny muted" style={{ marginTop: '.5rem', textAlign: 'center' }}>
                La foto incluirá: nombre, hora del servidor y código de validación.
              </p>
              <button className="primary-btn" style={{ width: '100%', marginTop: '1rem' }} onClick={capture} disabled={!stream}>
                Tomar foto
              </button>
            </>
          )}

          {step === 'confirm' && preview && (
            <>
              <img src={preview} alt="Vista previa" style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="ghost-btn" style={{ flex: 1 }} onClick={() => { setPreview(null); setStep('camera') }}>
                  Repetir
                </button>
                <button className="primary-btn" style={{ flex: 1 }} onClick={confirm} disabled={loading}>
                  {loading ? 'Enviando…' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem' }}>Confirmar <IconCheck size={16} /></span>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function VersusModal({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  const [data, setData] = useState<VersusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    challengesApi.versus(challenge.id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [challenge.id])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            VERSUS · {challenge.code}
          </h3>
          <button onClick={onClose} style={{ fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>
        <div className="modal-body">
          {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>}
          {error && <div className="form-error">{error}</div>}
          {data && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card kpi"><div className="kpi-label">{challenge.creator.name}</div><div className="kpi-value">{data.creatorSessions}</div><div className="kpi-meta">sesiones</div></div>
                <div className="card kpi"><div className="kpi-label">{challenge.opponent?.name ?? '—'}</div><div className="kpi-value">{data.opponentSessions}</div><div className="kpi-meta">sesiones</div></div>
              </div>

              {data.versus.length === 0 ? (
                <div className="empty-state"><span className="empty-icon" style={{ display: 'inline-flex' }}><IconStats size={28} /></span><p>Aún no hay datos de ejercicios para comparar.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {data.versus.map(row => {
                    const creatorWins = (row.creator?.oneRM ?? 0) >= (row.opponent?.oneRM ?? 0)
                    return (
                      <div key={row.exercise} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: creatorWins ? 'var(--color-primary)' : undefined }}>
                            {row.creator ? `${row.creator.weight}kg × ${row.creator.reps}` : '—'}
                          </span>
                          {row.creator && <div className="tiny muted">1RM ~{row.creator.oneRM}kg</div>}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{row.exercise}</div>
                          <div className="tiny muted">VS</div>
                        </div>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: !creatorWins ? 'var(--color-primary)' : undefined }}>
                            {row.opponent ? `${row.opponent.weight}kg × ${row.opponent.reps}` : '—'}
                          </span>
                          {row.opponent && <div className="tiny muted">1RM ~{row.opponent.oneRM}kg</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────
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
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{ code: string } | null>(null)

  const [checkInTarget, setCheckInTarget] = useState<Challenge | null>(null)
  const [versusTarget, setVersusTarget] = useState<Challenge | null>(null)

  async function load() {
    try {
      const data = await challengesApi.list()
      setChallenges(data)
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
      const res = await challengesApi.create(createType)
      setCreateResult({ code: res.code })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
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
      setJoinError(e instanceof Error ? e.message : 'Error')
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) return <div className="content"><div className="spinner" /></div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.25rem' }}>
            {challenges.length} reto{challenges.length !== 1 ? 's' : ''} activo{challenges.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="primary-btn" style={{ padding: '.6rem 1rem', fontSize: 'var(--text-sm)' }} onClick={() => { setShowCreate(true); setCreateResult(null) }}>
            + Crear reto
          </button>
          <button className="ghost-btn" style={{ padding: '.6rem 1rem', fontSize: 'var(--text-sm)' }} onClick={() => setShowJoin(true)}>
            Unirme
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {challenges.length === 0
        ? <EmptyState onCreateOpen={() => setShowCreate(true)} onJoinOpen={() => setShowJoin(true)} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {challenges.map(c => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                myId={myId}
                onCheckIn={setCheckInTarget}
                onVersus={setVersusTarget}
                onSelect={() => {}}
              />
            ))}
          </div>
      }

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowCreate(false); setCreateResult(null) } }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h3>+ Nuevo reto</h3>
              <button onClick={() => { setShowCreate(false); setCreateResult(null) }} style={{ fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>
            <div className="modal-body">
              {!createResult ? (
                <>
                  <div className="field" style={{ marginBottom: '1.25rem' }}>
                    <label>Tipo de reto</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem', marginTop: '.5rem' }}>
                      {[
                        { val: 'both', icon: <IconTrophy size={20} />, lbl: 'Completo' },
                        { val: 'checkin', icon: <IconCamera size={20} />, lbl: 'Asistencia' },
                        { val: 'versus', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, lbl: 'Pesos' },
                      ].map(({ val, icon, lbl }) => (
                        <button
                          key={val}
                          onClick={() => setCreateType(val as any)}
                          style={{
                            padding: '.75rem .5rem',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${createType === val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: createType === val ? 'var(--color-primary-highlight)' : 'var(--color-surface-2)',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 'var(--text-xs)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '.25rem',
                          }}
                        >
                          <div style={{ color: createType === val ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{icon}</div>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="tiny muted" style={{ marginBottom: '1.25rem', lineHeight: 1.6 }}>
                    Se generará un código de 6 caracteres que deberás compartir con tu amigo para que pueda unirse.
                  </p>
                  <button className="primary-btn" style={{ width: '100%' }} onClick={handleCreate} disabled={createLoading}>
                    {createLoading ? 'Creando…' : 'Crear reto'}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    <IconTrophy size={40} />
                  </div>
                  <p style={{ marginBottom: '1rem', fontWeight: 600 }}>¡Reto creado! Comparte este código:</p>
                  <div style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, letterSpacing: '.2em', color: 'var(--color-primary)' }}>
                      {createResult.code}
                    </div>
                  </div>
                  <p className="tiny muted">Tu amigo debe ingresar este código en "Unirme a reto"</p>
                  <button className="primary-btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => { setShowCreate(false); setCreateResult(null) }}>
                    Listo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowJoin(false) }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h3>Unirme a reto</h3>
              <button onClick={() => setShowJoin(false)} style={{ fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="field" style={{ marginBottom: '1rem' }}>
                <label>Código del reto (6 caracteres)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="EJ: AB3X7Y"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', letterSpacing: '.2em', textAlign: 'center', marginTop: '.5rem' }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>
              {joinError && <div className="form-error" style={{ marginBottom: '1rem' }}>{joinError}</div>}
              <button className="primary-btn" style={{ width: '100%' }} onClick={handleJoin} disabled={joinLoading || joinCode.length !== 6}>
                {joinLoading ? 'Uniéndome…' : 'Unirme al reto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CheckIn Modal */}
      {checkInTarget && (
        <CheckInModal
          challenge={checkInTarget}
          userName={user?.name ?? 'Usuario'}
          onClose={() => setCheckInTarget(null)}
          onDone={async () => { setCheckInTarget(null); await load() }}
        />
      )}

      {/* Versus Modal */}
      {versusTarget && (
        <VersusModal challenge={versusTarget} onClose={() => setVersusTarget(null)} />
      )}
    </div>
  )
}
