import { calc1RM } from '../../lib/fitness'
import type { SetData } from '../../types/domain'

interface Props {
  setIndex: number
  data: SetData
  restSeconds: number
  exerciseName: string
  onChange: (field: 'kg' | 'reps', value: string) => void
  onStartTimer: (seconds: number, label: string) => void
}

export default function SetBox({ setIndex, data, restSeconds, exerciseName, onChange, onStartTimer }: Props) {
  const rm = calc1RM(data.kg, data.reps)

  function formatRest(s: number): string {
    if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`
    return `${s}s`
  }

  return (
    <div className="set-box">
      <label>Serie {setIndex + 1}</label>
      <div className="set-grid">
        <input
          placeholder="kg"
          value={data.kg}
          inputMode="decimal"
          onChange={(e) => onChange('kg', e.target.value)}
        />
        <input
          placeholder="reps"
          value={data.reps}
          inputMode="numeric"
          onChange={(e) => onChange('reps', e.target.value)}
        />
      </div>
      <div className="set-1rm">{rm ? `Est. 1RM ≈ ${rm} kg` : ''}</div>
      <button
        className="rest-start-btn"
        style={{ marginTop: '.35rem', width: '100%' }}
        type="button"
        onClick={() => onStartTimer(restSeconds, `${exerciseName} · S${setIndex + 1}`)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {formatRest(restSeconds)}
      </button>
    </div>
  )
}
