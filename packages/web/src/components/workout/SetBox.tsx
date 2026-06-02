import { useState } from 'react'
import { createPortal } from 'react-dom'
import { calc1RM } from '../../lib/fitness'
import type { SetData } from '../../types/domain'
import PlateCalcModal from '../modals/PlateCalcModal'

interface Props {
  setIndex: number
  data: SetData
  onChange: (field: 'kg' | 'reps', value: string) => void
  kgInputRef?: (el: HTMLInputElement | null) => void
  onRepEnter?: () => void
}

export default function SetBox({ setIndex, data, onChange, kgInputRef, onRepEnter }: Props) {
  const [showPlateCalc, setShowPlateCalc] = useState(false)
  const rm = calc1RM(data.kg, data.reps)

  function stepKg(delta: number) {
    const current = parseFloat(data.kg) || 0
    const next = Math.max(0, Math.round((current + delta) * 10) / 10)
    onChange('kg', next === 0 ? '' : String(next))
  }

  return (
    <div className={`set-row${data.kg && data.reps ? ' set-row-filled' : ''}`}>
      <span className="set-n">S{setIndex + 1}</span>

      <div className="set-kg-group">
        <button
          className="set-step-btn"
          type="button"
          tabIndex={-1}
          onPointerDown={e => { e.preventDefault(); stepKg(-2.5) }}
          aria-label="-2.5 kg"
        >−</button>
        <input
          ref={kgInputRef}
          className="set-kg-input"
          placeholder="kg"
          value={data.kg}
          inputMode="decimal"
          onChange={e => onChange('kg', e.target.value)}
        />
        <button
          className="set-step-btn"
          type="button"
          tabIndex={-1}
          onPointerDown={e => { e.preventDefault(); stepKg(2.5) }}
          aria-label="+2.5 kg"
        >+</button>
        <button
          className="set-plate-btn"
          type="button"
          tabIndex={-1}
          onPointerDown={e => { e.preventDefault(); setShowPlateCalc(true) }}
          aria-label="Calculadora de platos"
          title="Calculadora de platos"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="12" rx="3" ry="8"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
          </svg>
        </button>
      </div>

      <input
        className="set-reps-input"
        placeholder="reps"
        value={data.reps}
        inputMode="numeric"
        onChange={e => onChange('reps', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onRepEnter?.() }}
      />

      {rm > 0
        ? <span className="set-rm-text">≈{rm}</span>
        : <span className="set-rm-text" />
      }

      {showPlateCalc && createPortal(
        <PlateCalcModal
          targetKg={parseFloat(data.kg) || 0}
          onClose={() => setShowPlateCalc(false)}
        />,
        document.body
      )}
    </div>
  )
}
