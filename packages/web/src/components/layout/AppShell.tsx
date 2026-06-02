import { useMemo } from 'react'
import { useNavigate, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from '../ui/PageTransition'
import { useUIStore, useAuthStore, useOfflineStore } from '../../store'
import { getRoutineDays } from '../../lib/fitness'
import { useRoutines } from '../../hooks/useRoutines'
import Toaster from '../ui/Toaster'
import {
  ModuleIcon,
  IconMenu, IconSun, IconMoon,
  IconHome, IconDumbbell, IconStats, IconNutrition, IconSettings,
} from '../ui/Icons'
import { hapticImpact } from '../../lib/haptics'

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/agenda':    'Semana',
  '/nutricion': 'Nutrición',
  '/stats':     'Estadísticas',
  '/insights':  'Insights IA',
  '/rutinas':   'Rutinas',
  '/cardio':    'Cardio',
  '/notas':     'Notas',
  '/config':    'Perfil',
  '/duelos':    'Duelos',
}

const FIXED_TABS = [
  { path: '/dashboard', label: 'Inicio',    Icon: IconHome,      activeFor: ['/dashboard'] },
  { path: '/agenda',    label: 'Entrena',   Icon: IconDumbbell,  activeFor: ['/agenda', '/entrenamiento'] },
  { path: '/stats',     label: 'Stats',     Icon: IconStats,     activeFor: ['/stats', '/insights'] },
  { path: '/nutricion', label: 'Nutrición', Icon: IconNutrition, activeFor: ['/nutricion'] },
  { path: '/config',    label: 'Perfil',    Icon: IconSettings,  activeFor: ['/config', '/rutinas', '/cardio', '/notas', '/duelos'] },
] as const

export default function AppShell() {
  const { theme, toggleTheme, isOffline } = useUIStore()
  const { user } = useAuthStore()
  const pendingSync = useOfflineStore(s => s.queue.length)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const outlet = useOutlet()

  const customRoutines = useRoutines()
  const routineDays = useMemo(
    () => getRoutineDays(user?.activeRoutineId ?? null, customRoutines),
    [user?.activeRoutineId, customRoutines]
  )

  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/entrenamiento/')) {
      const dayId = pathname.split('/')[2]
      const day = routineDays[dayId]
      if (day) return `${capitalize(dayId)} · ${(day as { label?: string }).label ?? dayId}`
      return 'Entrenamiento'
    }
    return PAGE_TITLES[pathname] ?? 'Gym Tracker'
  }, [pathname, routineDays])

  const navMain = [
    { path: '/dashboard', label: 'Inicio' },
    { path: '/agenda',    label: 'Semana' },
    { path: '/nutricion', label: 'Nutrición' },
    { path: '/stats',     label: 'Estadísticas' },
    { path: '/insights',  label: 'Insights IA' },
    { path: '/duelos',    label: 'Duelos' },
  ]
  const navWorkout = useMemo(() =>
    Object.entries(routineDays).map(([dayId, day]) => ({
      path: `/entrenamiento/${dayId}`,
      label: `${capitalize(dayId)} · ${(day as { label?: string }).label ?? dayId}`,
      short: `${day.exercises.length}ej`,
    })),
  [routineDays])
  const navControl = [
    { path: '/rutinas', label: 'Rutinas' },
    { path: '/cardio',  label: 'Cardio' },
    { path: '/notas',   label: 'Notas' },
    { path: '/config',  label: 'Configuración' },
  ]

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')
  const isTabActive = (tab: typeof FIXED_TABS[number]) =>
    tab.activeFor.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))

  function handleNav(path: string) {
    hapticImpact('light')
    navigate(path)
  }

  return (
    <div className="app">
      {/* ── Sidebar (desktop only) ──────────────────────────── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <IconMenu size={18} strokeWidth={2} />
          </div>
          <div><h1>Gym Tracker</h1><p>{user?.name}</p></div>
        </div>

        <div>
          <div className="nav-group-title">Principal</div>
          <nav className="nav">
            {navMain.map(item => (
              <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => handleNav(item.path)}>
                <span className="nav-icon"><ModuleIcon path={item.path} size={16} /></span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {navWorkout.length > 0 && (
          <div>
            <div className="nav-group-title">Entrenamiento</div>
            <nav className="nav">
              {navWorkout.map(item => (
                <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => handleNav(item.path)}>
                  <span>{item.label}</span><small>{item.short}</small>
                </button>
              ))}
            </nav>
          </div>
        )}

        <div>
          <div className="nav-group-title">Control</div>
          <nav className="nav">
            {navControl.map(item => (
              <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => handleNav(item.path)}>
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
            <button className="icon-btn" onClick={toggleTheme} aria-label="Cambiar tema">
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          </div>
        </header>

        <div className="content" style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <PageTransition key={pathname} pathKey={pathname}>
              {outlet}
            </PageTransition>
          </AnimatePresence>
        </div>

        {/* ── Bottom nav — 5 fixed tabs ── */}
        <nav className="bottom-nav" aria-label="Navegación principal">
          {FIXED_TABS.map(tab => {
            const active = isTabActive(tab)
            return (
              <button
                key={tab.path}
                className={`bottom-nav-btn${active ? ' active' : ''}`}
                onClick={() => handleNav(tab.path)}
                aria-current={active ? 'page' : undefined}
              >
                <tab.Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </main>

      <Toaster />
    </div>
  )
}
