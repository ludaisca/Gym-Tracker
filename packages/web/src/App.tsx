import { useEffect, lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from './store'
import { useOfflineSync } from './hooks/useOfflineSync'
import { toast } from './lib/toast'
import { initNativePush } from './lib/pushNative'
import { pushApi } from './api/push'
import { usersApi } from './api/users'

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

function SuspenseLoader() {
  return (
    <div className="splash-loader">
      <div className="splash-brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 4L12 2L6 4V12C6 16.4 9.4 20.4 12 22C14.6 20.4 18 16.4 18 12V4Z"/>
        </svg>
      </div>
      <div className="splash-bar-wrap">
        <div className="splash-bar" />
      </div>
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
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Style.Dark = light/white icons (for dark backgrounds); Style.Light = dark icons (for light backgrounds)
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
  } catch { /* no-op en entornos sin status bar nativa */ }
}

async function registerBackButton() {
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

  // Registrar back button y push nativo una sola vez al montar.
  // También refresca el objeto user desde el servidor para corregir localStorage stale.
  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      usersApi.me()
        .then(freshUser => {
          useAuthStore.getState().setAuth(freshUser, useAuthStore.getState().accessToken ?? '')
        })
        .catch(() => {})
    }
    registerBackButton()
    initNativePush(async (token) => {
      if (useAuthStore.getState().isAuthenticated) {
        await pushApi.registerFcmToken(token)
      }
    })
  }, [])

  // Sincronizar status bar y atributos del DOM en cada cambio de tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-accent', accentTheme)
    updateNativeStatusBar(theme)
  }, [theme, accentTheme])

  return <RouterProvider router={router} />
}
