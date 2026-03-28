import { MessageSquare, Clock, Settings } from 'lucide-react';
import clsx from 'clsx';

export type TabId = 'history' | 'chat' | 'settings';

interface TabNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; Icon: typeof MessageSquare }[] = [
  { id: 'history',  label: '历史', Icon: Clock },
  { id: 'chat',     label: '咨询', Icon: MessageSquare },
  { id: 'settings', label: '设置', Icon: Settings },
];

// On mobile: fixed bottom bar. On desktop (md+): fixed top bar.
export function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-bottom">
        <div className="flex">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors',
                activeTab === id
                  ? 'text-brand'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop top nav */}
      <nav className="hidden md:flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 gap-1">
        <div className="flex items-center gap-1">
          <span className="text-lg mr-3">🏡</span>
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* PC keyboard hint */}
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-300 dark:text-gray-600">
          <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded">Ctrl+1/2/3</kbd>
        </div>
      </nav>
    </>
  );
}
