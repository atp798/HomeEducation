import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message } from '../api/client'
import { parseUTC } from '../utils/date'

interface MessageBubbleProps {
  message: Message
}

interface StreamingBubbleProps {
  text: string
  thinking?: boolean
}

function formatTime(dateStr: string): string {
  const date = parseUTC(dateStr)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

const markdownComponents: Record<string, React.FC<any>> = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }: any) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <pre className="bg-black/20 rounded-lg p-3 my-2 overflow-x-auto text-xs">
          <code className={className} {...props}>{children}</code>
        </pre>
      )
    }
    return (
      <code className="bg-black/20 rounded px-1 py-0.5 text-xs" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-white/50 pl-3 my-2 opacity-90">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-white/30 px-2 py-1 font-semibold text-left">{children}</th>,
  td: ({ children }) => <td className="border border-white/30 px-2 py-1">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">{children}</a>
  ),
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isUser
            ? 'bg-brand text-white'
            : 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white'
        }`}
      >
        {isUser ? '我' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isUser
              ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-br-sm shadow-sm border border-gray-100 dark:border-gray-700 whitespace-pre-wrap'
              : 'bg-brand text-white rounded-bl-sm shadow-sm prose-invert'
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        <span className="text-xs text-gray-400 mt-1 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

export const StreamingBubble: React.FC<StreamingBubbleProps> = ({ text, thinking }) => {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-400 to-indigo-600 text-white flex-shrink-0">
        AI
      </div>
      <div className="flex flex-col items-start max-w-[75%]">
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-brand text-white shadow-sm break-words prose-invert">
          {thinking && !text ? (
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-white/70 text-xs">思考中...</span>
            </div>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {text}
              </ReactMarkdown>
              <span className="inline-block w-0.5 h-4 bg-white ml-0.5 align-middle animate-blink" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
