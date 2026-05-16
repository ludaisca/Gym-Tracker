import { useState, type FormEvent } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { Lock, Eye, EyeOff, XCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { hapticImpact } from '../../lib/haptics'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const token = searchParams.get('token') ?? ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    hapticImpact('light')
    setError('')
    if (password !== confirm) {
      hapticImpact('heavy')
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!token) {
      hapticImpact('heavy')
      setError('Enlace inválido.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      hapticImpact('heavy')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      hapticImpact('heavy')
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al restablecer la contraseña.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
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
          key={!token ? 'invalid' : done ? 'success' : 'form'}
          className="auth-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {!token ? (
            <div style={{ textAlign: 'center' }}>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', borderRadius: '50%', color: 'var(--color-warning)', marginBottom: 'var(--space-4)' }}>
                <XCircle size={48} strokeWidth={1.5} />
              </motion.div>
              <motion.h1 variants={itemVariants}>Enlace inválido</motion.h1>
              <motion.p variants={itemVariants} className="subtitle" style={{ marginBottom: 'var(--space-6)' }}>
                Este enlace no es válido o ha expirado. Solicita uno nuevo.
              </motion.p>
              <motion.div variants={itemVariants}>
                <Link to="/olvide-contrasena" style={{ textDecoration: 'none' }}>
                  <button className="primary-btn" style={{ width: '100%', padding: '1rem' }} onClick={() => hapticImpact('light')}>
                    Solicitar nuevo enlace
                  </button>
                </Link>
              </motion.div>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center' }}>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', borderRadius: '50%', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>
                <CheckCircle2 size={48} strokeWidth={1.5} />
              </motion.div>
              <motion.h1 variants={itemVariants} style={{ marginBottom: 'var(--space-2)' }}>¡Contraseña actualizada!</motion.h1>
              <motion.p variants={itemVariants} className="subtitle">
                Serás redirigido al inicio de sesión en unos segundos…
              </motion.p>
            </div>
          ) : (
            <>
              <motion.div variants={itemVariants} style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <div className="brand-mark" style={{ boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3 10v4"/><path d="M21 10v4"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M3 12h18"/>
                  </svg>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={{ textAlign: 'center' }}>
                <h1>Nueva contraseña</h1>
                <p className="subtitle">Elige una contraseña segura para tu cuenta.</p>
              </motion.div>

              <motion.div variants={itemVariants}>
                {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}
              </motion.div>

              <motion.form variants={itemVariants} className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>Nueva contraseña (mínimo 8 caracteres)</label>
                  <div className="auth-input-wrap">
                    <div className="auth-input-icon"><Lock size={18} /></div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      required minLength={8} autoComplete="new-password" 
                      style={{ paddingRight: '40px' }}
                    />
                    <button 
                      type="button" 
                      className="auth-pwd-toggle"
                      onClick={() => { hapticImpact('light'); setShowPassword(!showPassword) }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label>Confirmar contraseña</label>
                  <div className="auth-input-wrap">
                    <div className="auth-input-icon"><Lock size={18} /></div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={confirm} 
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••" 
                      required minLength={8} autoComplete="new-password" 
                      style={{ paddingRight: '40px' }}
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </motion.form>

              <motion.p variants={itemVariants} className="auth-link">
                <Link to="/login" onClick={() => hapticImpact('light')} style={{ color: 'var(--color-text-muted)', borderBottom: 'none' }}>← Volver al inicio de sesión</Link>
              </motion.p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
