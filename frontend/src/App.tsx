import { lazy, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from './store'
import { useOfflineSync } from './hooks/useOfflineSync'

// Auth pages: pequeñas, carga inmediata
import LoginPage from './components/views/LoginPage'
import RegisterPage from './components/views/RegisterPage'
import VerifyEmailPage from './components/views/VerifyEmailPage'
import ForgotPasswordPage from './components/views/ForgotPasswordPage'
import ResetPasswordPage from './components/views/ResetPasswordPage'
import AppShell from './components/layout/AppShell'

// Vistas protegidas: lazy para code splitting por ruta
const Dashboard      = lazy(() => import('./components/views/Dashboard'))
const Agenda         = lazy(() => import('./components/views/Agenda'))
const DayView        = lazy(() => import('./components/views/DayView'))
const Stats          = lazy(() => import('./components/views/Stats'))
const Insights       = lazy(() => import('./components/views/Insights'))
const Routines       = lazy(() => import('./components/views/Routines'))
const RoutineEditor  = lazy(() => import('./components/views/RoutineEditor'))
const Cardio         = lazy(() => import('./components/views/Cardio'))
const Notes          = lazy(() => import('./components/views/Notes'))
const Nutrition      = lazy(() => import('./components/views/Nutrition'))
const Config         = lazy(() => import('./components/views/Config'))
const Duelos         = lazy(() => import('./components/views/Duelos'))
const SessionHistory = lazy(() => import('./components/views/SessionHistory'))

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
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
      { path: 'dashboard',          element: <Dashboard /> },
      { path: 'agenda',             element: <Agenda /> },
      { path: 'nutricion',          element: <Nutrition /> },
      { path: 'stats',              element: <Stats /> },
      { path: 'insights',           element: <Insights /> },
      { path: 'rutinas',            element: <Routines /> },
      { path: 'rutinas/nueva',      element: <RoutineEditor /> },
      { path: 'rutinas/:routineId', element: <RoutineEditor /> },
      { path: 'cardio',             element: <Cardio /> },
      { path: 'notas',              element: <Notes /> },
      { path: 'config',             element: <Config /> },
      { path: 'duelos',             element: <Duelos /> },
      { path: 'entrenamiento/:dayId', element: <DayView /> },
      { path: 'historial',            element: <SessionHistory /> },
    ],
  },
])

export default function App() {
  const { theme, accentTheme } = useUIStore()
  useOfflineSync()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-accent', accentTheme)
  }, [theme, accentTheme])

  return <RouterProvider router={router} />
}
