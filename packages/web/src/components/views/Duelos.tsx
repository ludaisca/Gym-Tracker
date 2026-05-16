import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { challengesApi, type Challenge, type VersusData } from '../../api/challenges'
import { useAuthStore } from '../../store'
import { IconTrophy, IconCamera, IconStats, IconCheck } from '../ui/Icons'

// ── Canvas watermark helper ──────────────────────────────────────────────
async function captureWithWatermark(
  videoEl: HTMLVideoElement,
  userName: string,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth || 640
  canvas.height = videoEl.videoHeight || 480
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoEl, 0, 0)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, canvas.height - 56, canvas.width, 56)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px monospace'
  const now = new Date().toLocaleString('es-MX')
  ctx.fillText(`${userName} · ${now}`, 12, canvas.height - 32)
  ctx.font = '11px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('ID: verificando…', 12, canvas.height - 12)
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
  const isCreator = challenge.creatorId === myId
  const rival = isCreator ? challenge.opponent : challenge.creator
  const myStats = isCreator ? challenge.stats?.creator : challenge.stats?.opponent
  const rivalStats = isCreator ? challenge.stats?.opponent : challenge.stats?.creator
  const todayCheckedIn = myStats?.dates.includes(new Date().toISOString().slice(0, 10)) ?? false

  const days = challenge.startDate
    ? Math.ceil((new Date(challenge.endDate ?? Date.now()).getTime() - Date.now()) / 86400000)
    : null

  const statusLabel =
    challenge.status === 'finished' ? 'Finalizado'
    : challenge.status === 'pending' ? 'Esperando oponente…'
    : days !== null ? (days > 0 ? `${days} días restantes` : 'Finalizando…')
    : 'Activo'

  return (
    <article className="card" style={{ overflow: 'hidden' }}>
      <div className="panel-head">
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            {challenge.status === 'finished'
              ? <IconTrophy size={16} style={{ color: 'var(--color-primary)' }} />
              : challenge.status === 'pending'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v8a6 6 0 0 1-12 0V4Z"/><path d="M6 8H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4"/><path d="M18 8h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
            }
            Reto #{challenge.code}
          </h3>
          <p>{statusLabel}</p>
        </div>
        <button
          className="ghost-btn"
          style={{ padding: '.4rem .8rem', fontSize: 'var(--text-xs)', flexShrink: 0 }}
          onClick={() => onSelect(challenge)}
        >
          Ver detalle
        </button>
      </div>

      {challenge.status === 'active' && rival && (
        <div className="duel-vs-bar">
          <div className="duel-vs-side">
            <div className="duel-vs-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-xl)', fontFamily: 'var(--font-mono)' }}>{myStats?.checkInDays ?? 0}</div>
            <div className="tiny muted">Tú</div>
          </div>
          <div className="duel-vs-label">VS</div>
          <div className="duel-vs-side">
            <div className="duel-vs-avatar" style={{ background: 'var(--color-surface-offset)' }}>
              {rival.avatar
                ? <img src={rival.avatar} alt={rival.name} />
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-xl)', fontFamily: 'var(--font-mono)' }}>{rivalStats?.checkInDays ?? 0}</div>
            <div className="tiny muted" style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rival.name}</div>
          </div>
        </div>
      )}

      {challenge.status === 'finished' && (
        <div style={{ padding: '0 1.25rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)' }}>{challenge.stats?.creator.checkInDays ?? 0}</div>
              <div className="tiny muted">{challenge.creator.name}</div>
            </div>
            <div className="tiny muted" style={{ alignSelf: 'center' }}>check-ins</div>
            <div>
              <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)' }}>{challenge.stats?.opponent.checkInDays ?? 0}</div>
              <div className="tiny muted">{challenge.opponent?.name ?? '—'}</div>
            </div>
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

// ── DetailModal ───────────────────────────────────────────────────────────
function DetailModal({
  challenge,
  myId,
  onClose,
  onCancel,
  onVersus,
}: {
  challenge: Challenge
  myId: string
  onClose: () => void
  onCancel: () => void
  onVersus: (c: Challenge) => void
}) {
  const [detail, setDetail] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    challengesApi.get(challenge.id)
      .then(setDetail)
      .catch(() => setError('No se pudo cargar el detalle del reto.'))
      .finally(() => setLoading(false))
  }, [challenge.id])

  const isCreator = challenge.creatorId === myId
  const myCheckIns = detail?.checkIns.filter(c => c.userId === myId) ?? []
  const showVersus = (challenge.type === 'versus' || challenge.type === 'both') && myCheckIns.length > 0

  async function handleCancel() {
    if (!confirmCancel) {
      setConfirmCancel(true)
      setTimeout(() => setConfirmCancel(false), 3000)
      return
    }
    setCancelling(true)
    try {
      await challengesApi.delete(challenge.id)
      onCancel()
    } catch {
      setError('No se pudo cancelar el reto.')
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  const typeLabels: Record<string, string> = {
    both: 'Completo (asistencia + pesos)',
    checkin: 'Asistencia con foto',
    versus: 'Comparativa de pesos',
  }
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    active: 'Activo',
    finished: 'Finalizado',
  }

  return createPortal(
    <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="confirm-sheet" style={{ maxWidth: 480 }}>
        <div className="confirm-sheet-handle" />
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <IconTrophy size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          Reto #{challenge.code}
        </h3>

        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>}
        {!loading && error && <div className="form-error" style={{ marginTop: '1rem' }}>{error}</div>}

        {detail && !loading && (
          <div style={{ overflowY: 'auto', maxHeight: '60dvh', marginTop: 'var(--space-4)' }}>
            {/* Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '1rem' }}>
              {[
                { label: 'Tipo', value: typeLabels[detail.type] ?? detail.type },
                { label: 'Estado', value: statusLabels[detail.status] ?? detail.status },
                { label: 'Duración', value: `${detail.durationDays} días` },
                { label: 'Check-ins míos', value: String(myCheckIns.length) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: '.6rem .75rem' }}>
                  <div className="tiny muted">{label}</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginTop: '.15rem' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Participantes */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="tiny muted" style={{ marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>Participantes</div>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                {[detail.creator, detail.opponent].filter(Boolean).map(p => p && (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: '.45rem .75rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-surface-offset)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.avatar
                        ? <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.name}</div>
                      <div className="tiny muted">{p.id === myId ? 'Tú' : p.id === detail.creatorId ? 'Creador' : 'Oponente'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Galería check-ins */}
            {detail.checkIns.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="tiny muted" style={{ marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Check-ins ({detail.checkIns.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '.35rem' }}>
                  {detail.checkIns.map(ci => (
                    <div key={ci.id} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', aspectRatio: '1', background: 'var(--color-surface-2)' }}>
                      <img src={ci.photoUrl} alt="Check-in" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.55)', padding: '2px 4px' }}>
                        <div style={{ fontSize: 9, color: '#fff', fontFamily: 'monospace' }}>
                          {new Date(ci.serverTime).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                      {ci.userId === myId && (
                        <div style={{ position: 'absolute', top: 3, right: 3, background: 'var(--color-primary)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconCheck size={8} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="confirm-sheet-actions">
          {detail && showVersus && (
            <button className="primary-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }} onClick={() => { onClose(); onVersus(detail) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Ver VERSUS
            </button>
          )}
          {detail && isCreator && (detail.status === 'pending' || detail.status === 'active') && (
            <button
              className="ghost-btn"
              style={confirmCancel ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}}
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Eliminando…' : confirmCancel ? '¿Confirmar?' : detail.status === 'pending' ? 'Cancelar reto' : 'Abandonar reto'}
            </button>
          )}
          <button className="ghost-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── CheckInModal ──────────────────────────────────────────────────────────
function CheckInModal({
  challenge,
  userName,
  onClose,
  onDone,
}: {
  challenge: Challenge
  userName: string
  onClose: () => void
  onDone: (hash: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'camera' | 'confirm' | 'done'>('camera')
  const [serverHash, setServerHash] = useState('')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setError('No se pudo acceder a la cámara. Verifica los permisos.'))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function capture() {
    if (!videoRef.current) return
    const dataUrl = await captureWithWatermark(videoRef.current, userName)
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
      const result = await challengesApi.checkin(challenge.id, preview, lat, lng)
      setServerHash(result.hash)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar asistencia')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="confirm-sheet" style={{ maxWidth: 420 }}>
        <div className="confirm-sheet-handle" />
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <IconCamera size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          Check-in al gym
        </h3>

        <div style={{ marginTop: 'var(--space-4)' }}>
          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {step === 'camera' && (
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: '#000', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
            />
          )}

          {step === 'confirm' && preview && (
            <img src={preview} alt="Vista previa" style={{ width: '100%', borderRadius: 'var(--radius-lg)', display: 'block' }} />
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ color: 'var(--color-success)', marginBottom: '.75rem', display: 'flex', justifyContent: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontWeight: 700, marginBottom: '.5rem' }}>¡Asistencia registrada!</p>
              {serverHash && (
                <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '.5rem .75rem', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  ID: {serverHash}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="confirm-sheet-actions">
          {step === 'camera' && (
            <button className="primary-btn" onClick={capture} disabled={!stream}>
              Tomar foto
            </button>
          )}
          {step === 'confirm' && (
            <>
              <button className="primary-btn" onClick={confirm} disabled={loading}>
                {loading ? 'Enviando…' : 'Confirmar'}
              </button>
              <button className="ghost-btn" onClick={() => { setPreview(null); setStep('camera') }}>
                Repetir foto
              </button>
            </>
          )}
          {step === 'done' && (
            <button className="primary-btn" onClick={() => onDone(serverHash)}>Listo</button>
          )}
          {step !== 'done' && (
            <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── VersusModal ───────────────────────────────────────────────────────────
function VersusModal({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  const [data, setData] = useState<VersusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadVersus = useCallback(() => {
    setLoading(true)
    setError('')
    challengesApi.versus(challenge.id)
      .then(setData)
      .catch(e => setError(e.message ?? 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [challenge.id])

  useEffect(() => { loadVersus() }, [loadVersus])

  return createPortal(
    <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="confirm-sheet" style={{ maxWidth: 560 }}>
        <div className="confirm-sheet-handle" />
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)', flexShrink: 0 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          VERSUS · {challenge.code}
        </h3>

        <div style={{ marginTop: 'var(--space-4)', overflowY: 'auto', maxHeight: '55dvh' }}>
          {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>}
          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>
            </div>
          )}
          {!loading && data && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1.25rem' }}>
                <div className="card kpi"><div className="kpi-label">{challenge.creator.name}</div><div className="kpi-value">{data.creatorSessions}</div><div className="kpi-meta">sesiones</div></div>
                <div className="card kpi"><div className="kpi-label">{challenge.opponent?.name ?? '—'}</div><div className="kpi-value">{data.opponentSessions}</div><div className="kpi-meta">sesiones</div></div>
              </div>
              {data.versus.length === 0 ? (
                <div className="empty-state"><span className="empty-icon" style={{ display: 'inline-flex' }}><IconStats size={28} /></span><p>Aún no hay datos de ejercicios para comparar.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {data.versus.map(row => {
                    const creatorWins = (row.creator?.oneRM ?? 0) >= (row.opponent?.oneRM ?? 0)
                    return (
                      <div key={row.exercise} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-lg)', padding: '.875rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '.5rem' }}>
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

        <div className="confirm-sheet-actions">
          {!loading && error && <button className="ghost-btn" onClick={loadVersus}>Reintentar</button>}
          <button className="ghost-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
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
  const [createDuration, setCreateDuration] = useState(30)
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{ code: string } | null>(null)

  const [checkInTarget, setCheckInTarget] = useState<Challenge | null>(null)
  const [versusTarget, setVersusTarget] = useState<Challenge | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [showFinished, setShowFinished] = useState(false)

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
      const res = await challengesApi.create(createType, createDuration)
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

  const active   = challenges.filter(c => c.status !== 'finished')
  const finished = challenges.filter(c => c.status === 'finished')

  if (loading) return <div className="content"><div className="spinner" /></div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {active.length} reto{active.length !== 1 ? 's' : ''} activo{active.length !== 1 ? 's' : ''}
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

      {error && <div className="form-error" style={{ marginTop: '1rem' }}>{error}</div>}

      {challenges.length === 0
        ? <EmptyState onCreateOpen={() => setShowCreate(true)} onJoinOpen={() => setShowJoin(true)} />
        : (
          <>
            {active.length === 0 && finished.length > 0 && (
              <p className="muted" style={{ marginTop: '1.5rem', textAlign: 'center' }}>No hay retos activos. Mira los finalizados abajo.</p>
            )}
            {active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {active.map(c => (
                  <ChallengeCard key={c.id} challenge={c} myId={myId}
                    onCheckIn={setCheckInTarget} onVersus={setVersusTarget} onSelect={setSelectedChallenge}
                  />
                ))}
              </div>
            )}
            {finished.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <button className="ghost-btn" style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '.6rem 1rem' }} onClick={() => setShowFinished(v => !v)}>
                  <span>Finalizados ({finished.length})</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showFinished ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {showFinished && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '.75rem' }}>
                    {finished.map(c => (
                      <ChallengeCard key={c.id} challenge={c} myId={myId}
                        onCheckIn={() => {}} onVersus={setVersusTarget} onSelect={setSelectedChallenge}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )
      }

      {/* ── Create Modal ───────────────────────────────────────────────── */}
      {showCreate && createPortal(
        <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowCreate(false); setCreateResult(null) } }}>
          <div className="confirm-sheet" style={{ maxWidth: 420 }}>
            <div className="confirm-sheet-handle" />
            <h3>+ Nuevo reto</h3>

            {!createResult ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div className="field" style={{ marginBottom: '1.25rem' }}>
                  <label>Tipo de reto</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem', marginTop: '.5rem' }}>
                    {[
                      { val: 'both', icon: <IconTrophy size={20} />, lbl: 'Completo', desc: 'Asistencia + comparativa de pesos' },
                      { val: 'checkin', icon: <IconCamera size={20} />, lbl: 'Asistencia', desc: 'Quién va más días al gym' },
                      { val: 'versus', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, lbl: 'Pesos', desc: 'Quién levanta más kg×reps' },
                    ].map(({ val, icon, lbl, desc }) => (
                      <button key={val} onClick={() => setCreateType(val as 'checkin' | 'versus' | 'both')}
                        style={{ padding: '.75rem .5rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${createType === val ? 'var(--color-primary)' : 'var(--color-border)'}`, background: createType === val ? 'var(--color-primary-highlight)' : 'var(--color-surface-2)', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem', textAlign: 'center' }}>
                        <div style={{ color: createType === val ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{icon}</div>
                        {lbl}
                        <div style={{ fontWeight: 400, fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label>Duración: <strong>{createDuration} días</strong></label>
                  <input type="range" min={7} max={90} step={7} value={createDuration} onChange={e => setCreateDuration(Number(e.target.value))} style={{ width: '100%', marginTop: '.5rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="tiny muted">7 días</span><span className="tiny muted">90 días</span></div>
                </div>

                <p className="tiny muted" style={{ lineHeight: 1.6 }}>
                  Se generará un código de 6 caracteres para compartir con tu amigo.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <IconTrophy size={40} />
                </div>
                <p style={{ marginBottom: '1rem', fontWeight: 600 }}>¡Reto creado! Comparte este código:</p>
                <div style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '.75rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, letterSpacing: '.2em', color: 'var(--color-primary)' }}>
                    {createResult.code}
                  </div>
                </div>
                <p className="tiny muted">Tu amigo debe ingresar este código en "Unirme"</p>
              </div>
            )}

            <div className="confirm-sheet-actions">
              {!createResult
                ? <button className="primary-btn" onClick={handleCreate} disabled={createLoading}>{createLoading ? 'Creando…' : 'Crear reto'}</button>
                : <button className="primary-btn" onClick={() => { setShowCreate(false); setCreateResult(null) }}>Listo</button>
              }
              {!createResult && <button className="ghost-btn" onClick={() => { setShowCreate(false); setCreateResult(null) }}>Cancelar</button>}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Join Modal ─────────────────────────────────────────────────── */}
      {showJoin && createPortal(
        <div className="confirm-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowJoin(false) }}>
          <div className="confirm-sheet" style={{ maxWidth: 380 }}>
            <div className="confirm-sheet-handle" />
            <h3>Unirme a reto</h3>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <div className="field">
                <label>Código del reto (6 caracteres)</label>
                <input type="text" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="EJ: AB3X7Y"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', letterSpacing: '.2em', textAlign: 'center', marginTop: '.5rem' }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>
              {joinError && <div className="form-error" style={{ marginTop: '.75rem' }}>{joinError}</div>}
            </div>

            <div className="confirm-sheet-actions">
              <button className="primary-btn" onClick={handleJoin} disabled={joinLoading || joinCode.length !== 6}>
                {joinLoading ? 'Uniéndome…' : 'Unirme al reto'}
              </button>
              <button className="ghost-btn" onClick={() => setShowJoin(false)}>Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modales de componente ──────────────────────────────────────── */}
      {checkInTarget && (
        <CheckInModal challenge={checkInTarget} userName={user?.name ?? 'Usuario'}
          onClose={() => setCheckInTarget(null)}
          onDone={async () => { setCheckInTarget(null); await load() }}
        />
      )}
      {versusTarget && <VersusModal challenge={versusTarget} onClose={() => setVersusTarget(null)} />}
      {selectedChallenge && (
        <DetailModal challenge={selectedChallenge} myId={myId}
          onClose={() => setSelectedChallenge(null)}
          onCancel={async () => { setSelectedChallenge(null); await load() }}
          onVersus={c => { setSelectedChallenge(null); setVersusTarget(c) }}
        />
      )}
    </div>
  )
}
