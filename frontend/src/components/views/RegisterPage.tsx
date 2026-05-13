import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store'

const AVATARS = ['💪', '🏋️', '🔥', '⚡', '🎯', '🦁', '🐺', '🏆']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('💪')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register({ name, email, password, avatar })
      localStorage.setItem('gym-refresh-token', data.refreshToken)
      setAuth(data.user, data.accessToken)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear cuenta'
      setError(msg)
    } finally {
      setLoading(false)
    }
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

        <h1>Crear cuenta</h1>
        <p>Empieza a trackear tu progreso</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Tu nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Claudio" required />
          </div>

          <div className="auth-field">
            <label>Avatar</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {AVATARS.map((a) => (
                <button key={a} type="button" onClick={() => setAvatar(a)} style={{
                  fontSize: '1.6rem', padding: '0.4rem', borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${a === avatar ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: a === avatar ? 'var(--color-primary-highlight)' : 'transparent',
                }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoComplete="email" />
          </div>

          <div className="auth-field">
            <label>Contraseña (mínimo 8 caracteres)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={8} autoComplete="new-password" />
          </div>

          <button type="submit" className="primary-btn auth-submit" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
