import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Send, Square } from 'lucide-react'
import { chatApi, streamChat, Message } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { MessageBubble, StreamingBubble } from '../components/MessageBubble'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'

const MAX_CHARS = 500

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { token } = useAuthStore()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Only load existing sessions from URL — never auto-create
  useEffect(() => {
    const sessionId = searchParams.get('sessionId')
    if (sessionId && sessionId !== currentSessionId) {
      loadSession(sessionId)
    }
  }, [searchParams])

  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true)
    try {
      const res = await chatApi.getHistory(sessionId, 1, 100)
      setCurrentSessionId(sessionId)
      setMessages(res.data.messages)
      setStreamingText('')
    } catch (err: any) {
      showToast(t('chat.loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleNewChat = () => {
    if (streaming && abortRef.current) {
      abortRef.current()
    }
    setCurrentSessionId(null)
    setMessages([])
    setStreamingText('')
    setInput('')
    setSearchParams({}, { replace: true })
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return

    const content = input.trim()
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Lazy session creation — only create when the first message is sent
    let sessionId = currentSessionId
    if (!sessionId) {
      try {
        const res = await chatApi.createSession(content.slice(0, 30))
        sessionId = res.data.sessionId
        setCurrentSessionId(sessionId)
        setSearchParams({ sessionId }, { replace: true })
      } catch (err: any) {
        showToast(t('chat.createFailed'), 'error')
        return
      }
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)
    setThinking(false)
    setStreamingText('')

    abortRef.current = streamChat(
      sessionId,
      content,
      (chunk) => { setThinking(false); setStreamingText((prev) => prev + chunk) },
      () => {
        chatApi.getHistory(sessionId!, 1, 100).then(({ data }) => {
          setMessages(data.messages)
        }).catch(() => {})
        setStreaming(false)
        setThinking(false)
        setStreamingText('')
      },
      (err) => {
        showToast(err.message || t('chat.sendFailed'), 'error')
        setStreaming(false)
        setThinking(false)
        setStreamingText('')
      },
      () => setThinking(true),
    )
  }, [input, streaming, currentSessionId, showToast, setSearchParams])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, MAX_CHARS)
    setInput(val)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
          {t('chat.title')}
        </h1>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('chat.new')}
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-5xl mb-4">🏡</div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('chat.welcome')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              {t('chat.welcomeDesc')}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-xs">
              {[t('chat.suggestion1'), t('chat.suggestion2'), t('chat.suggestion3')].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); textareaRef.current?.focus() }}
                  className="text-left px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand dark:hover:text-brand-light transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streaming && <StreamingBubble text={streamingText} thinking={thinking} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-none bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-brand-light transition-colors max-h-40 scrollbar-thin"
          />

          {streaming ? (
            <button
              onClick={() => { abortRef.current?.(); setStreaming(false); setStreamingText('') }}
              className="w-10 h-10 flex-shrink-0 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              title={t('chat.stop')}
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-10 h-10 flex-shrink-0 rounded-full bg-brand hover:bg-brand-dark disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white disabled:text-gray-400 flex items-center justify-center transition-colors"
              title={t('chat.send')}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {input.length > 400 && (
          <p className="text-right text-xs text-gray-400 mt-1">
            {input.length}/{MAX_CHARS}
          </p>
        )}
      </div>
    </div>
  )
}
