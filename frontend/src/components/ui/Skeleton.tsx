interface Props {
  variant?: 'kpi' | 'card' | 'list-item' | 'text' | 'text-sm'
  count?: number
  style?: React.CSSProperties
}

function SkeletonItem({ variant = 'card', style }: Omit<Props, 'count'>) {
  return <div className={`skeleton skeleton-${variant}`} style={style} />
}

export default function Skeleton({ variant = 'card', count = 1, style }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} variant={variant} style={style} />
      ))}
    </>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div className="kpis">
        <Skeleton variant="kpi" count={4} />
      </div>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  )
}

export function SkeletonExerciseList({ count = 4 }: { count?: number }) {
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Skeleton variant="text" style={{ width: '40%' }} />
          <Skeleton variant="card" style={{ height: '72px' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <Skeleton variant="list-item" count={count} />
    </div>
  )
}

export function SkeletonWeeks({ count = 4 }: { count?: number }) {
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Skeleton variant="text" style={{ width: '25%' }} />
          <Skeleton variant="card" style={{ height: '60px' }} />
        </div>
      ))}
    </div>
  )
}
