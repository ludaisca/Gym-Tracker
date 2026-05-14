import { useState, type FormEvent } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const token = searchParams.get('token') ?? ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!token) {
      setError('Enlace inválido.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al restablecer la contraseña.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page fade-in">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>❌</div>
          <h1>Enlace inválido</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
            Este enlace no es válido. Solicita uno nuevo.
          </p>
          <Link to="/olvide-contrasena" className="primary-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="auth-page fade-in">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>✅</div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>¡Contraseña actualizada!</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Serás redirigido al inicio de sesión en unos segundos…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page fade-in">
      <div className="auth-card">
        <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 10v4"/><path d="M21 10v4"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M3 12h18"/>
            </svg>
          </div>
          <div><h1 style={{ fontSize: 'var(--text-lg)', marginBottom: 0 }}>Gym Tracker</h1></div>
        </div>

        <h1>Nueva contraseña</h1>
        <p>Elige una contraseña segura para tu cuenta.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Nueva contraseña (mínimo 8 caracteres)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="auth-field">
            <label>Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••" required minLength={8} autoComplete="new-password" />
          </div>
          <button type="submit" className="primary-btn auth-submit" disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login" style={{ color: 'var(--color-text-muted)' }}>← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
