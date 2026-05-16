import { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api/client'
import { Package, Check } from 'lucide-react'

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
    <div className="confirm-overlay open" style={{ zIndex: 300 }}>
      <div className="confirm-sheet">
        <div className="confirm-sheet-handle" />
        <div className="confirm-sheet-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)', color: 'var(--color-primary)' }}>
          <Package size={48} strokeWidth={1.5} />
        </div>
        <h3 style={{ textAlign: 'center' }}>Datos del historial detectados</h3>
        <div className="confirm-sheet-body">
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Encontramos datos de la versión anterior de Gym Tracker en este navegador.</p>
          <ul className="confirm-sheet-list" style={{ marginTop: 'var(--space-3)', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', gap: '8px' }}><Check size={18} color="var(--color-success)" /> Se importarán tus sesiones, notas, rutinas y configuración</li>
            <li style={{ display: 'flex', gap: '8px' }}><Check size={18} color="var(--color-success)" /> Los datos se sincronizarán en todos tus dispositivos</li>
            <li style={{ display: 'flex', gap: '8px' }}><Check size={18} color="var(--color-success)" /> Los datos locales originales no se eliminan</li>
          </ul>
        </div>
        {error && <p style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)', textAlign: 'center' }}>{error}</p>}
        <div className="confirm-sheet-actions" style={{ marginTop: 'var(--space-5)' }}>
          <button className="primary-btn" onClick={migrate} disabled={loading}>
            {loading ? 'Importando…' : 'Importar historial'}
          </button>
          <button className="ghost-btn" onClick={dismiss} disabled={loading}>Saltar por ahora</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
