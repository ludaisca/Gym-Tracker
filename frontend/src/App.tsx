import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from './store'
import { useOfflineSync } from './hooks/useOfflineSync'

import LoginPage from './components/views/LoginPage'
import RegisterPage from './components/views/RegisterPage'
import VerifyEmailPage from './components/views/VerifyEmailPage'
import ForgotPasswordPage from './components/views/ForgotPasswordPage'
import ResetPasswordPage from './components/views/ResetPasswordPage'
import AppShell from './components/layout/AppShell'

import Dashboard from './components/views/Dashboard'
import Agenda from './components/views/Agenda'
import DayView from './components/views/DayView'
import Stats from './components/views/Stats'
import Insights from './components/views/Insights'
import Routines from './components/views/Routines'
import RoutineEditor from './components/views/RoutineEditor'
import Cardio from './components/views/Cardio'
import Notes from './components/views/Notes'
import Nutrition from './components/views/Nutrition'
import Config from './components/views/Config'
import Duelos from './components/views/Duelos'
import SessionHistory from './components/views/SessionHistory'

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
