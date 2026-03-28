import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './components/Toast'
import { I18nProvider } from './i18n'
import Login from './pages/Login'
import MainLayout from './pages/MainLayout'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInner() {
  const { loadFromStorage, token } = useAuthStore()
  const themeValue = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
  useTheme(themeValue)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/chat" replace /> : <Login />} />
      <Route path="/chat" element={<RequireAuth><MainLayout defaultTab="chat" /></RequireAuth>} />
      <Route path="/history" element={<RequireAuth><MainLayout defaultTab="history" /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><MainLayout defaultTab="settings" /></RequireAuth>} />
      <Route path="/" element={<Navigate to={token ? '/chat' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={token ? '/chat' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
