import { format } from 'date-fns'

/** Local calendar day as YYYY-MM-DD */
export function localDay(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(2)}s`
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(1)
  return `${m}m ${s}s`
}
