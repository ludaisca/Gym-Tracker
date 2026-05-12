import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store'
import { useSessions } from '../../hooks/useSessions'
import { getDayIds, calcStreak, calcWeekVolume } from '../../lib/fitness'
import { aiApi, type ChatMessage } from '../../api/ai'

function renderLine(line: string): React.ReactNode {
  const parts = line.split(/\*\*(.*?)\*\*/g)
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
}

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: '0.4em' }} />
    if (/^#+\s/.test(line)) {
      return <div key={i} style={{ fontWeight: 700, marginTop: '0.75rem', marginBottom: '0.2rem' }}>{renderLine(line.replace(/^#+\s/, ''))}</div>
    }
    if (/^[-•]\s/.test(line)) {
      return <div key={i} style={{ paddingLeft: '0.25rem' }}>• {renderLine(line.replace(/^[-•]\s/, ''))}</div>
    }
    return <div key={i}>{renderLine(line)}</div>
  })
}

export default function Insights() {
  const { user } = useAuthStore()
  const weekNumber = user?.currentWeek ?? 1
  const activeRoutineId = user?.activeRoutineId ?? null
  const dayIds = useMemo(() => getDayIds(activeRoutineId, []), [activeRoutineId])
  const hasAI = !!(user?.settings?.aiProvider && user?.settings?.aiKeySet)

  const { sessions } = useSessions(weekNumber)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const streak = useMemo(() => calcStreak(sessions, dayIds, weekNumber), [sessions, dayIds, weekNumber])
  const weekVol = useMemo(() => Math.round(calcWeekVolume(sessions, weekNumber, dayIds)), [sessions, weekNumber, dayIds])
  const completedDays = dayIds.filter(d => sessions.find(s => s.weekNumber === weekNumber && s.dayId === d)?.complete).length

  useEffect(() => {
    if (!hasAI) { setHistoryLoaded(true); return }
    aiApi.getChat()
      .then(msgs => { setMessages(msgs); setHistoryLoaded(true) })
      .catch(() => setHistoryLoaded(true))
  }, [hasAI])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')
    const userMsg: ChatMessage = { role: 'user', content: text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const assistantMsg = await aiApi.sendMessage(text)
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al contactar la IA. Verifica tu configuración en Ajustes.')
    } finally {
      setLoading(false)
    }
  }

  async function clearChat() {
    await aiApi.clearChat().catch(() => {})
    setMessages([])
    setError('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <div className="kpis">
        <article className="card kpi">
          <div className="kpi-label">Racha activa</div>
          <div className="kpi-value">{streak > 0 ? '🔥' : ''} {streak}</div>
          <div className="kpi-meta">{streak >= 2 ? 'semanas seguidas' : 'semanas'}</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Volumen semana {weekNumber}</div>
          <div className="kpi-value">{weekVol > 0 ? `${(weekVol / 1000).toFixed(1)}k` : '—'}</div>
          <div className="kpi-meta">kg × reps total</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Sesiones cerradas</div>
          <div className="kpi-value">{completedDays}/{dayIds.length}</div>
          <div className="kpi-meta">esta semana</div>
        </article>
      </div>

      <section className="card chat-card">
        <div className="panel-head" style={{ padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
          <div>
            <h3>Chat con IA</h3>
            <p>Pregunta sobre tu progreso, técnica o planificación.</p>
          </div>
          {messages.length > 0 && (
            <button
              className="ghost-btn"
              style={{ padding: '.4rem .8rem', fontSize: 'var(--text-xs)', flexShrink: 0 }}
              onClick={clearChat}
            >
              Limpiar chat
            </button>
          )}
        </div>

        <div className="chat-messages">
          {!hasAI && (
            <div className="chat-empty">
              <p>Configura un proveedor de IA en <strong>Configuración → IA</strong> para usar el chat.</p>
            </div>
          )}
          {hasAI && historyLoaded && messages.length === 0 && !loading && (
            <div className="chat-empty">
              <p>¡Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Pregúntame sobre tu progreso, técnica o planificación de entrenamiento.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <div className={`chat-bubble ${m.role}`}>
                {m.role === 'assistant' ? renderContent(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg assistant">
              <div className="chat-bubble assistant chat-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          {error && !loading && (
            <div className="chat-msg assistant">
              <div className="chat-bubble assistant" style={{ color: 'var(--color-warning)' }}>{error}</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {hasAI && (
          <div className="chat-input-row">
            <textarea
              className="chat-input"
              placeholder="Escribe tu pregunta… (Enter para enviar)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="primary-btn chat-send-btn"
              onClick={send}
              disabled={loading || !input.trim()}
              title="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        )}
      </section>
    </>
  )
}
