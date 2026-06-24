import { calc1RM } from '../../lib/fitness'
import type { SetData } from '../../types/domain'
import { IconCheck } from '../ui/Icons'

interface Props {
  setIndex: number
  data: SetData
  hint?: { kg: string; reps: string } | null
  onChange: (field: 'kg' | 'reps', value: string) => void
  onComplete: () => void
}

export default function SetBox({ setIndex, data, hint, onChange, onComplete }: Props) {
  const rm = calc1RM(data.kg, data.reps) ?? 0
  const isCompleted = !!data.completed
  const canComplete = !!data.kg && !!data.reps && parseFloat(data.kg) > 0 && parseFloat(data.reps) > 0

  return (
    <div>
      <div className={`set-row${isCompleted ? ' completed' : ''}`}>
        <div className="set-num">
          <span>S{setIndex + 1}</span>
          {rm > 0 && <span className="set-1rm-sm">{rm}kg</span>}
        </div>
        <input
          className="set-input"
          placeholder="kg"
          value={data.kg}
          inputMode="decimal"
          readOnly={isCompleted}
          onChange={(e) => onChange('kg', e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
        <span className="set-sep">×</span>
        <input
          className="set-input"
          placeholder="reps"
          value={data.reps}
          inputMode="numeric"
          readOnly={isCompleted}
          onChange={(e) => onChange('reps', e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          className={`set-complete-btn${canComplete && !isCompleted ? ' ready' : ''}`}
          type="button"
          onClick={() => !isCompleted && canComplete && onComplete()}
          aria-label={isCompleted ? 'Serie completada' : 'Completar serie'}
        >
          <IconCheck size={15} strokeWidth={2.5} />
        </button>
      </div>
      {hint && (hint.kg || hint.reps) && !isCompleted && (
        <div className="set-hint">↑ {hint.kg} × {hint.reps}</div>
      )}
    </div>
  )
}
