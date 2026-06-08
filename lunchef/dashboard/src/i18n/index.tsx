import React, { createContext, useContext, useState, useCallback } from 'react'
import { zhTW } from './dict/zh-TW'
import { en } from './dict/en'
import { formatTwd, formatTwDate } from './formatters'
import type { Locale, TranslateFn } from './types'

export { formatTwd, formatTwDate }
export type { Locale, TranslateFn }

const dictionaries: Record<Locale, any> = {
  'zh-TW': zhTW,
  en,
}

function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'zh-TW'
  const lang = navigator.language || (navigator as any).userLanguage || 'zh-TW'
  if (lang.startsWith('zh')) return 'zh-TW'
  return 'en'
}

function getValueByPath(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslateFn
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => getBrowserLocale())

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dict = dictionaries[locale]
      let value = getValueByPath(dict as Record<string, any>, key)

      if (value === undefined) {
        value = getValueByPath(dictionaries.en as Record<string, any>, key)
      }

      if (value === undefined) {
        if (import.meta.env.DEV) {
          console.warn(`[i18n] Missing translation: ${key}`)
        }
        return key
      }

      if (vars) {
        value = value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
          const replacement = vars[name]
          return replacement !== undefined ? String(replacement) : `{{${name}}}`
        })
      }

      return value
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
