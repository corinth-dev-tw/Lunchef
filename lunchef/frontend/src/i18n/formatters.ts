const TW_CURRENCY = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const TW_DATE = new Intl.DateTimeFormat('zh-TW', {
  month: 'short',
  day: 'numeric',
  weekday: 'short',
})

const TW_DATE_LONG = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatTwd(amount: number): string {
  return TW_CURRENCY.format(amount)
}

export function formatTwDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return TW_DATE.format(d)
}

export function formatTwDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return TW_DATE_LONG.format(d)
}

export function formatTime(time: string): string {
  return time
}

export function getRelativeDayLabel(dateStr: string): 'today' | 'tomorrow' | 'other' {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'today'
  if (dateStr === tomorrow) return 'tomorrow'
  return 'other'
}
