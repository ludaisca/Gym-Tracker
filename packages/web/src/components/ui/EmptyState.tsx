import { useNavigate } from 'react-router-dom'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body?: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const navigate = useNavigate()
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)', marginBottom: body ? '0.4rem' : 0 }}>
          {title}
        </div>
        {body && <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>{body}</div>}
      </div>
      {action && (
        <button className="primary-btn" onClick={() => navigate(action.href)}>
          {action.label}
        </button>
      )}
    </div>
  )
}
