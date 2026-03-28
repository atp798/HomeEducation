import React, { useState, useEffect } from 'react'
import { Trash2, Archive, ArchiveRestore, MessageSquare, MoreVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { chatApi, SessionWithPreview } from '../api/client'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import { parseUTC } from '../utils/date'

type FilterType = 'all' | 'today' | 'week'

interface HistoryProps {
  onSelectSession?: (sessionId: string) => void
}

// getRelativeTime is now inside the component to access translations

export default function History({ onSelectSession }: HistoryProps) {
  const { showToast } = useToast()
  const { t } = useTranslation()

  const getRelativeTime = (dateStr: string): string => {
    const date = parseUTC(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('time.justNow')
    if (diffMins < 60) return t('time.minutesAgo', { n: diffMins })
    if (diffHours < 24) return t('time.hoursAgo', { n: diffHours })
    if (diffDays < 7) return t('time.daysAgo', { n: diffDays })
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const FILTER_LABELS: Record<FilterType, string> = {
    today: t('history.today'),
    week: t('history.week'),
    all: t('history.all'),
  }
  const [sessions, setSessions] = useState<SessionWithPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [archiveExpanded, setArchiveExpanded] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [filter])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const res = await chatApi.getSessions(filter)
      // Only show sessions that have messages
      setSessions(res.data.filter((s) => s.messageCount > 0))
    } catch {
      showToast(t('history.loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await chatApi.deleteSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setDeleteConfirmId(null)
      setSwipeOpenId(null)
      showToast(t('history.deleted'), 'success')
    } catch {
      showToast(t('history.deleteFailed'), 'error')
    }
  }

  const handleArchive = async (session: SessionWithPreview) => {
    const newArchived = session.archived ? 0 : 1
    try {
      await chatApi.updateSession(session.id, { archived: newArchived })
      setSessions((prev) =>
        prev.map((s) => s.id === session.id ? { ...s, archived: newArchived } : s)
      )
      setSwipeOpenId(null)
      showToast(newArchived ? t('history.archived_toast') : t('history.restored'), 'success')
    } catch {
      showToast(t('history.actionFailed'), 'error')
    }
  }

  const activeSessions = sessions.filter((s) => !s.archived)
  const archivedSessions = sessions.filter((s) => s.archived)

  const renderCard = (session: SessionWithPreview) => (
    <SessionCard
      key={session.id}
      session={session}
      isSwipeOpen={swipeOpenId === session.id}
      onSwipeOpen={() => setSwipeOpenId(session.id)}
      onSwipeClose={() => setSwipeOpenId(null)}
      onClick={() => {
        if (swipeOpenId === session.id) { setSwipeOpenId(null); return }
        onSelectSession?.(session.id)
      }}
      onDelete={() => setDeleteConfirmId(session.id)}
      onArchive={() => handleArchive(session)}
      getRelativeTime={getRelativeTime}
    />
  )

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex-none bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="font-semibold text-gray-900 dark:text-white text-base mb-3">{t('history.title')}</h1>
        <div className="flex gap-2">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </header>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-20 md:pb-4 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeSessions.length === 0 && archivedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('history.empty')}</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('history.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Active sessions */}
            {activeSessions.map(renderCard)}

            {/* Archived sessions — collapsible section */}
            {archivedSessions.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setArchiveExpanded((v) => !v)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {archiveExpanded
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                  <Archive className="w-3.5 h-3.5" />
                  {t('history.archived')}（{archivedSessions.length}）
                </button>

                {archiveExpanded && (
                  <div className="space-y-2 mt-1 pl-0">
                    {archivedSessions.map(renderCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl animate-slide-up">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('history.confirmDelete')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('history.confirmDeleteMsg')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('history.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t('history.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SessionCardProps {
  session: SessionWithPreview
  isSwipeOpen: boolean
  onSwipeOpen: () => void
  onSwipeClose: () => void
  onClick: () => void
  onDelete: () => void
  onArchive: () => void
}

function SessionCard({
  session,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
  onClick,
  onDelete,
  onArchive,
  getRelativeTime,
}: SessionCardProps & { getRelativeTime: (d: string) => string }) {
  const { t } = useTranslation()
  const startX = React.useRef(0)
  const REVEAL = 140

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons behind card */}
      <div className="absolute right-0 top-0 h-full flex">
        <button
          onClick={onArchive}
          className="w-16 flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium gap-1 transition-colors"
        >
          {session.archived ? (
            <><ArchiveRestore className="w-4 h-4" />{t('history.restore')}</>
          ) : (
            <><Archive className="w-4 h-4" />{t('history.archive')}</>
          )}
        </button>
        <button
          onClick={onDelete}
          className="w-16 flex flex-col items-center justify-center bg-red-500 hover:bg-red-600 text-white text-xs font-medium gap-1 transition-colors rounded-r-xl"
        >
          <Trash2 className="w-4 h-4" />
          {t('history.delete')}
        </button>
      </div>

      {/* Card */}
      <div
        style={{
          transform: `translateX(${isSwipeOpen ? -REVEAL : 0}px)`,
          transition: 'transform 0.25s ease',
        }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - startX.current
          if (dx < -50) onSwipeOpen()
          else if (dx > 30) onSwipeClose()
        }}
        onClick={onClick}
        className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 cursor-pointer hover:border-brand dark:hover:border-brand-light transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {session.title}
              </span>
              {session.messageCount > 0 && !session.archived && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand" />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {session.lastMessage
                ? (session.lastMessage.content.length > 30
                    ? session.lastMessage.content.slice(0, 30) + '...'
                    : session.lastMessage.content)
                : t('history.noMessage')}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-start gap-1.5">
            <div className="text-right">
              <span className="text-xs text-gray-400">
                {getRelativeTime(session.updated_at)}
              </span>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
                {session.messageCount}{t('history.msgCount')}
              </p>
            </div>
            {/* Desktop action button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                isSwipeOpen ? onSwipeClose() : onSwipeOpen()
              }}
              className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors -mr-1 mt-[-2px]"
              title={t('history.actions')}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
