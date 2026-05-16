import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Send, CheckCircle2 } from 'lucide-react'
import { hapticImpact } from '../../lib/haptics'

type LoginState = 'idle' | 'loading' | 'unverified' | 'resent'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState<LoginState>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    hapticImpact('light')
    setError('')
    setState('loading')
    try {
      const data = await authApi.login({ email, password })
      localStorage.setItem('gym-refresh-token', data.refreshToken)
      setAuth(data.user, data.accessToken)
      navigate('/dashboard')
    } catch (err: unknown) {
      hapticImpact('heavy')
      const res = (err as { response?: { data?: { error?: string; code?: string } } })?.response?.data
      if (res?.code === 'EMAIL_NOT_VERIFIED') {
        setState('unverified')
      } else {
        setState('idle')
        setError(res?.error ?? 'Credenciales incorrectas')
      }
    }
  }

  async function handleResend() {
    hapticImpact('light')
    setState('loading')
    try {
      await authApi.resendVerification(email)
      setState('resent')
    } catch {
      hapticImpact('heavy')
      setState('unverified')
      setError('No se pudo reenviar el correo. Intenta más tarde.')
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    },
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
          key={state === 'idle' || state === 'loading' ? 'login' : 'verify'}
          className="auth-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* VISTA: CUENTA NO VERIFICADA */}
          {(state === 'unverified' || state === 'resent') && (
            <div style={{ textAlign: 'center' }}>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', borderRadius: '50%', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
                {state === 'resent' ? <CheckCircle2 size={48} strokeWidth={1.5} /> : <Send size={48} strokeWidth={1.5} />}
              </motion.div>
              
              <motion.h1 variants={itemVariants}>
                {state === 'resent' ? 'Correo en camino' : 'Verifica tu cuenta'}
              </motion.h1>
              
              <motion.p variants={itemVariants} className="subtitle" style={{ lineHeight: 1.6 }}>
                {state === 'resent'
                  ? <>Enviamos un nuevo enlace a <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.</>
                  : <>Necesitas verificar tu correo electrónico para poder acceder a la plataforma.</>
                }
              </motion.p>
              
              <motion.div variants={itemVariants}>
                {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}
              </motion.div>

              <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {state === 'unverified' && (
                  <button className="auth-submit" onClick={handleResend} style={{ margin: 0 }}>
                    Reenviar verificación
                  </button>
                )}
                <button className="ghost-btn" onClick={() => setState('idle')} style={{ width: '100%', padding: '1rem' }}>
                  Volver al inicio de sesión
                </button>
              </motion.div>
            </div>
          )}

          {/* VISTA: LOGIN */}
          {(state === 'idle' || state === 'loading') && (
            <>
              <motion.div variants={itemVariants} style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <div className="brand-mark" style={{ boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3 10v4"/><path d="M21 10v4"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M3 12h18"/>
                  </svg>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={{ textAlign: 'center' }}>
                <h1>Bienvenido de vuelta</h1>
                <p className="subtitle">Introduce tus credenciales para acceder</p>
              </motion.div>

              <motion.div variants={itemVariants}>
                {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}
              </motion.div>

              <motion.form variants={itemVariants} className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>Correo Electrónico</label>
                  <div className="auth-input-wrap">
                    <div className="auth-input-icon"><Mail size={18} /></div>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com" 
                      required 
                      autoComplete="email" 
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Contraseña</label>
                  <div className="auth-input-wrap">
                    <div className="auth-input-icon"><Lock size={18} /></div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      required 
                      autoComplete="current-password" 
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

                <div style={{ textAlign: 'right', marginTop: 'calc(var(--space-2) * -1)' }}>
                  <Link to="/olvide-contrasena" style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none' }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <button type="submit" className="auth-submit" disabled={state === 'loading'}>
                  {state === 'loading' ? 'Accediendo...' : 'Iniciar Sesión'}
                </button>
              </motion.form>

              <motion.p variants={itemVariants} className="auth-link">
                ¿Aún no tienes cuenta? <Link to="/register" onClick={() => hapticImpact('light')}>Regístrate</Link>
              </motion.p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
