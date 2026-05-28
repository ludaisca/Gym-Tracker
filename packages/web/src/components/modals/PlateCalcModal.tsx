import { useState, useMemo } from 'react'

interface Props {
  targetKg: number
  onClose: () => void
}

const PLATE_WEIGHTS = [20, 15, 10, 5, 2.5, 1.25]
const BAR_OPTIONS = [20, 15, 10]

const PLATE_COLORS: Record<number, string> = {
  20: '#2a2a2a',
  15: '#c0392b',
  10: '#27ae60',
  5: '#2980b9',
  2.5: '#f39c12',
  1.25: '#7f8c8d',
}
const PLATE_RADII: Record<number, number> = {
  20: 22, 15: 20, 10: 17, 5: 14, 2.5: 11, 1.25: 9,
}

function calcPlates(targetKg: number, barKg: number): { weight: number; count: number }[] {
  const perSide = (targetKg - barKg) / 2
  if (perSide < 0) return []
  const plates: { weight: number; count: number }[] = []
  let remaining = Math.round(perSide * 100) / 100
  for (const plate of PLATE_WEIGHTS) {
    if (remaining < plate - 0.001) continue
    const count = Math.floor(Math.round(remaining / plate * 10) / 10)
    if (count > 0) {
      plates.push({ weight: plate, count })
      remaining = Math.round((remaining - count * plate) * 100) / 100
    }
  }
  return plates
}

function PlateDisc({ weight }: { weight: number }) {
  const r = PLATE_RADII[weight] ?? 10
  const color = PLATE_COLORS[weight] ?? '#888'
  return (
    <svg width={r * 2 + 4} height={50} style={{ flexShrink: 0 }}>
      <rect
        x={2} y={(50 - r * 2) / 2}
        width={r * 2} height={r * 2}
        rx={r * 0.25}
        fill={color}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1.5}
      />
      <text
        x={r + 2} y={50 / 2 + 4}
        textAnchor="middle"
        fontSize={weight >= 10 ? 9 : 8}
        fill="rgba(255,255,255,0.85)"
        fontWeight="700"
        fontFamily="var(--font-body)"
      >
        {weight}
      </text>
    </svg>
  )
}

export default function PlateCalcModal({ targetKg, onClose }: Props) {
  const [barKg, setBarKg] = useState(20)
  const plates = useMemo(() => calcPlates(targetKg, barKg), [targetKg, barKg])
  const remainder = useMemo(() => {
    const used = plates.reduce((a, p) => a + p.weight * p.count * 2, 0) + barKg
    return Math.round((targetKg - used) * 100) / 100
  }, [plates, targetKg, barKg])

  return (
    <div
      className="plate-calc-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="plate-calc-sheet">
        <div className="plate-calc-header">
          <div>
            <div className="plate-calc-title">Calculadora de platos</div>
            <div className="plate-calc-subtitle">{targetKg} kg objetivo</div>
          </div>
          <button className="ghost-btn" style={{ padding: '.4rem .6rem' }} onClick={onClose}>×</button>
        </div>

        <div className="plate-calc-bar-row">
          <span className="tiny muted">Barra:</span>
          {BAR_OPTIONS.map(b => (
            <button
              key={b}
              type="button"
              className={`plate-bar-btn${barKg === b ? ' active' : ''}`}
              onClick={() => setBarKg(b)}
            >
              {b} kg
            </button>
          ))}
        </div>

        {plates.length === 0 ? (
          <p className="tiny muted" style={{ textAlign: 'center', padding: '1rem' }}>
            {targetKg <= barKg
              ? `El objetivo (${targetKg} kg) es igual o menor que la barra (${barKg} kg)`
              : 'No se pueden calcular platos para este peso'}
          </p>
        ) : (
          <>
            <div className="plate-calc-label">Por lado:</div>
            <div className="plate-calc-discs">
              {plates.flatMap(p =>
                Array.from({ length: p.count }, (_, i) => (
                  <PlateDisc key={`${p.weight}-${i}`} weight={p.weight} />
                ))
              )}
            </div>
            <div className="plate-calc-breakdown">
              {plates.map(p => (
                <div key={p.weight} className="plate-breakdown-row">
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: PLATE_COLORS[p.weight] ?? '#888', marginRight: 6 }} />
                  <span className="tiny">{p.count} × {p.weight} kg</span>
                  <span className="tiny muted" style={{ marginLeft: 'auto' }}>{p.count * p.weight} kg/lado</span>
                </div>
              ))}
            </div>
            <div className="plate-calc-total">
              <span className="tiny muted">Total: {barKg} + {plates.reduce((a, p) => a + p.weight * p.count, 0) * 2} kg placas</span>
              {Math.abs(remainder) > 0.01 && (
                <span className="tiny" style={{ color: 'var(--color-warning, var(--color-orange))' }}>
                  Diferencia: {remainder > 0 ? '+' : ''}{remainder} kg
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
