import React from 'react'

interface PasswordStrengthProps {
  password: string
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8) score++
  if (/[0-9]/.test(password)) score++
  if (/[a-zA-Z]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: '弱', color: 'bg-red-500' }
  if (score <= 2) return { score, label: '中', color: 'bg-yellow-500' }
  if (score <= 3) return { score, label: '良好', color: 'bg-blue-500' }
  return { score, label: '强', color: 'bg-green-500' }
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const { score, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-1">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= score ? color : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${
        score <= 1 ? 'text-red-500' : score <= 2 ? 'text-yellow-500' : score <= 3 ? 'text-blue-500' : 'text-green-500'
      }`}>
        密码强度：{label}
      </p>
    </div>
  )
}
