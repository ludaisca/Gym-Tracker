import { useState } from 'react'
import { api } from '../../api/client'

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

  return (
    <div className="confirm-overlay open" style={{ zIndex: 300 }}>
      <div className="confirm-sheet">
        <div className="confirm-sheet-handle" />
        <div className="confirm-sheet-icon">📦</div>
        <h3>Datos del historial detectados</h3>
        <div className="confirm-sheet-body">
          <p>Encontramos datos de la versión anterior de Gym Tracker en este navegador.</p>
          <ul className="confirm-sheet-list" style={{ marginTop: 'var(--space-3)' }}>
            <li>✓ Se importarán tus sesiones, notas, rutinas y configuración</li>
            <li>✓ Los datos se sincronizarán en todos tus dispositivos</li>
            <li>✓ Los datos locales originales no se eliminan</li>
          </ul>
        </div>
        {error && <p style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>{error}</p>}
        <div className="confirm-sheet-actions">
          <button className="primary-btn" onClick={migrate} disabled={loading}>
            {loading ? 'Importando…' : 'Importar historial'}
          </button>
          <button className="ghost-btn" onClick={dismiss} disabled={loading}>Saltar por ahora</button>
        </div>
      </div>
    </div>
  )
}
