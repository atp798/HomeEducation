import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 — only force-logout for authenticated endpoints (not login/register/password-change)
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url: string = err.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/')
    const isPasswordChange = url.includes('/settings/password')
    if (err.response?.status === 401 && !isAuthEndpoint && !isPasswordChange) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Stream chat via SSE
// In dev mode, bypass the Vite proxy to avoid response buffering on SSE streams.
// The backend has CORS enabled (origin: '*'), so direct calls work fine.
const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')
const STREAM_URL = backendUrl
  ? `${backendUrl}/chat/messages/stream`
  : import.meta.env.DEV
    ? 'http://localhost:3001/chat/messages/stream'
    : '/api/chat/messages/stream'

export function streamChat(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onThinking?: () => void,
): () => void {
  const token = localStorage.getItem('token') || ''
  let aborted = false

  fetch(STREAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, content }),
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done || aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            if (!aborted) onDone()
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.text !== undefined && !aborted) onChunk(parsed.text)
            if (parsed.thinking && !aborted && onThinking) onThinking()
            if (parsed.error && !aborted) onError(new Error(parsed.error))
          } catch {
            // Skip malformed chunks
          }
        }
      }

      if (!aborted) onDone()
    })
    .catch((err) => {
      if (!aborted) onError(err)
    })

  return () => {
    aborted = true
  }
}

// --- Auth ---
export const authApi = {
  register: (email: string, password: string) =>
    api.post<RegisterResponse>('/auth/register', { email, password }),

  verifyEmail: (token: string) =>
    api.get<AuthResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    api.post<{ message: string }>('/auth/resend-verification', { email }),

  loginEmail: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { type: 'email', email, password }),

  loginPhone: (phone: string, code: string) =>
    api.post<AuthResponse>('/auth/login', { type: 'phone', phone, code }),

  sendOtp: (phone: string) =>
    api.post<{ message: string; code?: string; expiresIn: number }>('/auth/send-otp', { phone }),

  requestDelete: () =>
    api.post<{ message: string }>('/auth/request-delete'),

  confirmDelete: (token: string) =>
    api.get<{ message: string }>(`/auth/confirm-delete?token=${encodeURIComponent(token)}`),
}

// --- Chat ---
export const chatApi = {
  createSession: (title?: string) =>
    api.post<{ sessionId: string; title: string; session: Session }>('/chat/sessions', { title }),

  getSessions: (filter?: 'today' | 'week' | 'all') =>
    api.get<SessionWithPreview[]>('/chat/sessions', { params: { filter } }),

  getHistory: (sessionId: string, page = 1, size = 20) =>
    api.get<{ messages: Message[]; total: number; page: number; size: number }>(
      `/chat/sessions/${sessionId}/history`,
      { params: { page, size } }
    ),

  deleteSession: (id: string) =>
    api.delete(`/chat/sessions/${id}`),

  updateSession: (id: string, data: { title?: string; archived?: number }) =>
    api.patch<Session>(`/chat/sessions/${id}`, data),
}

// --- Settings ---
export const settingsApi = {
  getSettings: () =>
    api.get<{ user: User; settings: UserSettings }>('/settings'),

  updateSettings: (data: Partial<UserSettings>) =>
    api.put<UserSettings>('/settings', data),

  getLoginLogs: () =>
    api.get<LoginLog[]>('/settings/login-logs'),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/settings/password', { oldPassword, newPassword }),

  bindEmail: (email: string, password?: string) =>
    api.post('/settings/bind-email', { email, password }),

  bindPhone: (phone: string, code: string) =>
    api.post('/settings/bind-phone', { phone, code }),
}

// --- Types ---
export interface AuthResponse {
  token: string
  user: User
}

export interface RegisterResponse extends AuthResponse {}

export interface User {
  id: string
  email: string | null
  phone: string | null
  email_verified?: number
}

export interface Session {
  id: string
  user_id: string
  title: string
  archived: number
  created_at: string
  updated_at: string
}

export interface SessionWithPreview extends Session {
  lastMessage: Message | null
  messageCount: number
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface UserSettings {
  user_id: string
  theme: string
  language: string
  notification_ai_reply: number
  notification_new_session: number
  dnd_start: string | null
  dnd_end: string | null
  created_at: string
  updated_at: string
}

export interface LoginLog {
  id: string
  user_id: string
  ip: string
  device: string
  created_at: string
}
