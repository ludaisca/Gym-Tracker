import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store'

type LoginState = 'idle' | 'loading' | 'unverified' | 'resent'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<LoginState>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setState('loading')
    try {
      const data = await authApi.login({ email, password })
      localStorage.setItem('gym-refresh-token', data.refreshToken)
      setAuth(data.user, data.accessToken)
      navigate('/dashboard')
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string; code?: string } } })?.response?.data
      if (res?.code === 'EMAIL_NOT_VERIFIED') {
        setState('unverified')
      } else {
        setState('idle')
        setError(res?.error ?? 'Error al iniciar sesión')
      }
    }
  }

  async function handleResend() {
    setState('loading')
    try {
      await authApi.resendVerification(email)
      setState('resent')
    } catch {
      setState('unverified')
      setError('No se pudo reenviar el correo. Intenta más tarde.')
    }
  }

  // Pantalla: cuenta no verificada
  if (state === 'unverified' || state === 'resent') {
    return (
      <div className="auth-page fade-in">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>
            {state === 'resent' ? '✅' : '📧'}
          </div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>
            {state === 'resent' ? 'Correo reenviado' : 'Cuenta no verificada'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            {state === 'resent'
              ? <>Revisa tu bandeja de entrada en <strong style={{ color: 'var(--color-text)' }}>{email}</strong> y haz clic en el enlace de verificación.</>
              : <>Necesitas verificar tu correo antes de iniciar sesión. ¿Quieres que te enviemos el enlace de nuevo?</>
            }
          </p>
          {error && <div className="auth-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
          {state === 'unverified' && (
            <button className="primary-btn" onClick={handleResend} style={{ width: '100%', marginBottom: 'var(--space-3)' }}>
              Reenviar correo de verificación
            </button>
          )}
          <button className="secondary-btn" onClick={() => setState('idle')} style={{ width: '100%' }}>
            Volver al inicio de sesión
          </button>
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

        <h1>Bienvenido</h1>
        <p>Inicia sesión para continuar</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoComplete="email" />
          </div>
          <div className="auth-field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <div style={{ textAlign: 'right', marginTop: 'calc(var(--space-1) * -1)', marginBottom: 'var(--space-2)' }}>
            <Link to="/olvide-contrasena" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <button type="submit" className="primary-btn auth-submit" disabled={state === 'loading'}>
            {state === 'loading' ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Crear cuenta</Link>
        </p>
      </div>
    </div>
  )
}
