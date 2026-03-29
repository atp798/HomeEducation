import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

type Status = 'confirming' | 'success' | 'error'

export default function ConfirmDelete() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout } = useAuthStore()

  const [status, setStatus] = useState<Status>('confirming')
  const [errorMsg, setErrorMsg] = useState('')

  // Guard against React 18 StrictMode double-invoke: the token is one-time-use,
  // so we must ensure the API is called exactly once even in development.
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('无效的注销链接')
      return
    }

    authApi.confirmDelete(token)
      .then(() => {
        // Clear any stored auth credentials — this account no longer exists
        logout()
        setStatus('success')
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          '注销失败，请重试',
        )
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">

          {status === 'confirming' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">正在注销账号…</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">请稍候，正在处理您的注销请求</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">账号已注销</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                您的账号及所有相关数据已被永久删除。感谢您使用 Nutrilog，将在 3 秒后跳转到登录页…
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                立即返回登录
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">注销失败</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
              <button
                onClick={() => navigate('/login', { replace: true })}
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
