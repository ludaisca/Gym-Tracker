import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { Hourglass, PartyPopper, XCircle } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-blob b1" />
      <div className="auth-bg-blob b2" />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={status}
          className="auth-card" 
          style={{ textAlign: 'center' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {status === 'loading' && (
            <>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', borderRadius: '50%', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
                <Hourglass size={48} strokeWidth={1.5} className="spinner" />
              </motion.div>
              <motion.h1 variants={itemVariants}>Verificando tu cuenta…</motion.h1>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', borderRadius: '50%', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>
                <PartyPopper size={48} strokeWidth={1.5} />
              </motion.div>
              <motion.h1 variants={itemVariants} style={{ marginBottom: 'var(--space-2)' }}>¡Cuenta verificada!</motion.h1>
              <motion.p variants={itemVariants} className="subtitle" style={{ marginBottom: 'var(--space-6)' }}>
                Tu cuenta está activa. Ya puedes iniciar sesión.
              </motion.p>
              <motion.div variants={itemVariants}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <button className="primary-btn" style={{ width: '100%', padding: '1rem' }}>Iniciar sesión</button>
                </Link>
              </motion.div>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', borderRadius: '50%', color: 'var(--color-warning)', marginBottom: 'var(--space-4)' }}>
                <XCircle size={48} strokeWidth={1.5} />
              </motion.div>
              <motion.h1 variants={itemVariants} style={{ marginBottom: 'var(--space-2)' }}>Enlace inválido</motion.h1>
              <motion.p variants={itemVariants} className="subtitle" style={{ marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
                {message}
              </motion.p>
              <motion.div variants={itemVariants}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <button className="primary-btn" style={{ width: '100%', padding: '1rem', marginBottom: 'var(--space-3)' }}>Ir al inicio de sesión</button>
                </Link>
              </motion.div>
              <motion.p variants={itemVariants} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
                Desde ahí puedes solicitar que te reenviemos el correo de verificación.
              </motion.p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
