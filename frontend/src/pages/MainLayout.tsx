import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Clock, Settings as SettingsIcon } from 'lucide-react'
import { useSwipe } from '../hooks/useSwipe'
import { useTranslation } from '../i18n'
import Chat from './Chat'
import History from './History'
import Settings from './Settings'

export type TabId = 'history' | 'chat' | 'settings'

interface MainLayoutProps {
  defaultTab?: TabId
}

const TAB_ORDER: TabId[] = ['history', 'chat', 'settings']

export default function MainLayout({ defaultTab = 'chat' }: MainLayoutProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
  const navigate = useNavigate()

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'history', label: t('nav.history'), icon: <Clock className="w-5 h-5" /> },
    { id: 'chat', label: t('nav.chat'), icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'settings', label: t('nav.settings'), icon: <SettingsIcon className="w-5 h-5" /> },
  ]

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    navigate(`/${tab}`, { replace: true })
  }

  const currentIdx = TAB_ORDER.indexOf(activeTab)

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const next = TAB_ORDER[currentIdx + 1]
      if (next) handleTabChange(next)
    },
    onSwipeRight: () => {
      const prev = TAB_ORDER[currentIdx - 1]
      if (prev) handleTabChange(prev)
    },
    threshold: 150,
  })

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950"
      {...swipeHandlers}
    >
      {/* PC top tab nav */}
      <nav className="hidden md:flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-brand text-brand dark:text-brand-light dark:border-brand-light'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className={activeTab === 'history' ? 'h-full' : 'hidden'}>
          <History onSelectSession={(sessionId) => {
            handleTabChange('chat')
            navigate(`/chat?sessionId=${sessionId}`)
          }} />
        </div>
        <div className={activeTab === 'chat' ? 'h-full' : 'hidden'}>
          <Chat />
        </div>
        <div className={activeTab === 'settings' ? 'h-full' : 'hidden'}>
          <Settings />
        </div>
      </div>

      {/* ICP备案信息 */}
      <footer className="flex-shrink-0 py-2 px-4 text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <a href="http://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" className="hover:text-brand">
          京ICP备2025119408号-2
        </a>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
                activeTab === tab.id
                  ? 'text-brand dark:text-brand-light'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand dark:bg-brand-light" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
