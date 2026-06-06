/** Format an ISO date string (YYYY-MM-DD) to localised zh-TW date */
export function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  if (dateStr === today) return '今天'
  if (dateStr === tomorrow) return '明天'
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

/** Format a full ISO datetime string to localised zh-TW date+time */
export function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Given a "HH:MM" cutoff time string, return a friendly countdown string
 * like "還有 1h 30m" if the cutoff is within 2 hours; otherwise null.
 */
export function getCutoffCountdown(cutoffTime: string): string | null {
  const now = new Date()
  const [h, m] = cutoffTime.split(':').map(Number)
  const cutoff = new Date(now)
  cutoff.setHours(h, m, 0, 0)
  const diffMs = cutoff.getTime() - now.getTime()
  if (diffMs <= 0 || diffMs > 2 * 60 * 60 * 1000) return null
  const totalMins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours > 0) return `還有 ${hours}h ${mins}m`
  return `還有 ${mins}m`
}

/** Return time-of-day greeting prefix */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}
