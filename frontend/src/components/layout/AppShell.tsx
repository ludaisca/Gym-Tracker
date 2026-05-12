import { useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUIStore, useAuthStore, useOfflineStore } from '../../store'
import { getRoutineDays } from '../../lib/fitness'

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
}

export default function AppShell() {
  const { theme, toggleTheme, isOffline } = useUIStore()
  const { user } = useAuthStore()
  const pendingSync = useOfflineStore(s => s.queue.length)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const routineDays = useMemo(() => getRoutineDays(user?.activeRoutineId ?? null, []), [user?.activeRoutineId])

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
    { path: '/dashboard', label: 'Dashboard', short: 'home' },
    { path: '/agenda', label: 'Agenda semanal', short: 'week' },
    { path: '/nutricion', label: 'Nutrición', short: 'nut' },
    { path: '/stats', label: 'Estadísticas', short: 'stats' },
    { path: '/insights', label: 'Insights IA', short: 'ia' },
  ]
  const navWorkout = useMemo(() =>
    Object.entries(routineDays).map(([dayId, day]) => ({
      path: `/entrenamiento/${dayId}`,
      label: `${capitalize(dayId)} · ${(day as { label?: string }).label ?? dayId}`,
      short: `${day.exercises.length}ej`,
    })),
  [routineDays])
  const navControl = [
    { path: '/rutinas', label: 'Mis Rutinas', short: 'rut' },
    { path: '/cardio', label: 'Cardio tracker', short: 'io' },
    { path: '/notas', label: 'Notas y checklists', short: 'txt' },
    { path: '/config', label: 'Configuración', short: 'cfg' },
  ]

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  function goToday() {
    const slots = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const today = slots[new Date().getDay()]
    const dayIds = Object.keys(routineDays)
    const target = dayIds.includes(today) ? today : dayIds[0]
    if (target) navigate(`/entrenamiento/${target}`)
    else navigate('/dashboard')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 10v4"/><path d="M21 10v4"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M3 12h18"/>
            </svg>
          </div>
          <div><h1>Gym Tracker</h1><p>{user?.name} · App mode</p></div>
        </div>

        <div>
          <div className="nav-group-title">Principal</div>
          <nav className="nav">
            {navMain.map((item) => (
              <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => navigate(item.path)}>
                <span>{item.label}</span><small>{item.short}</small>
              </button>
            ))}
          </nav>
        </div>

        {navWorkout.length > 0 && (
          <div>
            <div className="nav-group-title">Entrenamiento</div>
            <nav className="nav">
              {navWorkout.map((item) => (
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
            {navControl.map((item) => (
              <button key={item.path} className={isActive(item.path) ? 'active' : ''} onClick={() => navigate(item.path)}>
                <span>{item.label}</span><small>{item.short}</small>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-meta">
          <p><strong>Semana:</strong> {user?.currentWeek ?? 1}</p>
          <p style={{ marginTop: '.45rem' }}><strong>Objetivo:</strong> {user?.settings?.goal ?? 'No configurado'}</p>
        </div>
      </aside>

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
          <div className="topbar-title">
            <h2>{pageTitle}</h2>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={toggleTheme} aria-label="Cambiar tema">
              {theme === 'dark'
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <button className="avatar-btn" onClick={() => navigate('/config')} aria-label="Mi perfil">
              {user?.avatar ?? '💪'}
            </button>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>

        <nav className="bottom-nav" aria-label="Navegación principal">
          <button className={`bottom-nav-btn ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Inicio
          </button>
          <button className={`bottom-nav-btn ${isActive('/agenda') ? 'active' : ''}`} onClick={() => navigate('/agenda')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Agenda
          </button>
          <button
            className={`bottom-nav-btn today-btn ${pathname.startsWith('/entrenamiento/') ? 'active' : ''}`}
            onClick={goToday}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10v4M21 10v4M7 7v10M17 7v10M3 12h18"/></svg>
            Hoy
          </button>
          <button className={`bottom-nav-btn ${isActive('/nutricion') ? 'active' : ''}`} onClick={() => navigate('/nutricion')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M8 12h8M12 8v8"/></svg>
            Nutrición
          </button>
          <button className={`bottom-nav-btn ${isActive('/stats') ? 'active' : ''}`} onClick={() => navigate('/stats')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            Stats
          </button>
        </nav>
      </main>
    </div>
  )
}
