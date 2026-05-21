import { useEffect, lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from './store'
import { useOfflineSync } from './hooks/useOfflineSync'
import { toast } from './lib/toast'
import { initNativePush } from './lib/pushNative'
import { pushApi } from './api/push'

import LoginPage from './components/views/LoginPage'
import RegisterPage from './components/views/RegisterPage'
import VerifyEmailPage from './components/views/VerifyEmailPage'
import ForgotPasswordPage from './components/views/ForgotPasswordPage'
import ResetPasswordPage from './components/views/ResetPasswordPage'
import AppShell from './components/layout/AppShell'

// ── Vistas Protegidas (Carga Perezosa / Code Splitting) ───────────
const Dashboard = lazy(() => import('./components/views/Dashboard'))
const Agenda = lazy(() => import('./components/views/Agenda'))
const DayView = lazy(() => import('./components/views/DayView'))
const Stats = lazy(() => import('./components/views/Stats'))
const Insights = lazy(() => import('./components/views/Insights'))
const Routines = lazy(() => import('./components/views/Routines'))
const RoutineEditor = lazy(() => import('./components/views/RoutineEditor'))
const Cardio = lazy(() => import('./components/views/Cardio'))
const Notes = lazy(() => import('./components/views/Notes'))
const Nutrition = lazy(() => import('./components/views/Nutrition'))
const Config = lazy(() => import('./components/views/Config'))
const Duelos = lazy(() => import('./components/views/Duelos'))
const SessionHistory = lazy(() => import('./components/views/SessionHistory'))

// Componente simple de carga (Skeleton o Spinner)
function SuspenseLoader() {
  return (
    <div className="content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-xl)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-xl)' }} />
      </div>
      <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-xl)' }} />
    </div>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Wrapper para inyectar suspense en cada ruta perezosa
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SuspenseLoader />}>{children}</Suspense>
}

const router = createBrowserRouter([
  { path: '/login',                  element: <LoginPage /> },
  { path: '/register',               element: <RegisterPage /> },
  { path: '/verificar-email',        element: <VerifyEmailPage /> },
  { path: '/olvide-contrasena',      element: <ForgotPasswordPage /> },
  { path: '/restablecer-contrasena', element: <ResetPasswordPage /> },
  {
    path: '/',
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',          element: <LazyRoute><Dashboard /></LazyRoute> },
      { path: 'agenda',             element: <LazyRoute><Agenda /></LazyRoute> },
      { path: 'nutricion',          element: <LazyRoute><Nutrition /></LazyRoute> },
      { path: 'stats',              element: <LazyRoute><Stats /></LazyRoute> },
      { path: 'insights',           element: <LazyRoute><Insights /></LazyRoute> },
      { path: 'rutinas',            element: <LazyRoute><Routines /></LazyRoute> },
      { path: 'rutinas/nueva',      element: <LazyRoute><RoutineEditor /></LazyRoute> },
      { path: 'rutinas/:routineId', element: <LazyRoute><RoutineEditor /></LazyRoute> },
      { path: 'cardio',             element: <LazyRoute><Cardio /></LazyRoute> },
      { path: 'notas',              element: <LazyRoute><Notes /></LazyRoute> },
      { path: 'config',             element: <LazyRoute><Config /></LazyRoute> },
      { path: 'duelos',             element: <LazyRoute><Duelos /></LazyRoute> },
      { path: 'entrenamiento/:dayId', element: <LazyRoute><DayView /></LazyRoute> },
      { path: 'historial',            element: <LazyRoute><SessionHistory /></LazyRoute> },
    ],
  },
])

async function updateNativeStatusBar(theme: 'light' | 'dark') {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return
  const { StatusBar, Style } = await import('@capacitor/status-bar')
  await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
  await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#171614' : '#f5f5f0' })
}

async function registerBackButton() {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return
  const { App } = await import('@capacitor/app')
  let lastBackPress = 0
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      const now = Date.now()
      if (now - lastBackPress < 2000) {
        App.exitApp()
      } else {
        lastBackPress = now
        toast('Presiona de nuevo para salir', 'info', 2000)
      }
    }
  })
}

export default function App() {
  const { theme, accentTheme } = useUIStore()
  useOfflineSync()

  // Registrar back button y push nativo una sola vez al montar
  useEffect(() => {
    registerBackButton()
    initNativePush(async (token) => { await pushApi.registerFcmToken(token) })
  }, [])

  // Sincronizar status bar y atributos del DOM en cada cambio de tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-accent', accentTheme)
    updateNativeStatusBar(theme)
  }, [theme, accentTheme])

  return <RouterProvider router={router} />
}
