import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Phone, Mail, RefreshCw, AlertCircle } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'

type LoginTab = 'email' | 'phone'

const countryCodes = [
  { code: '+86', label: '中国 +86' },
  { code: '+1', label: '美国 +1' },
  { code: '+44', label: '英国 +44' },
  { code: '+81', label: '日本 +81' },
  { code: '+82', label: '韩国 +82' },
  { code: '+852', label: '香港 +852' },
]

export default function Login() {
  const navigate = useNavigate()
  const { token, setAuth } = useAuthStore()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [tab, setTab] = useState<LoginTab>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [countryCode, setCountryCode] = useState('+86')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [mockOtp, setMockOtp] = useState('')
  const [loading, setLoading] = useState(false)

  // Email-not-verified state
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (token) navigate('/chat', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((v) => v - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCountdown])

  // Reset not-verified banner when user edits the email field
  useEffect(() => {
    if (emailNotVerified && email !== unverifiedEmail) {
      setEmailNotVerified(false)
    }
  }, [email]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSendOtp = async () => {
    const fullPhone = `${countryCode}${phone}`
    if (!phone || phone.length < 7) {
      showToast('请输入有效的手机号', 'error')
      return
    }
    try {
      setLoading(true)
      const res = await authApi.sendOtp(fullPhone)
      setOtpCountdown(60)
      if (res.data.code) {
        setMockOtp(res.data.code)
        showToast(`验证码（开发模式）: ${res.data.code}`, 'info')
      } else {
        showToast('验证码已发送', 'success')
      }
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.response?.data?.error || '发送失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailNotVerified(false)
    if (!validateEmail(email)) {
      showToast('请输入有效的邮箱地址', 'error')
      return
    }
    if (password.length < 6) {
      showToast('密码至少6位', 'error')
      return
    }
    try {
      setLoading(true)
      const res = await authApi.loginEmail(email, password)
      setAuth(res.data.token, res.data.user)
      showToast('登录成功！', 'success')
      navigate('/chat', { replace: true })
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 403 && detail === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true)
        setUnverifiedEmail(email)
      } else {
        showToast(detail || err?.response?.data?.error || '登录失败', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 7) {
      showToast('请输入有效的手机号', 'error')
      return
    }
    if (!otp || otp.length !== 6) {
      showToast('请输入6位验证码', 'error')
      return
    }
    try {
      setLoading(true)
      const fullPhone = `${countryCode}${phone}`
      const res = await authApi.loginPhone(fullPhone, otp)
      setAuth(res.data.token, res.data.user)
      showToast('登录成功！', 'success')
      navigate('/chat', { replace: true })
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail || err?.response?.data?.error || '登录失败，验证码错误或已过期',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      setResendLoading(true)
      await authApi.resendVerification(unverifiedEmail)
      showToast(t('login.resendSent'), 'success')
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail || err?.response?.data?.error || t('login.resendFailed'),
        'error',
      )
    } finally {
      setResendLoading(false)
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
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">专业的家庭教育顾问，陪伴孩子成长</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setTab('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${
                tab === 'email'
                  ? 'text-brand dark:text-brand-light'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Mail className="w-4 h-4" />
              邮箱登录
              {tab === 'email' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand dark:bg-brand-light" />
              )}
            </button>
            <button
              onClick={() => setTab('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${
                tab === 'phone'
                  ? 'text-brand dark:text-brand-light'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Phone className="w-4 h-4" />
              手机验证码
              {tab === 'phone' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand dark:bg-brand-light" />
              )}
            </button>
          </div>

          <div className="p-6">
            {tab === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* Email-not-verified warning banner */}
                {emailNotVerified && (
                  <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        {t('login.emailNotVerified')}
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        {resendLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {t('login.resendVerification')}
                      </button>
                    </div>
                  </div>
                )}

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
                      placeholder="请输入密码"
                      autoComplete="current-password"
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

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 text-brand"
                    />
                    记住我
                  </label>
                  <button
                    type="button"
                    className="text-sm text-brand dark:text-brand-light hover:underline"
                  >
                    忘记密码?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  登录
                </button>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  没有账号？
                  <Link
                    to="/register"
                    className="text-brand dark:text-brand-light hover:underline ml-1"
                  >
                    免费注册
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    手机号码
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="请输入手机号"
                      className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6位验证码"
                      maxLength={6}
                      className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpCountdown > 0 || loading}
                      className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {otpCountdown > 0 ? `${otpCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                  {mockOtp && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      开发模式验证码: {mockOtp}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  登录 / 注册
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          登录即表示同意用户协议和隐私政策
        </p>
      </div>
    </div>
  )
}
