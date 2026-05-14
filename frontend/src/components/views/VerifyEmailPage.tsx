import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'

type Status = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('El enlace de verificación no es válido.')
      return
    }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.error ?? 'El enlace es inválido o ha expirado.')
      })
  }, [searchParams])

  return (
    <div className="auth-page fade-in">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>⏳</div>
            <h1>Verificando tu cuenta…</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>🎉</div>
            <h1 style={{ marginBottom: 'var(--space-2)' }}>¡Cuenta verificada!</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
              Tu cuenta está activa. Ya puedes iniciar sesión.
            </p>
            <Link to="/login" className="primary-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>❌</div>
            <h1 style={{ marginBottom: 'var(--space-2)' }}>Enlace inválido</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
              {message}
            </p>
            <Link to="/login" className="primary-btn" style={{ display: 'inline-block', textDecoration: 'none', marginBottom: 'var(--space-3)' }}>
              Ir al inicio de sesión
            </Link>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
              Desde ahí puedes solicitar que te reenviemos el correo de verificación.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
