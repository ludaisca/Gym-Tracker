import { useState, useEffect } from 'react'
import { IconDumbbell, IconClose } from './Icons'

const DISMISSED_KEY = 'gym-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !deferredPrompt) return null

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="install-prompt" role="banner">
      <span className="install-prompt-icon" aria-hidden="true" style={{ color: 'var(--color-primary)' }}><IconDumbbell size={24} strokeWidth={1.5} /></span>
      <div className="install-prompt-text">
        <div className="install-prompt-title">Instalar Gym Tracker</div>
        <div className="install-prompt-sub">Acceso rápido desde tu pantalla de inicio</div>
      </div>
      <div className="install-prompt-actions">
        <button className="primary-btn" style={{ padding: '.4rem .9rem', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-full)' }} onClick={install}>
          Instalar
        </button>
        <button className="install-prompt-dismiss" onClick={dismiss} aria-label="Descartar">
          <IconClose size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
