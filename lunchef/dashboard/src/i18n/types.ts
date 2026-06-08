export type Locale = 'zh-TW' | 'en'

export type TranslationDict = typeof import('./dict/zh-TW').zhTW

export type TranslationKey = Path<TranslationDict>

type Path<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? T[K] extends object
          ? `${K}` | `${K}.${Path<T[K]>}`
          : `${K}`
        : never
    }[keyof T]
  : never

export type TranslateFn = (key: TranslationKey | string, vars?: Record<string, string | number>) => string
