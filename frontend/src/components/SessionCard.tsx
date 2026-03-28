import { SessionWithPreview } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import clsx from 'clsx';

interface Props {
  session: SessionWithPreview;
  onClick: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

export function SessionCard({ session, onClick, onDelete, onArchive }: Props) {
  const relTime = formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: zhCN });
  const preview = session.lastMessage?.content?.slice(0, 40) ?? '暂无消息';

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      {/* Action buttons revealed on left-swipe (desktop fallback: shown inline below) */}
      <div className="absolute right-0 top-0 h-full flex">
        <button onClick={onArchive}
          className="w-[70px] bg-blue-500 text-white text-xs font-medium flex items-center justify-center">
          {session.archived ? '恢复' : '归档'}
        </button>
        <button onClick={onDelete}
          className="w-[70px] bg-red-500 text-white text-xs font-medium flex items-center justify-center">
          删除
        </button>
      </div>

      <div
        onClick={onClick}
        className={clsx(
          'relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 cursor-pointer',
          'hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{session.title}</span>
              {session.archived ? (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded px-1.5 py-0.5 flex-shrink-0">已归档</span>
              ) : session.messageCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {preview}{(session.lastMessage?.content?.length ?? 0) > 40 ? '…' : ''}
            </p>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{relTime}</span>
        </div>
      </div>
    </div>
  );
}
