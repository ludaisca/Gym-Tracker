import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../../store'
import { usersApi } from '../../api/users'
import type { UserSettings } from '../../types/domain'

const AVATARS = ['💪', '🏋️', '🔥', '⚡', '🎯', '🦁', '🐉', '🏆', '🧠', '🌊', '🦅', '🚀']

const ACCENT_THEMES = [
  { id: 'teal',   label: 'Teal',   lightColor: '#01696f', darkColor: '#4f98a3' },
  { id: 'forest', label: 'Forest', lightColor: '#2d6a4f', darkColor: '#52b788' },
  { id: 'ocean',  label: 'Ocean',  lightColor: '#1d6fa4', darkColor: '#4da6d9' },
  { id: 'ember',  label: 'Ember',   lightColor: '#c05c1a', darkColor: '#f4874a' },
  { id: 'violet', label: 'Violeta', lightColor: '#6d3bbf', darkColor: '#9b6de0' },
]

export default function Config() {
  const navigate = useNavigate()
  const { user, setAuth, accessToken, clearAuth } = useAuthStore()
  const { toggleTheme, theme, accentTheme, setAccentTheme } = useUIStore()
  const [settings, setSettings] = useState<Partial<UserSettings>>(user?.settings ?? {})
  const [aiKey, setAiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [savedAi, setSavedAi] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  async function saveSettings() {
    setSaving(true)
    try {
      await usersApi.updateSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function saveAiSettings() {
    setSavingAi(true)
    try {
      const payload: Partial<UserSettings> & { aiKey?: string } = {
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel || null,
      }
      if (aiKey.trim()) payload.aiKey = aiKey.trim()
      await usersApi.updateSettings(payload)
      setAiKey('')
      setSavedAi(true)
      setTimeout(() => setSavedAi(false), 2000)
    } finally {
      setSavingAi(false)
    }
  }

  async function updateWeek(delta: number) {
    if (!user) return
    const newWeek = Math.max(1, user.currentWeek + delta)
    const updated = await usersApi.update({ currentWeek: newWeek })
    setAuth(updated, accessToken ?? '')
  }

  async function handleAvatarSelect(avatar: string) {
    setShowAvatarPicker(false)
    const updated = await usersApi.update({ avatar })
    setAuth(updated, accessToken ?? '')
  }

  async function handleAccentTheme(id: string) {
    setAccentTheme(id)
    await usersApi.update({ accentTheme: id }).catch(() => {})
  }

  async function handleThemeToggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    toggleTheme()
    await usersApi.update({ theme: next }).catch(() => {})
  }

  async function handleExport() {
    const data = await usersApi.export()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gymtracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const payload = JSON.parse(text)
      await usersApi.import(payload)
      window.location.reload()
    }
    input.click()
  }

  async function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  const swatchColor = (t: typeof ACCENT_THEMES[0]) => theme === 'dark' ? t.darkColor : t.lightColor

  return (
    <>
      {/* ── Perfil header ─────────────────────────────────────── */}
      <section className="card">
        <div className="profile-header">
          <button className="profile-avatar" onClick={() => setShowAvatarPicker(v => !v)} aria-label="Cambiar avatar">
            {user?.avatar ?? '💪'}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">{user?.name ?? 'Usuario'}</div>
            <div className="profile-meta">Semana {user?.currentWeek ?? 1} · {user?.settings?.goal ?? 'Sin objetivo'}</div>
          </div>
          <button className="ghost-btn" style={{ padding: '.45rem .8rem', flexShrink: 0 }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>

        {showAvatarPicker && (
          <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>
              Elige tu avatar
            </div>
            <div className="avatar-picker">
              {AVATARS.map(a => (
                <button
                  key={a}
                  className={`avatar-option${user?.avatar === a ? ' selected' : ''}`}
                  onClick={() => handleAvatarSelect(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="panel-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div className="field" style={{ flexShrink: 0 }}>
              <label>Semana actual</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <button className="ghost-btn" style={{ padding: '.45rem .7rem' }} onClick={() => updateWeek(-1)}>−</button>
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}>
                  {user?.currentWeek ?? 1}
                </strong>
                <button className="ghost-btn" style={{ padding: '.45rem .7rem' }} onClick={() => updateWeek(1)}>+</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Apariencia ─────────────────────────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Apariencia</h3><p>Modo de color y tema de la app.</p></div>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Modo
            </div>
            <div className="mode-toggle">
              <button className={`mode-toggle-btn${theme === 'light' ? ' active' : ''}`} onClick={() => theme === 'dark' && handleThemeToggle()}>
                ☀️ Claro
              </button>
              <button className={`mode-toggle-btn${theme === 'dark' ? ' active' : ''}`} onClick={() => theme === 'light' && handleThemeToggle()}>
                🌙 Oscuro
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Color de acento
            </div>
            <div className="theme-picker">
              {ACCENT_THEMES.map(t => (
                <button
                  key={t.id}
                  className={`theme-swatch${accentTheme === t.id ? ' active' : ''}`}
                  onClick={() => handleAccentTheme(t.id)}
                >
                  <span className="theme-swatch-dot" style={{ background: swatchColor(t) }} />
                  <span className="theme-swatch-label">{t.label}</span>
                  {accentTheme === t.id && <span style={{ fontSize: 10, color: 'var(--color-primary)' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Preferencias de entrenamiento ──────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Preferencias de entrenamiento</h3><p>Duración de sesión, objetivo y cardio por defecto.</p></div>
        </div>
        <div className="panel-body triple">
          <div className="field">
            <label>Duración de sesión</label>
            <select
              value={settings.sessionLength ?? '90-120 min'}
              onChange={e => setSettings(s => ({ ...s, sessionLength: e.target.value }))}
            >
              <option>90-120 min</option>
              <option>60-90 min</option>
              <option>45-60 min</option>
            </select>
          </div>
          <div className="field">
            <label>Objetivo</label>
            <select
              value={settings.goal ?? 'Hipertrofia'}
              onChange={e => setSettings(s => ({ ...s, goal: e.target.value }))}
            >
              <option>Definición</option>
              <option>Hipertrofia</option>
              <option>Recomposición</option>
            </select>
          </div>
          <div className="field">
            <label>Cardio default</label>
            <select
              value={settings.cardioDefault ?? '20 min'}
              onChange={e => setSettings(s => ({ ...s, cardioDefault: e.target.value }))}
            >
              <option>15 min</option>
              <option>20 min</option>
              <option>25 min</option>
            </select>
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <button className="primary-btn" onClick={saveSettings} disabled={saving}>
            {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar preferencias'}
          </button>
        </div>
      </section>

      {/* ── Integración IA ────────────────────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Integración de IA</h3><p>Análisis personalizado de tu entrenamiento. La API key se guarda de forma segura en el servidor.</p></div>
        </div>
        <div className="panel-body triple">
          <div className="field">
            <label>Proveedor</label>
            <select
              value={settings.aiProvider ?? ''}
              onChange={e => setSettings(s => ({ ...s, aiProvider: e.target.value || null }))}
            >
              <option value="">Sin IA</option>
              <option value="google">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>
          <div className="field">
            <label>Modelo (opcional)</label>
            <input
              placeholder={
                settings.aiProvider === 'openai' ? 'gpt-4o-mini'
                : settings.aiProvider === 'anthropic' ? 'claude-haiku-4-5-20251001'
                : 'gemini-2.5-flash-lite'
              }
              value={settings.aiModel ?? ''}
              onChange={e => setSettings(s => ({ ...s, aiModel: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>
              API Key{' '}
              {user?.settings?.aiKeySet && <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-xs)' }}>● Configurada</span>}
            </label>
            <input
              type="password"
              placeholder={user?.settings?.aiKeySet ? '••••••••••••  (dejar vacío para no cambiar)' : 'Pegar tu API key aquí'}
              value={aiKey}
              onChange={e => setAiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <button className="primary-btn" onClick={saveAiSettings} disabled={savingAi}>
            {savingAi ? 'Guardando…' : savedAi ? 'Guardado ✓' : 'Guardar configuración de IA'}
          </button>
        </div>
      </section>

      {/* ── Datos ─────────────────────────────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Datos y almacenamiento</h3><p>Exportar o importar datos.</p></div>
        </div>
        <div className="panel-body triple">
          <div>
            <p className="tiny muted" style={{ marginBottom: '.75rem' }}>Descarga un respaldo completo de tus datos en formato JSON.</p>
            <button className="primary-btn" style={{ borderRadius: 'var(--radius-lg)' }} onClick={handleExport}>
              ⬇ Exportar JSON
            </button>
          </div>
          <div>
            <p className="tiny muted" style={{ marginBottom: '.75rem' }}>Carga un archivo JSON exportado previamente para restaurar tus datos.</p>
            <button className="ghost-btn" style={{ borderRadius: 'var(--radius-lg)' }} onClick={handleImport}>
              ⬆ Importar JSON
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
