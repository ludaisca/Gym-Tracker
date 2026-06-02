interface DataPoint {
  week: number
  kg: number
}

interface Props {
  history: DataPoint[]
}

export default function ExerciseLineChart({ history }: Props) {
  if (history.length < 2) return null

  const W = 300, H = 86, padL = 30, padR = 10, padT = 20, padB = 18
  const cW = W - padL - padR
  const cH = H - padT - padB
  const minKg = Math.min(...history.map(h => h.kg))
  const maxKg = Math.max(...history.map(h => h.kg))
  const rangeKg = maxKg - minKg || 1

  const pts = history.map((h, i) => ({
    x: padL + (history.length > 1 ? i * cW / (history.length - 1) : cW / 2),
    y: padT + cH - ((h.kg - minKg) / rangeKg) * cH,
    kg: h.kg,
    week: h.week,
  }))

  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `M${pts[0].x.toFixed(1)},${(padT + cH).toFixed(1)} ${pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} L${pts[pts.length - 1].x.toFixed(1)},${(padT + cH).toFixed(1)} Z`

  return (
    <div className="exercise-chart">
      <div className="chart-wrapper">
        <div className="chart-title">Progreso · kg por semana</div>
        <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <line className="chart-grid" x1={padL} y1={padT} x2={padL + cW} y2={padT} />
          <line className="chart-grid" x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} />
          <text className="chart-axis-label" x={padL - 4} y={padT + 4} textAnchor="end">{maxKg}</text>
          {maxKg !== minKg && (
            <text className="chart-axis-label" x={padL - 4} y={padT + cH + 4} textAnchor="end">{minKg}</text>
          )}
          <path className="chart-area" d={areaD} />
          <polyline className="chart-line" points={polyline} />
          {pts.map((p, i) => (
            <g key={i}>
              <circle className="chart-dot" cx={p.x} cy={p.y} r={3.5} />
              <text className="chart-dot-label" x={p.x} y={p.y - 7}>{p.kg}</text>
              <text className="chart-axis-label" x={p.x} y={H - 2}>S{p.week}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
