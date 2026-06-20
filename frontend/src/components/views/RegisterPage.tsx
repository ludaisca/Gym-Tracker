import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { AVATAR_IDS, AvatarIcon } from '../ui/Icons'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState<string>('dumbbell')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register({ name, email, password, avatar })
      setRegistered(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear cuenta'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="auth-page fade-in">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
              <path d="M9 12l-2 2 2 2"/>
            </svg>
          </div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Revisa tu correo</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            Te enviamos un enlace de verificación a <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
            Haz clic en él para activar tu cuenta.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            ¿No llegó? Revisa la carpeta de spam o{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              inicia sesión
            </Link>{' '}
            para reenviar el correo.
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
            <div className="avatar-picker">
              {AVATAR_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`avatar-option${id === avatar ? ' selected' : ''}`}
                  onClick={() => setAvatar(id)}
                  aria-label={id}
                >
                  <AvatarIcon id={id} size={22} strokeWidth={1.6} />
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
