import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()

  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('无效的激活链接')
      return
    }

    authApi.verifyEmail(token)
      .then((res) => {
        setAuth(res.data.token, res.data.user)
        setStatus('success')
        // Auto-redirect to chat after 2 seconds
        setTimeout(() => navigate('/chat', { replace: true }), 2000)
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err?.response?.data?.error || '激活失败，请重试')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">正在激活账号…</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">请稍候</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">邮箱激活成功！</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                账号已激活，即将自动跳转到主页…
              </p>
              <button
                onClick={() => navigate('/chat', { replace: true })}
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                立即进入
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">激活失败</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                返回登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
