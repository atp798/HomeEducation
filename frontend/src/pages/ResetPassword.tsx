import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tokenError, setTokenError] = useState('')

  // Guard against React 18 StrictMode double-invoke
  const calledRef = useRef(false)

  // Validate token exists on mount
  useEffect(() => {
    if (!token) {
      setTokenError(t('resetPassword.invalidToken'))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (calledRef.current) return
    if (password.length < 6) {
      showToast(t('resetPassword.pwTooShort'), 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast(t('resetPassword.pwMismatch'), 'error')
      return
    }

    calledRef.current = true
    setLoading(true)
    try {
      const res = await authApi.resetPassword(token, password)
      setSuccess(true)
      showToast(t('resetPassword.success'), 'success')
      setAuth(res.data.token, res.data.user)
      // Auto-navigate to chat after a short delay
      setTimeout(() => navigate('/chat', { replace: true }), 1500)
    } catch (err: any) {
      calledRef.current = false // allow retry on error
      const detail = err?.response?.data?.detail || err?.response?.data?.error
      if (detail) {
        setTokenError(detail)
      } else {
        showToast(t('resetPassword.invalidToken'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🏡</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">家庭教育咨询</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('resetPassword.title')}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden p-6">
          {tokenError ? (
            /* Token invalid / expired */
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <p className="text-gray-700 dark:text-gray-300 text-sm">{tokenError}</p>
              <Link
                to="/login"
                className="inline-block text-sm text-brand dark:text-brand-light hover:underline"
              >
                {t('resetPassword.backToLogin')}
              </Link>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-gray-700 dark:text-gray-300 text-sm">{t('resetPassword.success')}</p>
            </div>
          ) : (
            /* Reset form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('resetPassword.newPw')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少6位"
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('resetPassword.confirmPw')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
              </button>

              <p className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-brand dark:text-brand-light hover:underline"
                >
                  {t('resetPassword.backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
