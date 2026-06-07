const TW_CURRENCY = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const TW_DATE = new Intl.DateTimeFormat('zh-TW', {
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

export function formatTwTime(time: string): string {
  return time
}
