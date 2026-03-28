import { create } from 'zustand'
import { Session, SessionWithPreview, Message, chatApi, streamChat } from '../api/client'

interface ChatState {
  sessions: SessionWithPreview[]
  currentSessionId: string | null
  messages: Message[]
  streaming: boolean
  streamingText: string
  loading: boolean

  loadSessions: (filter?: 'today' | 'week' | 'all') => Promise<void>
  loadMessages: (sessionId: string) => Promise<void>
  createSession: (title?: string) => Promise<Session>
  deleteSession: (id: string) => Promise<void>
  setCurrentSession: (id: string | null) => void
  sendMessage: (
    content: string,
    onError: (msg: string) => void
  ) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  streaming: false,
  streamingText: '',
  loading: false,

  loadSessions: async (filter) => {
    set({ loading: true })
    try {
      const res = await chatApi.getSessions(filter)
      set({ sessions: res.data })
    } finally {
      set({ loading: false })
    }
  },

  loadMessages: async (sessionId) => {
    set({ loading: true, messages: [] })
    try {
      const res = await chatApi.getHistory(sessionId, 1, 100)
      set({ messages: res.data.messages })
    } finally {
      set({ loading: false })
    }
  },

  createSession: async (title) => {
    const res = await chatApi.createSession(title)
    const { session } = res.data
    const sessionWithPreview: SessionWithPreview = {
      ...session,
      lastMessage: null,
      messageCount: 0,
    }
    set((s) => ({ sessions: [sessionWithPreview, ...s.sessions] }))
    return session
  },

  deleteSession: async (id) => {
    await chatApi.deleteSession(id)
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      currentSessionId: s.currentSessionId === id ? null : s.currentSessionId,
      messages: s.currentSessionId === id ? [] : s.messages,
    }))
  },

  setCurrentSession: (id) => {
    set({ currentSessionId: id, messages: [], streamingText: '' })
  },

  sendMessage: (content, onError) => {
    const { currentSessionId, messages } = get()
    if (!currentSessionId || !content.trim()) return

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      session_id: currentSessionId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    }

    set((s) => ({
      messages: [...s.messages, userMsg],
      streaming: true,
      streamingText: '',
    }))

    streamChat(
      currentSessionId,
      content.trim(),
      (chunk) => {
        set((s) => ({ streamingText: s.streamingText + chunk }))
      },
      () => {
        const { streamingText } = get()
        const aiMsg: Message = {
          id: `temp-ai-${Date.now()}`,
          session_id: currentSessionId,
          role: 'assistant',
          content: streamingText,
          created_at: new Date().toISOString(),
        }
        set((s) => ({
          messages: [...s.messages, aiMsg],
          streaming: false,
          streamingText: '',
        }))
        // Reload sessions to update preview
        get().loadSessions()
      },
      (err) => {
        set({ streaming: false, streamingText: '' })
        onError(err.message || 'AI响应失败')
      }
    )
  },

  clearMessages: () => {
    set({ messages: [], currentSessionId: null, streamingText: '', streaming: false })
  },
}))
