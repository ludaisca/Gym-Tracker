import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore, useOfflineStore } from '../../store'
import { usersApi } from '../../api/users'
import { api } from '../../api/client'
import type { UserSettings } from '../../types/domain'
import {
  IconSun, IconMoon, IconDownload, IconUpload, IconTrash, IconLogout,
  IconUser, IconMail, IconLock, IconCamera,
} from '../ui/Icons'
import { toast } from '../../lib/toast'

const AVATARS = ['💪', '🏋️', '🔥', '⚡', '🎯', '🦁', '🐉', '🏆', '🧠', '🌊', '🦅', '🚀']

const ACCENT_THEMES = [
  { id: 'teal',   label: 'Teal',   lightColor: '#01696f', darkColor: '#4f98a3' },
  { id: 'forest', label: 'Forest', lightColor: '#2d6a4f', darkColor: '#52b788' },
  { id: 'ocean',  label: 'Ocean',  lightColor: '#1d6fa4', darkColor: '#4da6d9' },
  { id: 'ember',  label: 'Ember',   lightColor: '#c05c1a', darkColor: '#4f98a3' }, // Fixed ember dark color
  { id: 'violet', label: 'Violeta', lightColor: '#6d3bbf', darkColor: '#9b6de0' },
]

export default function Config() {
  const navigate = useNavigate()
  const { user, setAuth, accessToken, clearAuth } = useAuthStore()
  const { toggleTheme, theme, accentTheme, setAccentTheme } = useUIStore()
  const { queue, dequeue, clearQueue } = useOfflineStore()
  const [settings, setSettings] = useState<Partial<UserSettings>>(user?.settings ?? {})
  const [aiKey, setAiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [savedAi, setSavedAi] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [syncingQueue, setSyncingQueue] = useState(false)

  // Account form state
  const [accountName, setAccountName] = useState(user?.name ?? '')
  const [accountEmail, setAccountEmail] = useState(user?.email ?? '')
  const [accountCurrentPass, setAccountCurrentPass] = useState('')
  const [accountPass, setAccountPass] = useState('')
  const [updatingAccount, setUpdatingAccount] = useState(false)
  const [accountUpdated, setAccountUpdated] = useState(false)
  const [accountError, setAccountError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleManualSync() {
    if (syncingQueue || queue.length === 0) return
    setSyncingQueue(true)
    try {
      for (const action of queue) {
        try {
          await api.request({
            method: action.method,
            url: action.url,
            data: action.body,
          })
          dequeue(action.id)
        } catch {
          // Keep if failing
        }
      }
    } finally {
      setSyncingQueue(false)
    }
  }

  async function handleAccountUpdate() {
    setAccountError('')
    const emailChanged = accountEmail !== (user?.email ?? '')
    const passChanged = accountPass.trim().length >= 8
    if ((emailChanged || passChanged) && !accountCurrentPass) {
      setAccountError('Ingresa tu contraseña actual para guardar los cambios.')
      return
    }
    setUpdatingAccount(true)
    try {
      const payload: any = { name: accountName, email: accountEmail }
      if (passChanged) payload.password = accountPass.trim()
      if (emailChanged || passChanged) payload.currentPassword = accountCurrentPass
      const updated = await usersApi.update(payload)
      setAuth(updated, accessToken ?? '')
      setAccountPass('')
      setAccountCurrentPass('')
      setAccountUpdated(true)
      toast('Datos de cuenta actualizados')
      setTimeout(() => setAccountUpdated(false), 2000)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al actualizar la cuenta'
      setAccountError(msg)
    } finally {
      setUpdatingAccount(false)
    }
  }

  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 256
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = url
    })
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await compressImage(file)
      const updated = await usersApi.update({ avatar: base64 })
      setAuth(updated, accessToken ?? '')
      setShowAvatarPicker(false)
    } catch {
      toast('Error al procesar la imagen', 'error')
    }
  }

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
      const payload: Partial<UserSettings> & { aiKey?: string | null } = {
        aiProvider: 'google',
        aiModel: 'gemini-2.5-flash-lite',
      }
      if (aiKey.trim()) payload.aiKey = aiKey.trim()
      const updated = await usersApi.updateSettings(payload)
      setAiKey('')
      setSavedAi(true)
      if (user) setAuth({ ...user, settings: updated }, accessToken ?? '')
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

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleting(true)
    try {
      await api.delete('/users/me')
      clearAuth()
      navigate('/login')
    } catch {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const swatchColor = (t: typeof ACCENT_THEMES[0]) => theme === 'dark' ? t.darkColor : t.lightColor

  const isDataUrl = (s?: string) => s?.startsWith('data:image')

  return (
    <>
      {/* ── Perfil header ─────────────────────────────────────── */}
      <section className="card">
        <div className="profile-header-main">
          <button className="profile-avatar-large" onClick={() => setShowAvatarPicker(v => !v)} aria-label="Cambiar avatar">
            {isDataUrl(user?.avatar) ? (
              <img src={user?.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              user?.avatar ?? '💪'
            )}
          </button>
          <div className="profile-info">
            <h3>{user?.name ?? 'Usuario'}</h3>
            <p>Semana {user?.currentWeek ?? 1} · {user?.settings?.goal ?? 'Sin objetivo'}</p>
          </div>
          <button className="logout-btn-top" onClick={handleLogout}>
            <IconLogout size={16} />
            Cerrar sesión
          </button>
        </div>

        {showAvatarPicker && (
          <div style={{ padding: '0 var(--space-6) var(--space-6)', borderBottom: '1px solid var(--color-divider)' }}>
             <div className="nav-group-title" style={{ marginTop: 0, marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>Elige tu avatar</span>
               <button 
                 className="ghost-btn" 
                 style={{ fontSize: 'var(--text-xs)', padding: '.3rem .6rem' }}
                 onClick={() => fileInputRef.current?.click()}
               >
                 <IconCamera size={14} style={{ marginRight: '.4rem' }} /> Subir foto
               </button>
               <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoUpload} />
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

        <div className="week-selector-card">
          <label>Semana actual</label>
          <div className="week-controls">
            <button className="week-btn-circle" onClick={() => updateWeek(-1)} aria-label="Menos uno">−</button>
            <div className="week-value-large">{user?.currentWeek ?? 1}</div>
            <button className="week-btn-circle" onClick={() => updateWeek(1)} aria-label="Más uno">+</button>
          </div>
        </div>
      </section>

      {/* ── Datos de la cuenta ─────────────────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Datos de la cuenta</h3><p>Actualiza tu información personal.</p></div>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <IconUser size={14} /> Nombre
            </label>
            <input 
              type="text" 
              value={accountName} 
              onChange={e => setAccountName(e.target.value)} 
              placeholder="Tu nombre"
            />
          </div>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <IconMail size={14} /> Correo electrónico
            </label>
            <input 
              type="email" 
              value={accountEmail} 
              onChange={e => setAccountEmail(e.target.value)} 
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <IconLock size={14} /> Nueva contraseña
            </label>
            <input
              type="password"
              value={accountPass}
              onChange={e => setAccountPass(e.target.value)}
              placeholder="Dejar vacío para no cambiar"
              autoComplete="new-password"
            />
            <p className="tiny muted" style={{ marginTop: '.25rem' }}>Mínimo 8 caracteres si decides cambiarla.</p>
          </div>
          {(accountEmail !== (user?.email ?? '') || accountPass.trim().length >= 8) && (
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <IconLock size={14} /> Contraseña actual <span style={{ color: 'var(--danger)', marginLeft: '.2rem' }}>*</span>
              </label>
              <input
                type="password"
                value={accountCurrentPass}
                onChange={e => setAccountCurrentPass(e.target.value)}
                placeholder="Confirma tu contraseña actual"
                autoComplete="current-password"
              />
            </div>
          )}
          {accountError && (
            <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', margin: 0 }}>{accountError}</p>
          )}
          <button
            className="primary-btn"
            onClick={handleAccountUpdate}
            disabled={updatingAccount || !accountName || !accountEmail}
          >
            {updatingAccount ? 'Guardando…' : accountUpdated ? '¡Actualizado! ✓' : 'Guardar cambios de cuenta'}
          </button>
        </div>
      </section>

      {/* ── Apariencia ─────────────────────────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div><h3>Apariencia</h3><p>Modo de color y tema de la app.</p></div>
        </div>
        <div className="panel-body appearance-section">
          <div>
            <div className="nav-group-title" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>Modo</div>
            <div className="mode-toggle">
              <button className={`mode-toggle-btn${theme === 'light' ? ' active' : ''}`} onClick={() => theme === 'dark' && handleThemeToggle()}>
                <IconSun size={15} />
                Claro
              </button>
              <button className={`mode-toggle-btn${theme === 'dark' ? ' active' : ''}`} onClick={() => theme === 'light' && handleThemeToggle()}>
                <IconMoon size={15} />
                Oscuro
              </button>
            </div>
          </div>

          <div>
            <div className="nav-group-title" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>Color de acento</div>
            <div className="appearance-grid">
              {ACCENT_THEMES.map(t => (
                <button
                  key={t.id}
                  className={`theme-card-premium${accentTheme === t.id ? ' active' : ''}`}
                  onClick={() => handleAccentTheme(t.id)}
                >
                  <div className="theme-card-dot-large" style={{ background: swatchColor(t) }} />
                  <span className="theme-swatch-label">{t.label}</span>
                  {accentTheme === t.id && <div className="theme-card-check">✓</div>}
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
          <div>
            <h3>Asistente de Inteligencia Artificial</h3>
            <p>Conecta tu cuenta con Google Gemini (modelo <strong>gemini-2.5-flash-lite</strong> optimizado por defecto) para obtener análisis instantáneos de tus entrenamientos y escaneo visual de comidas.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="field" style={{ maxWidth: '400px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Google Gemini API Key</span>
              {user?.settings?.aiKeySet && (
                <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                  ● Conectado
                </span>
              )}
            </label>
            <input
              type="password"
              placeholder={user?.settings?.aiKeySet ? '••••••••••••••••••••  (dejar vacío para mantener)' : 'AIzaSy…'}
              value={aiKey}
              onChange={e => setAiKey(e.target.value)}
              autoComplete="off"
            />
            <div className="tiny muted" style={{ marginTop: 'var(--space-1)' }}>
              Tu clave se almacena de forma segura/cifrada localmente. Puedes obtener una gratuita en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Google AI Studio</a>.
            </div>
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 0, display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button className="primary-btn" onClick={saveAiSettings} disabled={savingAi}>
            {savingAi ? 'Guardando…' : savedAi ? 'Guardado ✓' : 'Guardar API Key'}
          </button>
          {user?.settings?.aiKeySet && (
            <button
              className="ghost-btn"
              style={{ padding: '.45rem .8rem', fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}
              onClick={async () => {
                setSavingAi(true)
                try {
                  const updated = await usersApi.updateSettings({ aiProvider: null, aiModel: null, aiKey: null })
                  setAiKey('')
                  if (user) setAuth({ ...user, settings: updated }, accessToken ?? '')
                } finally {
                  setSavingAi(false)
                }
              }}
              disabled={savingAi}
            >
              Desconectar IA
            </button>
          )}
        </div>
      </section>

      {/* ── Sincronización Local ──────────────────────────────── */}
      <section className="card">
        <div className="panel-head">
          <div>
            <h3>Sincronización Local (Modo Offline)</h3>
            <p>Acciones guardadas localmente en espera de conexión.</p>
          </div>
          {queue.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
              <button
                className="ghost-btn"
                style={{ padding: '.3rem .6rem', fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}
                onClick={() => clearQueue()}
                disabled={syncingQueue}
              >
                Limpiar cola
              </button>
              <button
                className="primary-btn"
                style={{ padding: '.3rem .6rem', fontSize: 'var(--text-xs)' }}
                onClick={handleManualSync}
                disabled={syncingQueue}
              >
                {syncingQueue ? 'Enviando…' : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.54"/></svg> Sincronizar</>)
                }
              </button>
            </div>
          )}
        </div>
        <div className="panel-body">
          {queue.length === 0 ? (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              ✓ Todas las acciones están sincronizadas con el servidor.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {queue.length} {queue.length === 1 ? 'acción pendiente' : 'acciones pendientes'} de envío
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-2)', maxHeight: '120px', overflowY: 'auto', background: 'var(--color-bg-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                {queue.map(a => (
                  <div key={a.id} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>{a.method}</strong> {a.url}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <div><h3>Datos y almacenamiento</h3><p>Exportar o importar datos.</p></div>
        </div>
        <div className="panel-body triple">
          <div>
            <p className="tiny muted" style={{ marginBottom: '.75rem' }}>Descarga un respaldo completo de tus datos en formato JSON.</p>
            <button className="primary-btn" style={{ borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.4rem' }} onClick={handleExport}>
              <IconDownload size={15} /> Exportar JSON
            </button>
          </div>
          <div>
            <p className="tiny muted" style={{ marginBottom: '.75rem' }}>Carga un archivo JSON exportado previamente para restaurar tus datos.</p>
            <button className="ghost-btn" style={{ borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.4rem' }} onClick={handleImport}>
              <IconUpload size={15} /> Importar JSON
            </button>
          </div>
          <div>
            <p className="tiny muted" style={{ marginBottom: '.75rem' }}>Elimina permanentemente tu cuenta y todos tus datos. Esta acción es irreversible.</p>
            {!deleteConfirm ? (
              <button
                style={{ borderRadius: 'var(--radius-lg)', padding: '.7rem 1rem', border: '1px solid var(--color-warning)', background: 'transparent', color: 'var(--color-warning)', fontWeight: 700, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}
                onClick={handleDeleteAccount}
              >
                <IconTrash size={15} /> Eliminar cuenta
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', fontWeight: 700 }}>¿Seguro? Esta acción no se puede deshacer.</p>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button
                    style={{ flex: 1, padding: '.6rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-warning)', background: 'var(--color-warning)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button className="ghost-btn" style={{ flex: 1 }} onClick={() => setDeleteConfirm(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
