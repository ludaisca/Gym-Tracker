import { useMemo } from 'react'

interface Props {
  activeGroups: Record<string, number>
}

export default function BodySvg({ activeGroups }: Props) {
  const max = useMemo(() => {
    const vals = Object.values(activeGroups).filter(v => v > 0)
    return vals.length ? Math.max(...vals) : 1
  }, [activeGroups])

  function op(muscle: string): number {
    const vol = activeGroups[muscle] ?? 0
    if (vol === 0) return 0.07
    return 0.2 + (vol / max) * 0.7
  }

  const pc = 'var(--color-primary)'

  return (
    <svg
      viewBox="0 0 260 300"
      style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}
      aria-label="Mapa muscular"
    >
      {/* Labels */}
      <text x="62" y="13" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" fontFamily="var(--font-body)">FRENTE</text>
      <text x="198" y="13" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" fontFamily="var(--font-body)">ESPALDA</text>
      <line x1="130" y1="0" x2="130" y2="300" stroke="var(--color-divider)" strokeWidth="1" />

      {/* ── FRONT (center x=62) ── */}
      {/* Head */}
      <circle cx="62" cy="28" r="13" fill="var(--color-surface-2)" stroke="var(--color-border)" strokeWidth="1" />

      {/* Shoulders front */}
      <ellipse cx="28" cy="54" rx="13" ry="8" fill={pc} fillOpacity={op('hombros')} />
      <ellipse cx="96" cy="54" rx="13" ry="8" fill={pc} fillOpacity={op('hombros')} />

      {/* Chest */}
      <rect x="38" y="45" width="48" height="32" rx="6" fill={pc} fillOpacity={op('pecho')} />

      {/* Biceps */}
      <ellipse cx="18" cy="79" rx="8" ry="19" fill={pc} fillOpacity={op('biceps')} />
      <ellipse cx="106" cy="79" rx="8" ry="19" fill={pc} fillOpacity={op('biceps')} />

      {/* Abs */}
      <rect x="42" y="79" width="40" height="46" rx="5" fill={pc} fillOpacity={op('abdomen')} />

      {/* Quads */}
      <rect x="37" y="132" width="23" height="60" rx="10" fill={pc} fillOpacity={op('cuadriceps')} />
      <rect x="64" y="132" width="23" height="60" rx="10" fill={pc} fillOpacity={op('cuadriceps')} />

      {/* Calves front */}
      <rect x="39" y="198" width="18" height="46" rx="7" fill={pc} fillOpacity={op('pantorrillas')} />
      <rect x="67" y="198" width="18" height="46" rx="7" fill={pc} fillOpacity={op('pantorrillas')} />

      {/* ── BACK (center x=198) ── */}
      {/* Head */}
      <circle cx="198" cy="28" r="13" fill="var(--color-surface-2)" stroke="var(--color-border)" strokeWidth="1" />

      {/* Shoulders back */}
      <ellipse cx="164" cy="54" rx="13" ry="8" fill={pc} fillOpacity={op('hombros')} />
      <ellipse cx="232" cy="54" rx="13" ry="8" fill={pc} fillOpacity={op('hombros')} />

      {/* Upper back / traps */}
      <rect x="174" y="45" width="48" height="36" rx="6" fill={pc} fillOpacity={op('espalda-alta')} />

      {/* Triceps */}
      <ellipse cx="154" cy="79" rx="8" ry="19" fill={pc} fillOpacity={op('triceps')} />
      <ellipse cx="242" cy="79" rx="8" ry="19" fill={pc} fillOpacity={op('triceps')} />

      {/* Lower back */}
      <rect x="178" y="83" width="40" height="30" rx="5" fill={pc} fillOpacity={op('espalda-baja')} />

      {/* Glutes */}
      <ellipse cx="185" cy="131" rx="19" ry="14" fill={pc} fillOpacity={op('gluteos')} />
      <ellipse cx="211" cy="131" rx="19" ry="14" fill={pc} fillOpacity={op('gluteos')} />

      {/* Hamstrings */}
      <rect x="173" y="145" width="23" height="55" rx="10" fill={pc} fillOpacity={op('isquios')} />
      <rect x="200" y="145" width="23" height="55" rx="10" fill={pc} fillOpacity={op('isquios')} />

      {/* Calves back */}
      <rect x="175" y="206" width="18" height="40" rx="7" fill={pc} fillOpacity={op('pantorrillas')} />
      <rect x="203" y="206" width="18" height="40" rx="7" fill={pc} fillOpacity={op('pantorrillas')} />
    </svg>
  )
}
