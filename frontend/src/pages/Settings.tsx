import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Shield, Bell, Palette, LogOut, ChevronRight, Trash2, X, AlertTriangle, RefreshCw } from 'lucide-react'
import { settingsApi, authApi, UserSettings, LoginLog, User as UserType } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../hooks/useTheme'
import { PasswordStrength } from '../components/PasswordStrength'
import { useToast } from '../components/Toast'
import { useTranslation, Locale } from '../i18n'
import { parseUTC } from '../utils/date'

type Section = 'account' | 'notification' | 'display' | 'security'
type ThemeMode = 'light' | 'dark' | 'system'

function maskEmail(email: string | null | undefined): string {
  if (!email) return '未绑定'
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  return `${local.slice(0, 2)}****@${domain}`
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '未绑定'
  const digits = phone.replace(/^\+\d{1,4}/, '')
  if (digits.length < 7) return phone
  return digits.slice(0, 3) + '****' + digits.slice(-4)
}

function formatDateTime(dateStr: string): string {
  const date = parseUTC(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Settings() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { showToast } = useToast()
  const { t, locale, setLocale } = useTranslation()

  const [storedTheme, setStoredTheme] = useState<ThemeMode>(
    (localStorage.getItem('theme') as ThemeMode) || 'system'
  )
  useTheme(storedTheme)

  const [userInfo, setUserInfo] = useState<UserType | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [section, setSection] = useState<Section>('account')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteSending, setDeleteSending] = useState(false)
  const [deleteSent, setDeleteSent] = useState(false)

  useEffect(() => {
    settingsApi.getSettings()
      .then(({ data }) => {
        setUserInfo(data.user)
        setSettings(data.settings)
        if (data.settings?.theme) {
          setStoredTheme(data.settings.theme as ThemeMode)
          localStorage.setItem('theme', data.settings.theme)
        }
        if (data.settings?.language) {
          setLocale(data.settings.language as Locale)
        }
      })
      .catch(() => showToast(t('settings.loadFailed'), 'error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (section === 'security') {
      settingsApi.getLoginLogs()
        .then(({ data }) => setLoginLogs(data))
        .catch(() => {})
    }
  }, [section])

  const updateSetting = async (key: keyof UserSettings, value: unknown) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    try {
      await settingsApi.updateSettings({ [key]: value })
    } catch {
      showToast(t('settings.saveFailed'), 'error')
    }
  }

  const handleThemeChange = (theme: ThemeMode) => {
    setStoredTheme(theme)
    localStorage.setItem('theme', theme)
    settingsApi.updateSettings({ theme }).catch(() => {})
  }

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPw || !newPw) { showToast(t('settings.pwRequired'), 'error'); return }
    if (newPw.length < 6) { showToast(t('settings.pwTooShort'), 'error'); return }
    setSavingPw(true)
    try {
      await settingsApi.changePassword(oldPw, newPw)
      showToast(t('settings.pwChanged'), 'success')
      setOldPw('')
      setNewPw('')
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail || err?.response?.data?.error || t('settings.pwFailed'),
        'error',
      )
    } finally {
      setSavingPw(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleRequestDelete = async () => {
    if (!userInfo?.email) {
      showToast(t('settings.deleteNoEmail'), 'error')
      return
    }
    setDeleteSending(true)
    try {
      await authApi.requestDelete()
      setDeleteSent(true)
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail || err?.response?.data?.error || t('settings.deleteAccountFailed'),
        'error',
      )
    } finally {
      setDeleteSending(false)
    }
  }

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'account', label: t('settings.account'), icon: <User className="w-4 h-4" /> },
    { key: 'notification', label: t('settings.notification'), icon: <Bell className="w-4 h-4" /> },
    { key: 'display', label: t('settings.display'), icon: <Palette className="w-4 h-4" /> },
    { key: 'security', label: t('settings.security'), icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header with section tabs */}
      <header className="flex-none bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="font-semibold text-gray-900 dark:text-white text-base mb-3">{t('settings.title')}</h1>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                section === item.key
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:pb-8 space-y-4 scrollbar-thin">

        {/* Account section */}
        {section === 'account' && (
          <>
            <Card title={t('settings.bindInfo')}>
              <InfoRow label={t('settings.email')} value={maskEmail(userInfo?.email)} />
              <InfoRow label={t('settings.phone')} value={maskPhone(userInfo?.phone)} />
            </Card>

            <Card title={t('settings.changePw')}>
              <form onSubmit={handleChangePw} className="space-y-3 pt-1">
                <input
                  type="password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  placeholder={t('settings.currentPw')}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                <div>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t('settings.newPw')}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                  {newPw && <PasswordStrength password={newPw} />}
                </div>
                <button
                  type="submit"
                  disabled={savingPw}
                  className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {savingPw ? t('settings.savingPw') : t('settings.savePw')}
                </button>
              </form>
            </Card>
          </>
        )}

        {/* Notification section */}
        {section === 'notification' && settings && (
          <>
            <Card title={t('settings.msgAlert')}>
              <ToggleRow
                label={t('settings.aiReply')}
                description={t('settings.aiReplyDesc')}
                value={!!settings.notification_ai_reply}
                onChange={(v) => updateSetting('notification_ai_reply', v ? 1 : 0)}
              />
              <ToggleRow
                label={t('settings.newSession')}
                description={t('settings.newSessionDesc')}
                value={!!settings.notification_new_session}
                onChange={(v) => updateSetting('notification_new_session', v ? 1 : 0)}
              />
            </Card>

            <Card title={t('settings.dnd')}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('settings.dndDesc')}</p>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={settings.dnd_start || '22:00'}
                  onChange={(e) => updateSetting('dnd_start', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <span className="text-gray-500 text-sm font-medium">{t('settings.dndTo')}</span>
                <input
                  type="time"
                  value={settings.dnd_end || '08:00'}
                  onChange={(e) => updateSetting('dnd_end', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </Card>
          </>
        )}

        {/* Display section */}
        {section === 'display' && (
          <>
            <Card title={t('settings.theme')}>
              {([
                { value: 'light', label: t('settings.themeLight'), icon: '☀️' },
                { value: 'dark', label: t('settings.themeDark'), icon: '🌙' },
                { value: 'system', label: t('settings.themeSystem'), icon: '💻' },
              ] as { value: ThemeMode; label: string; icon: string }[]).map((themeOpt) => (
                <RadioRow
                  key={themeOpt.value}
                  icon={themeOpt.icon}
                  label={themeOpt.label}
                  selected={storedTheme === themeOpt.value}
                  onClick={() => handleThemeChange(themeOpt.value)}
                />
              ))}
            </Card>

            <Card title={t('settings.language')}>
              {[
                { value: 'zh' as Locale, label: t('settings.langZh'), icon: '🇨🇳' },
                { value: 'en' as Locale, label: t('settings.langEn'), icon: '🇺🇸' },
              ].map((lang) => (
                <RadioRow
                  key={lang.value}
                  icon={lang.icon}
                  label={lang.label}
                  selected={locale === lang.value}
                  onClick={() => {
                    setLocale(lang.value)
                    updateSetting('language', lang.value)
                  }}
                />
              ))}
            </Card>
          </>
        )}

        {/* Security section */}
        {section === 'security' && (
          <Card title={t('settings.loginLogs')}>
            {loginLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{t('settings.noLogs')}</p>
            ) : (
              <div className="space-y-0">
                {loginLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 border-b last:border-0 border-gray-100 dark:border-gray-700"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {log.device ? log.device.slice(0, 60) : t('settings.unknownDevice')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {log.ip || t('settings.unknownIP')} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('settings.logout')}
        </button>

        {/* Delete account */}
        <button
          onClick={() => { setDeleteSent(false); setShowDeleteModal(true) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {t('settings.deleteAccount')}
        </button>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          sent={deleteSent}
          sending={deleteSending}
          onConfirm={handleRequestDelete}
          onClose={() => setShowDeleteModal(false)}
          t={t}
        />
      )}
    </div>
  )
}

// ─────────────────────── Delete Modal ───────────────────────

function DeleteAccountModal({
  sent,
  sending,
  onConfirm,
  onClose,
  t,
}: {
  sent: boolean
  sending: boolean
  onConfirm: () => void
  onClose: () => void
  t: (key: string) => string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('settings.deleteAccountTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {sent ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
                <span className="text-2xl">📧</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.deleteAccountSent')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('settings.deleteAccountDesc')}
              </p>

              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ 此操作不可撤销，账号注销后所有数据将永久删除。
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {sent ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              关闭
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                disabled={sending}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {sending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {sending ? t('settings.deleteAccountSending') : t('settings.deleteAccountBtn')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────── Reusable sub-components ───────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 border-gray-100 dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</span>
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 border-gray-100 dark:border-gray-700">
      <div className="flex-1">
        <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative ml-4 w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          value ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            value ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function RadioRow({
  icon,
  label,
  selected,
  onClick,
}: {
  icon?: string
  label: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full py-3 border-b last:border-0 border-gray-100 dark:border-gray-700"
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-left">{label}</span>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected
            ? 'border-brand bg-brand'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  )
}
