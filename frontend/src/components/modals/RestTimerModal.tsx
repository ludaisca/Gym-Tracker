import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  seconds: number
  label: string
  onClose: () => void
}

export default function RestTimerModal({ seconds, label, onClose }: Props) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playBeep = useCallback((freq: number, duration: number) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch { /* audio not available */ }
  }, [])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setRunning(false)
          playBeep(880, 0.3)
          setTimeout(() => playBeep(880, 0.3), 350)
          setTimeout(() => playBeep(1100, 0.5), 700)
          return 0
        }
        if (prev <= 4) playBeep(660, 0.15)
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, playBeep])

  function toggle() { setRunning(r => !r) }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRemaining(seconds)
    setRunning(true)
  }

  const pct = remaining / seconds
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - pct)

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const urgent = remaining <= 5 && remaining > 0
  const done = remaining === 0

  return createPortal(
    <div className="confirm-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="timer-sheet">
        <div className="confirm-sheet-handle" />

        <div className="timer-sheet-header">
          <div className="timer-label">Descanso</div>
          <div className="timer-ex-name">{label}</div>
        </div>

        <div className="timer-ring-wrap">
          <svg viewBox="0 0 120 120">
            <circle className="timer-ring-bg" cx="60" cy="60" r={radius} />
            <circle
              className={`timer-ring-prog${urgent ? ' urgent' : ''}`}
              cx="60" cy="60" r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className={`timer-digits${urgent ? ' urgent' : ''}`}>{mm}:{ss}</div>
        </div>

        <div className="timer-status-text">
          {done ? '¡Listo para la siguiente serie!' : running ? 'Descansando…' : 'Pausado'}
        </div>

        <div className="confirm-sheet-actions">
          <button className="primary-btn timer-sheet-main-btn" onClick={done ? onClose : toggle}>
            {done ? 'Continuar' : running ? 'Pausar' : 'Reanudar'}
          </button>
          <div className="timer-sheet-secondary">
            <button className="ghost-btn" onClick={reset}>Reiniciar</button>
            <button className="ghost-btn" onClick={onClose}>Saltar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
