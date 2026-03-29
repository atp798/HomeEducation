import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, RefreshCw, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { PasswordStrength } from '../components/PasswordStrength'
import { useToast } from '../components/Toast'

export default function Register() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  // After register success, show "check email" screen
  const [registered, setRegistered] = useState(false)
  const [mockVerifyUrl, setMockVerifyUrl] = useState<string | null>(null)

  useEffect(() => {
    if (token) navigate('/chat', { replace: true })
  }, [token, navigate])

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      showToast('请输入有效的邮箱地址', 'error')
      return
    }
    if (password.length < 6) {
      showToast('密码至少6位', 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast('两次密码不一致', 'error')
      return
    }
    try {
      setLoading(true)
      const res = await authApi.register(email, password)
      setMockVerifyUrl(res.data.verifyUrl || null)
      setRegistered(true)
    } catch (err: any) {
      showToast(err?.response?.data?.error || '注册失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">注册成功！</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              我们已向 <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> 发送了一封激活邮件，请点击邮件中的链接完成账号激活。
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              激活前仍可正常登录使用，激活后账号状态将更新。
            </p>

            {mockVerifyUrl && (
              <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                  开发模式 — 模拟激活链接：
                </p>
                <a
                  href={mockVerifyUrl}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {mockVerifyUrl}
                </a>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                前往登录
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🏡</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建账号</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">注册后即可开始使用家庭教育咨询</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 pt-5 pb-0">
            <Mail className="w-4 h-4 text-brand dark:text-brand-light" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">邮箱注册</span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                邮箱地址
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码
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
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                确认密码
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
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">两次密码不一致</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              注册账号
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              已有账号？
              <Link
                to="/login"
                className="text-brand dark:text-brand-light hover:underline ml-1"
              >
                立即登录
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          注册即表示同意用户协议和隐私政策
        </p>
      </div>
    </div>
  )
}
