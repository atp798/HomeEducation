import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { translations, Locale, TranslationKey } from './translations'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem('language') as Locale) || 'zh'
  })

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('language', newLocale)
  }, [])

  // Sync with settings changes from other parts of the app
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem('language') as Locale
      if (stored && stored !== locale) setLocaleState(stored)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [locale])

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] || translations['zh'][key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

export type { Locale, TranslationKey }
