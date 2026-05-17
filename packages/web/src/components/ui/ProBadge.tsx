interface ProBadgeProps {
  variant?: 'inline' | 'overlay'
  size?: 'sm' | 'md'
}

export function ProBadge({ variant = 'inline', size = 'sm' }: ProBadgeProps) {
  return (
    <span className={`pro-badge pro-badge--${variant} pro-badge--${size}`} aria-label="Función Pro">
      ★ PRO
    </span>
  )
}
