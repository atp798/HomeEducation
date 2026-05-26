import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './components/Toast'
import { I18nProvider } from './i18n'

// 懒加载页面组件 - 减少首屏加载体积
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const ConfirmDelete = lazy(() => import('./pages/ConfirmDelete'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MainLayout = lazy(() => import('./pages/MainLayout'))

// 加载指示器组件
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">加载中...</span>
      </div>
    </div>
  )
}

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chat" replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/chat" replace /> : <Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/confirm-delete" element={<ConfirmDelete />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/chat" element={<RequireAuth><MainLayout defaultTab="chat" /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><MainLayout defaultTab="history" /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><MainLayout defaultTab="settings" /></RequireAuth>} />
        <Route path="/" element={<Navigate to={token ? '/chat' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={token ? '/chat' : '/login'} replace />} />
      </Routes>
    </Suspense>
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
