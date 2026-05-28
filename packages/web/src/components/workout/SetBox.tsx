import { useState } from 'react'
import { calc1RM } from '../../lib/fitness'
import type { SetData } from '../../types/domain'
import PlateCalcModal from '../modals/PlateCalcModal'

interface Props {
  setIndex: number
  data: SetData
  restSeconds: number
  exerciseName: string
  onChange: (field: 'kg' | 'reps', value: string) => void
  onStartTimer: (seconds: number, label: string) => void
  kgInputRef?: (el: HTMLInputElement | null) => void
  onRepEnter?: () => void
}

export default function SetBox({ setIndex, data, restSeconds, exerciseName, onChange, onStartTimer, kgInputRef, onRepEnter }: Props) {
  const [showPlateCalc, setShowPlateCalc] = useState(false)
  const rm = calc1RM(data.kg, data.reps)

  function formatRest(s: number): string {
    if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`
    return `${s}s`
  }

  function stepKg(delta: number) {
    const current = parseFloat(data.kg) || 0
    const next = Math.max(0, Math.round((current + delta) * 10) / 10)
    onChange('kg', next === 0 ? '' : String(next))
  }

  return (
    <div className="set-box">
      <label>Serie {setIndex + 1}</label>
      <div className="set-grid">
        <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'stretch' }}>
          <div className="kg-stepper" style={{ flex: 1 }}>
            <button
              className="kg-step-btn"
              type="button"
              tabIndex={-1}
              onPointerDown={e => { e.preventDefault(); stepKg(-2.5) }}
              aria-label="-2.5 kg"
            >−</button>
            <input
              ref={kgInputRef}
              placeholder="kg"
              value={data.kg}
              inputMode="decimal"
              onChange={(e) => onChange('kg', e.target.value)}
            />
            <button
              className="kg-step-btn"
              type="button"
              tabIndex={-1}
              onPointerDown={e => { e.preventDefault(); stepKg(2.5) }}
              aria-label="+2.5 kg"
            >+</button>
          </div>
          <button
            className="plate-calc-btn"
            type="button"
            tabIndex={-1}
            onPointerDown={e => { e.preventDefault(); setShowPlateCalc(true) }}
            aria-label="Calculadora de platos"
            title="Calculadora de platos"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="8" y1="10" x2="16" y2="10"/>
              <line x1="8" y1="14" x2="12" y2="14"/>
            </svg>
          </button>
        </div>
        {showPlateCalc && (
          <PlateCalcModal
            targetKg={parseFloat(data.kg) || 0}
            onClose={() => setShowPlateCalc(false)}
          />
        )}
        <input
          placeholder="reps"
          value={data.reps}
          inputMode="numeric"
          onChange={(e) => onChange('reps', e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onRepEnter?.() }}
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
