import { useState } from 'react'
import { useProAccess } from '../../hooks/useProAccess'
import { UpgradeModal } from './UpgradeModal'

interface ProGateProps {
  mode: 'blur' | 'lock'
  feature?: string
  lockLabel?: string
  children?: React.ReactNode
}

export function ProGate({ mode, feature, lockLabel, children }: ProGateProps) {
  const { isPro } = useProAccess()
  const [showModal, setShowModal] = useState(false)

  if (isPro) return <>{children}</>

  return (
    <>
      {mode === 'blur' ? (
        <div className="pro-gate-blur" onClick={() => setShowModal(true)}>
          <div className="pro-gate-blur-content" aria-hidden="true">{children}</div>
          <div className="pro-gate-blur-overlay">
            <div className="pro-gate-blur-inner">
              <span className="pro-gate-lock-icon-lg">🔒</span>
              <span className="pro-gate-blur-label">Función Pro</span>
              <button
                className="primary-btn"
                style={{ marginTop: '0.5rem' }}
                onClick={e => { e.stopPropagation(); setShowModal(true) }}
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pro-gate-lock card" onClick={() => setShowModal(true)}>
          <div className="pro-gate-lock-icon-lg">🔒</div>
          <div className="pro-gate-lock-title">
            {lockLabel ?? 'Función Pro'}
          </div>
          {feature && (
            <div className="pro-gate-lock-desc muted">{feature}</div>
          )}
          <button
            className="primary-btn"
            style={{ marginTop: '1rem' }}
            onClick={e => { e.stopPropagation(); setShowModal(true) }}
          >
            ★ Desbloquear con Pro
          </button>
        </div>
      )}

      {showModal && (
        <UpgradeModal feature={feature} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
