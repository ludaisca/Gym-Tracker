import { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api/client'
import { IconClose } from '../ui/Icons'

interface Props {
  onDone: () => void
}

export default function MigrationModal({ onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function migrate() {
    setLoading(true)
    setError('')
    try {
      const raw = localStorage.getItem('gymtracker_v3')
      if (!raw) { dismiss(); return }
      const payload = JSON.parse(raw)
      await api.post('/migrate/localstorage', { gymtracker_v3: payload })
      localStorage.setItem('gym_migrated', 'true')
      onDone()
    } catch {
      setError('Error al migrar. Puedes intentarlo de nuevo o saltar.')
    } finally {
      setLoading(false)
    }
  }

  function dismiss() {
    localStorage.setItem('gym_migrated', 'true')
    onDone()
  }

  return createPortal(
    <div className="side-panel-overlay open">
      <div className="side-panel">
        <div className="side-panel-drag-handle" />

        <div className="side-panel-header">
          <div className="side-panel-title-area">
            <h3>📦 Datos detectados</h3>
            <p>Historial de la versión anterior de Gym Tracker</p>
          </div>
          <button className="side-panel-close-btn" onClick={dismiss} aria-label="Cerrar">
            <IconClose size={18} />
            <span>Cerrar</span>
          </button>
        </div>

        <div className="side-panel-body">
          <div className="preview-day-card">
            <div className="preview-day-card-head">
              <span className="preview-day-label">¿Qué se importará?</span>
            </div>
            <div className="preview-day-exercises">
              {[
                'Sesiones, notas, rutinas y configuración',
                'Los datos se sincronizarán en todos tus dispositivos',
                'Los datos locales originales no se eliminan',
              ].map((item, i) => (
                <div key={i} className="preview-exercise-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                    <span className="preview-exercise-idx">✓</span>
                    <div className="preview-exercise-name">{item}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', padding: '0 var(--space-1)' }}>{error}</p>
          )}
        </div>

        <div className="side-panel-footer">
          <button className="primary-btn" onClick={migrate} disabled={loading} style={{ flex: 1, padding: '1rem' }}>
            {loading ? 'Importando…' : 'Importar historial'}
          </button>
          <button className="ghost-btn" onClick={dismiss} disabled={loading} style={{ flex: 0 }}>Saltar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
