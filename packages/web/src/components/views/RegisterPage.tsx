import { useState, useMemo, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle2, Zap, Flame, Target, Trophy, Dumbbell, Check, X } from 'lucide-react'
import { hapticImpact } from '../../lib/haptics'

const AVATARS = [
  { id: '1', icon: Dumbbell },
  { id: '2', icon: Zap },
  { id: '3', icon: Flame },
  { id: '4', icon: Target },
  { id: '5', icon: Trophy }
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [avatar, setAvatar] = useState('1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const pwChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }), [password])
  const pwValid = pwChecks.length && pwChecks.upper && pwChecks.number

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    hapticImpact('light')
    setError('')
    setLoading(true)
    try {
      await authApi.register({ name, email, password, avatar })
      setRegistered(true)
      hapticImpact('heavy')
    } catch (err: unknown) {
      hapticImpact('heavy')
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear cuenta'
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
          key={registered ? 'success' : 'form'}
          className="auth-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {registered ? (
            <div style={{ textAlign: 'center' }}>
              <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '1rem', background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', borderRadius: '50%', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>
                <CheckCircle2 size={48} strokeWidth={1.5} />
              </motion.div>
              
              <motion.h1 variants={itemVariants}>Revisa tu correo</motion.h1>
              
              <motion.p variants={itemVariants} className="subtitle" style={{ lineHeight: 1.6 }}>
                Te hemos enviado un enlace mágico a <strong style={{ color: 'var(--color-text)' }}>{email}</strong>. Haz clic en él para activar tu cuenta y empezar tu progreso.
              </motion.p>
              
              <motion.div variants={itemVariants} style={{ marginTop: 'var(--space-6)' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <button className="ghost-btn" style={{ width: '100%', padding: '1rem' }} onClick={() => hapticImpact('light')}>
                    Volver a Inicio de sesión
                  </button>
                </Link>
              </motion.div>
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
                <h1>Crear cuenta</h1>
                <p className="subtitle">Comienza a trackear tu evolución hoy</p>
              </motion.div>

              <motion.div variants={itemVariants}>
                {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}
              </motion.div>

              <motion.form variants={itemVariants} className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>Tu Nombre</label>
                  <div className="auth-input-wrap">
                    <div className="auth-input-icon"><User size={18} /></div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Alex" required />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Símbolo</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                    {AVATARS.map((a) => {
                      const Icon = a.icon
                      const isActive = a.id === avatar
                      return (
                        <button 
                          key={a.id} 
                          type="button" 
                          onClick={() => { hapticImpact('light'); setAvatar(a.id) }} 
                          style={{
                            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 'var(--radius-full)', transition: 'all 0.2s',
                            border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: isActive ? 'var(--color-primary-highlight)' : 'transparent',
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-faint)'
                          }}
                        >
                          <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="auth-field">
                  <label>Correo Electrónico</label>
                  <div className="auth-input-wrap">
                    <div className="auth-input-icon"><Mail size={18} /></div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" />
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
                      placeholder="Mín. 8 caracteres" 
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
                  {password.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {([
                        { ok: pwChecks.length, label: '8+ caracteres' },
                        { ok: pwChecks.upper,  label: 'Mayúscula' },
                        { ok: pwChecks.number, label: 'Número' },
                      ] as { ok: boolean; label: string }[]).map(({ ok, label }) => (
                        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: ok ? 'var(--color-success)' : 'var(--color-text-faint)' }}>
                          {ok ? <Check size={11} /> : <X size={11} />} {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="auth-submit" disabled={loading || !pwValid}>
                  {loading ? 'Preparando tu cuenta...' : 'Crear Cuenta'}
                </button>
              </motion.form>

              <motion.p variants={itemVariants} className="auth-link">
                ¿Ya eres miembro? <Link to="/login" onClick={() => hapticImpact('light')}>Inicia sesión</Link>
              </motion.p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
