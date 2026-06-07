import type { Context } from 'hono'
import { zhTW } from './dict/zh-TW'
import { en } from './dict/en'

export type Locale = 'zh-TW' | 'en'

const dictionaries: Record<Locale, any> = {
  'zh-TW': zhTW,
  en,
}

export type TranslationKey = Path<typeof zhTW>

type Path<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? T[K] extends object
          ? `${K}` | `${K}.${Path<T[K]>}`
          : `${K}`
        : never
    }[keyof T]
  : never

function getValueByPath(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

export function getLocale(c?: Context | { req?: { header: (name: string) => string | undefined } }): Locale {
  const acceptLang = c?.req?.header('Accept-Language') || ''
  if (acceptLang.startsWith('zh')) return 'zh-TW'
  if (acceptLang.startsWith('en')) return 'en'
  return 'zh-TW'
}

export function t(key: TranslationKey, locale: Locale = 'zh-TW', vars?: Record<string, string | number>): string {
  const dict = dictionaries[locale]
  let value = getValueByPath(dict as Record<string, any>, key)

  if (value === undefined) {
    value = getValueByPath(dictionaries.en as Record<string, any>, key)
  }

  if (value === undefined) {
    return key
  }

  if (vars) {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      const replacement = vars[name]
      return replacement !== undefined ? String(replacement) : `{{${name}}}`
    })
  }

  return value
}
