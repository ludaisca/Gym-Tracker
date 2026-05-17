import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../store'

const COMPARE_ROWS = [
  { label: 'Logging de entrenamientos', free: '✓', pro: '✓' },
  { label: 'Rutinas personalizadas',    free: 'máx. 3', pro: '✓ ilimitadas' },
  { label: 'Historial de sesiones',     free: '8 semanas', pro: '✓ completo' },
  { label: 'Estadísticas avanzadas',    free: '—', pro: '✓' },
  { label: 'Gráficas de progresión',    free: '—', pro: '✓' },
  { label: 'Asistente IA (BYOK)',       free: '—', pro: '✓' },
  { label: 'Análisis de comida IA',     free: '—', pro: '✓' },
  { label: 'Duelos con amigos',         free: '—', pro: '✓' },
  { label: 'Notificaciones push',       free: '—', pro: '✓' },
  { label: 'Exportar datos',            free: '—', pro: '✓' },
  { label: 'Publicar en Marketplace',   free: '—', pro: '✓' },
]

const FAQS = [
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. Si cancelas, conservas el acceso Pro hasta el final del período pagado.',
  },
  {
    q: '¿Qué pasa con mis datos si vuelvo al plan gratuito?',
    a: 'Tus datos nunca se borran. Solo pierdes acceso a las funciones Pro; puedes volver a Pro cuando quieras.',
  },
  {
    q: '¿El período de prueba requiere tarjeta de crédito?',
    a: 'No. Los 7 días de prueba son completamente gratis, sin necesidad de datos de pago.',
  },
  {
    q: '¿Cuándo llega la integración de pago?',
    a: 'Estamos trabajando en ello. Por ahora puedes activar el período de prueba gratuito.',
  },
]

export default function Upgrade() {
  const navigate   = useNavigate()
  const updateUser = useAuthStore(s => s.updateUser)
  const user       = useAuthStore(s => s.user)

  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const hasTrial = !!user?.trialEndsAt
  const isPro    = user?.plan === 'pro'

  async function handleTrial() {
    setLoading(true)
    setError(null)
    try {
      const updated = await usersApi.activateTrial()
      updateUser({ trialEndsAt: updated.trialEndsAt })
      setSuccess(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'No se pudo activar la prueba. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upgrade-page">
      {/* Hero */}
      <div className="upgrade-hero">
        <span className="upgrade-hero-crown">♛</span>
        <h1>Gym Tracker Pro</h1>
        <p>Desbloquea todo el potencial de tu entrenamiento</p>
      </div>

      {/* Plan actual */}
      {isPro && (
        <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem', borderColor: 'var(--color-primary)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontWeight: 800, fontSize: 'var(--text-lg)' }}>Ya eres Pro</div>
          {user.planExpiresAt && (
            <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>
              Activo hasta {new Date(user.planExpiresAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}
            </p>
          )}
        </div>
      )}

      {/* Pricing cards */}
      {!isPro && (
        <div className="upgrade-pricing">
          <div className="upgrade-price-card">
            <div className="price-label">Mensual</div>
            <div className="price-amount">$4.99</div>
            <div className="price-period">/ mes</div>
          </div>
          <div className="upgrade-price-card selected">
            <div className="price-label">Anual</div>
            <div className="price-amount">$3.33</div>
            <div className="price-period">/ mes</div>
            <span className="price-save">Ahorra 33%</span>
          </div>
        </div>
      )}

      {/* CTAs */}
      {!isPro && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button className="primary-btn" style={{ fontSize: 'var(--text-base)', padding: '0.9rem' }} disabled>
            Suscribirse — Próximamente
          </button>

          {success ? (
            <div className="card" style={{ textAlign: 'center', padding: '1rem', borderColor: 'var(--color-primary)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                ¡Prueba activada! Tienes 7 días de acceso Pro.
              </div>
              <button className="ghost-btn" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/dashboard')}>
                Empezar →
              </button>
            </div>
          ) : hasTrial ? (
            <p className="muted" style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>
              Ya utilizaste tu período de prueba.
            </p>
          ) : (
            <button
              className="ghost-btn"
              style={{ fontSize: 'var(--text-sm)' }}
              onClick={handleTrial}
              disabled={loading}
            >
              {loading ? 'Activando…' : '7 días gratis — Sin tarjeta de crédito'}
            </button>
          )}

          {error && (
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Comparación */}
      <div className="upgrade-compare">
        <div className="upgrade-compare-title">QUÉ INCLUYE CADA PLAN</div>
        <div className="upgrade-compare-row" style={{ fontWeight: 700 }}>
          <span>Función</span>
          <span className="upgrade-compare-col" style={{ color: 'var(--color-text-faint)' }}>Free</span>
          <span className="upgrade-compare-col" style={{ color: 'var(--color-primary)' }}>Pro</span>
        </div>
        {COMPARE_ROWS.map(row => (
          <div key={row.label} className="upgrade-compare-row">
            <span>{row.label}</span>
            <span className="upgrade-compare-col" style={{ color: row.free === '—' ? 'var(--color-text-faint)' : 'inherit', fontSize: 'var(--text-xs)' }}>
              {row.free}
            </span>
            <span className="upgrade-compare-col" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
              {row.pro}
            </span>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="upgrade-faq">
        <div className="upgrade-faq-title">PREGUNTAS FRECUENTES</div>
        {FAQS.map(faq => (
          <div key={faq.q} className="upgrade-faq-item">
            <div className="upgrade-faq-q">{faq.q}</div>
            <div className="upgrade-faq-a">{faq.a}</div>
          </div>
        ))}
      </div>

      {/* Legal */}
      <div className="upgrade-legal">
        Al suscribirte aceptas los Términos de Servicio y la Política de Privacidad.<br />
        Puedes cancelar cuando quieras desde la configuración de tu cuenta.
      </div>
    </div>
  )
}
