import { useNavigate } from 'react-router-dom'

const BENEFITS = [
  { icon: '∞', label: 'Rutinas ilimitadas' },
  { icon: '📊', label: 'Stats y gráficas de progresión' },
  { icon: '🤖', label: 'Asistente IA completo' },
  { icon: '⚔️', label: 'Duelos con amigos' },
  { icon: '🔔', label: 'Notificaciones push' },
]

interface UpgradeModalProps {
  feature?: string
  onClose: () => void
}

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const navigate = useNavigate()

  function goUpgrade() {
    onClose()
    navigate('/upgrade')
  }

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet upgrade-modal" onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-drag" />
        <div className="bottom-sheet-content">
          <div className="upgrade-modal-crown">♛</div>
          <h2 className="upgrade-modal-title">
            {feature ? `Desbloquea ${feature}` : 'Gym Tracker Pro'}
          </h2>
          <p className="upgrade-modal-sub muted">
            Accede a todas las funciones premium por $4.99/mes
          </p>

          <ul className="upgrade-modal-benefits">
            {BENEFITS.map(b => (
              <li key={b.label} className="upgrade-modal-benefit">
                <span className="upgrade-modal-benefit-icon">{b.icon}</span>
                <span>{b.label}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="primary-btn" onClick={goUpgrade}>
              Ver planes Pro →
            </button>
            <button className="ghost-btn" onClick={onClose}>
              Quizás después
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
