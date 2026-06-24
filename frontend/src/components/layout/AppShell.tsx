import { useMemo, useState, useEffect, useRef, Suspense } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUIStore, useAuthStore, useOfflineStore } from '../../store'
import { getRoutineDays } from '../../lib/fitness'
import { useRoutines } from '../../hooks/useRoutines'
import { useUser } from '../../hooks/useUser'
import { usersApi } from '../../api/users'
import Toaster from '../ui/Toaster'
import InstallPrompt from '../ui/InstallPrompt'
import {
  ModuleIcon,
  IconMenu, IconClose, IconSun, IconMoon,
  IconStarFilled, IconStar, IconCheck, IconArrowUp, IconArrowDown,
  IconDumbbell, UserAvatar, IconSettings,
} from '../ui/Icons'

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/agenda': 'Agenda semanal',
  '/nutricion': 'Nutrición',
  '/stats': 'Estadísticas',
  '/insights': 'Insights IA',
  '/rutinas': 'Rutinas',
  '/cardio': 'Cardio',
  '/notas': 'Notas',
  '/config': 'Configuración',
  '/duelos': 'Duelos',
}

export const ALL_MODULES = [
  { path: '/dashboard', label: 'Inicio',       desc: 'Panel principal',       group: 'Principal',    badge: '' },
  { path: '/agenda',    label: 'Agenda',        desc: 'Vista semanal',         group: 'Principal',    badge: '' },
  { path: '/nutricion', label: 'Nutrición',     desc: 'Calorías y macros',     group: 'Principal',    badge: '' },
  { path: '/stats',     label: 'Estadísticas',  desc: 'Tu progreso',           group: 'Principal',    badge: '' },
  { path: '/insights',  label: 'Insights IA',   desc: 'Análisis inteligente',  group: 'Principal',    badge: '' },
  { path: '/duelos',    label: 'Duelos',        desc: 'Retos con amigos',      group: 'Social',       badge: 'Nuevo' },
  { path: '/rutinas',   label: 'Mis Rutinas',   desc: 'Gestionar programas',   group: 'Herramientas', badge: '' },
  { path: '/cardio',    label: 'Cardio',        desc: 'Sesiones de cardio',    group: 'Herramientas', badge: '' },
  { path: '/notas',     label: 'Notas',         desc: 'Checklists y apuntes',  group: 'Herramientas', badge: '' },
  { path: '/config',    label: 'Configuración', desc: 'Perfil y ajustes',      group: 'Herramientas', badge: '' },
]

const MIN_FAV = 3
const MAX_FAV = 5

const NAV_MAIN = [
  { path: '/dashboard', label: 'Inicio' },
  { path: '/agenda',    label: 'Agenda' },
  { path: '/nutricion', label: 'Nutrición' },
  { path: '/stats',     label: 'Estadísticas' },
  { path: '/insights',  label: 'Insights IA' },
  { path: '/duelos',    label: 'Duelos', badge: 'Nuevo' },
]

const NAV_CONTROL = [
  { path: '/rutinas', label: 'Mis Rutinas' },
  { path: '/cardio',  label: 'Cardio' },
  { path: '/notas',   label: 'Notas' },
  { path: '/config',  label: 'Configuración' },
]

const MENU_GROUPS = ['Principal', 'Social', 'Herramientas'] as const
const byGroup = (g: string) => ALL_MODULES.filter(m => m.group === g)

// ── Nav editor component ─────────────────────────────────────────────────
function NavEditor({
  favorites,
  onChange,
  onClose,
}: {
  favorites: string[]
  onChange: (next: string[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<string[]>(favorites)

  const isSelected = (path: string) => draft.includes(path)

  function toggle(path: string) {
    if (isSelected(path)) {
      if (draft.length <= MIN_FAV) return // enforce minimum
      setDraft(draft.filter(p => p !== path))
    } else {
      if (draft.length >= MAX_FAV) return // enforce maximum
      setDraft([...draft, path])
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...draft]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setDraft(next)
  }

  function moveDown(idx: number) {
    if (idx === draft.length - 1) return
    const next = [...draft]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setDraft(next)
  }

  function save() {
    onChange(draft)
    onClose()
  }

  return (
    <div className="nav-editor-overlay">
      <div className="nav-editor">
        {/* Header */}
        <div className="nav-editor-head">
          <div>
            <div className="nav-editor-title">Personalizar barra inferior</div>
            <div className="nav-editor-sub">
              {draft.length}/{MAX_FAV} seleccionados · mínimo {MIN_FAV}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cancelar">
            <IconClose size={18} />
          </button>
        </div>

        <div className="nav-editor-body">
          {/* Current order preview */}
          <div className="nav-editor-section">
            <div className="nav-editor-label">Orden en la barra</div>
            <div className="nav-editor-order">
              {draft.map((path, idx) => {
                const mod = ALL_MODULES.find(m => m.path === path)!
                return (
                  <div key={path} className="nav-order-item">
                    <span className="nav-order-index">{idx + 1}</span>
                    <span className="nav-order-icon"><ModuleIcon path={path} size={18} /></span>
                    <span className="nav-order-label">{mod?.label}</span>
                    <div className="nav-order-arrows">
                      <button
                        className="nav-arrow-btn"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        aria-label="Subir"
                      >
                        <IconArrowUp size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        className="nav-arrow-btn"
                        onClick={() => moveDown(idx)}
                        disabled={idx === draft.length - 1}
                        aria-label="Bajar"
                      >
                        <IconArrowDown size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Module picker */}
          <div className="nav-editor-section">
            <div className="nav-editor-label">Módulos disponibles</div>
            {MENU_GROUPS.map(group => (
              <div key={group} className="nav-picker-group">
                <div className="nav-picker-group-title">{group}</div>
                <div className="nav-picker-grid">
                  {ALL_MODULES.filter(m => m.group === group).map(mod => {
                    const selected = isSelected(mod.path)
                    const canAdd = draft.length < MAX_FAV
                    const canRemove = draft.length > MIN_FAV
                    const disabled = selected ? !canRemove : !canAdd
                    return (
                      <button
                        key={mod.path}
                        className={`nav-picker-item ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                        onClick={() => !disabled && toggle(mod.path)}
                        disabled={disabled}
                      >
                        <span className="nav-picker-icon">
                          <ModuleIcon path={mod.path} size={20} />
                        </span>
                        <span className="nav-picker-name">{mod.label}</span>
                        <span className="nav-picker-check">
                          {selected
                            ? <IconStarFilled size={14} />
                            : <IconStar size={14} />
                          }
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="nav-editor-footer">
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" onClick={save}>
            <IconCheck size={15} strokeWidth={2.5} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main AppShell ─────────────────────────────────────────────────────────
export default function AppShell() {
  useUser()
  const { theme, toggleTheme, isOffline, bottomNavFavorites, setBottomNavFavorites, openDashboardEditor, openNutritionGoal } = useUIStore()
  const { user } = useAuthStore()
  const pendingSync = useOfflineStore(s => s.queue.length)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [menuOpen, setMenuOpen]     = useState(false)
  const [editingNav, setEditingNav] = useState(false)

  const menuToggleBtnRef = useRef<HTMLButtonElement>(null)
  const menuFirstItemRef = useRef<HTMLButtonElement>(null)

  const customRoutines = useRoutines()
  const routineDays = useMemo(() => getRoutineDays(user?.activeRoutineId ?? null, customRoutines), [user?.activeRoutineId, customRoutines])

  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/entrenamiento/')) {
      const dayId = pathname.split('/')[2]
      const day = routineDays[dayId]
      if (day) return `${capitalize(dayId)} · ${(day as { label?: string }).label ?? dayId}`
      return 'Entrenamiento'
    }
    if (pathname === '/rutinas/nueva') return 'Nueva rutina'
    if (pathname.startsWith('/rutinas/') && pathname !== '/rutinas/') return 'Editar rutina'
    return PAGE_TITLES[pathname] ?? 'Gym Tracker'
  }, [pathname, routineDays])

  const navWorkout = useMemo(() =>
    Object.entries(routineDays).map(([dayId, day]) => ({
      path: `/entrenamiento/${dayId}`,
      label: `${capitalize(dayId)} · ${(day as { label?: string }).label ?? dayId}`,
      short: `${day.exercises.length}ej`,
    })),
  [routineDays])

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  function handleModuleNav(path: string) {
    navigate(path)
    setMenuOpen(false)
  }

  function saveFavorites(next: string[]) {
    setBottomNavFavorites(next)
    usersApi.updateSettings({ bottomNavFavorites: next }).catch(() => {})
  }

  useEffect(() => { setMenuOpen(false) }, [pathname])
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => {
    if (menuOpen) {
      menuFirstItemRef.current?.focus()
    } else {
      menuToggleBtnRef.current?.focus()
    }
  }, [menuOpen])

  const favModules = bottomNavFavorites.map(f => ALL_MODULES.find(m => m.path === f)).filter(Boolean) as typeof ALL_MODULES

  return (
    <div className="app">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <IconDumbbell size={18} strokeWidth={2} />
          </div>
          <div><h1>Gym Tracker</h1><p>{user?.name}</p></div>
        </div>

        <div>
          <div className="nav-group-title">Principal</div>
          <nav className="nav">
            {NAV_MAIN.map(item => (
              <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => navigate(item.path)}>
                <span className="nav-icon"><ModuleIcon path={item.path} size={16} /></span>
                <span>{item.label}</span>
                {'badge' in item && item.badge && <small className="nav-badge">{item.badge}</small>}
              </button>
            ))}
          </nav>
        </div>

        {navWorkout.length > 0 && (
          <div>
            <div className="nav-group-title">Entrenamiento</div>
            <nav className="nav">
              {navWorkout.map(item => (
                <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => navigate(item.path)}>
                  <span>{item.label}</span><small>{item.short}</small>
                </button>
              ))}
            </nav>
          </div>
        )}

        <div>
          <div className="nav-group-title">Control</div>
          <nav className="nav">
            {NAV_CONTROL.map(item => (
              <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => navigate(item.path)}>
                <span className="nav-icon"><ModuleIcon path={item.path} size={16} /></span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-meta">
          <p><strong>Semana:</strong> {user?.currentWeek ?? 1}</p>
          <p style={{ marginTop: '.45rem' }}><strong>Objetivo:</strong> {user?.settings?.goal ?? 'No configurado'}</p>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="main">
        {isOffline && (
          <div className="offline-banner">
            <span className="offline-dot" aria-hidden="true" />
            Sin conexión · Los cambios se sincronizarán al reconectar
            {pendingSync > 0 && ` (${pendingSync} pendiente${pendingSync > 1 ? 's' : ''})`}
          </div>
        )}
        {!isOffline && pendingSync > 0 && (
          <div className="offline-banner" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
            Sincronizando {pendingSync} cambio{pendingSync > 1 ? 's' : ''}…
          </div>
        )}

        <header className="topbar">
          <div className="topbar-title"><h2>{pageTitle}</h2></div>
          <div className="topbar-actions">
            <div className="topbar-user" aria-hidden="true">
              <div className="topbar-user-avatar">
                <UserAvatar avatar={user?.avatar} size={16} />
              </div>
              <span className="topbar-user-name">{user?.name}</span>
            </div>
            {pathname === '/dashboard' && (
              <button className="icon-btn" onClick={openDashboardEditor} aria-label="Personalizar dashboard">
                <IconSettings size={18} />
              </button>
            )}
            {pathname === '/nutricion' && (
              <button className="icon-btn" onClick={openNutritionGoal} aria-label="Metas de nutrición">
                <IconSettings size={18} />
              </button>
            )}
            <button className="icon-btn" onClick={toggleTheme} aria-label="Cambiar tema">
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
            <button ref={menuToggleBtnRef} className="icon-btn menu-toggle-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Menú de módulos" aria-expanded={menuOpen} aria-controls="fullscreen-menu">
              {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </header>

        <div className="content">
          <Suspense fallback={<div className="skeleton-page"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-kpi" /></div>}>
            <Outlet />
          </Suspense>
        </div>

        {/* ── Bottom nav ── */}
        <nav className="bottom-nav" aria-label="Navegación principal">
          {favModules.map(mod => (
            <button
              key={mod.path}
              className={`bottom-nav-btn ${isActive(mod.path) ? 'active' : ''}`}
              onClick={() => navigate(mod.path)}
            >
              <ModuleIcon path={mod.path} size={22} strokeWidth={1.6} />
              <span>{mod.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </main>

      {/* ── Full-screen menu ─────────────────────────────────── */}
      {menuOpen && (
        <div id="fullscreen-menu" className="fullscreen-menu" role="dialog" aria-modal="true" aria-labelledby="fsmenu-title">
          <div className="fsmenu-header">
            <div>
              <div id="fsmenu-title" className="fsmenu-user-name">{user?.name ?? 'Usuario'}</div>
              <div className="fsmenu-user-meta">Semana {user?.currentWeek ?? 1} · {user?.settings?.goal ?? 'Sin objetivo'}</div>
            </div>
            <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
              <IconClose size={20} />
            </button>
          </div>

          <div className="fsmenu-body">
            {MENU_GROUPS.map((group, gIdx) => (
              <div key={group} className="fsmenu-group">
                <div className="fsmenu-group-title">{group}</div>
                <div className="fsmenu-grid">
                  {byGroup(group).map((mod, mIdx) => (
                    <button
                      key={mod.path}
                      ref={gIdx === 0 && mIdx === 0 ? menuFirstItemRef : undefined}
                      className={`fsmenu-item ${isActive(mod.path) ? 'active' : ''}`}
                      onClick={() => handleModuleNav(mod.path)}
                    >
                      <span className="fsmenu-item-icon">
                        <ModuleIcon path={mod.path} size={26} strokeWidth={1.5} />
                      </span>
                      <span className="fsmenu-item-label">
                        {mod.label}
                        {mod.badge && <span className="app-menu-badge">{mod.badge}</span>}
                      </span>
                      <span className="fsmenu-item-desc">{mod.desc}</span>
                      {isActive(mod.path) && (
                        <span className="fsmenu-active-dot" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="fsmenu-footer">
            <button
              className="ghost-btn"
              style={{ fontSize: 'var(--text-xs)', padding: '.55rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}
              onClick={() => { setMenuOpen(false); setEditingNav(true) }}
            >
              <IconStarFilled size={14} />
              Personalizar barra inferior
            </button>
          </div>
        </div>
      )}

      {/* ── Nav editor ───────────────────────────────────────── */}
      {editingNav && (
        <NavEditor
          favorites={bottomNavFavorites}
          onChange={saveFavorites}
          onClose={() => setEditingNav(false)}
        />
      )}

      <InstallPrompt />
      <Toaster />
    </div>
  )
}
