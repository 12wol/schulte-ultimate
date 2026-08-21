import { supabase } from './supabase'
import type { LogLevel } from '../types'

export async function writeLog(
  level: LogLevel,
  event: string,
  message?: string,
  meta: Record<string, unknown> = {},
  _userId?: string | null,
): Promise<void> {
  console[level === 'debug' ? 'log' : level](`[${event}]`, message ?? '', meta)

  if (!supabase) return

  try {
    const { error } = await supabase.rpc('write_app_log', {
      p_level: level,
      p_event: event,
      p_message: message ?? null,
      p_meta: meta,
    })
    if (error) {
      console.warn('writeLog skipped:', error.message)
    }
  } catch (err) {
    console.error('writeLog failed', err)
  }
}
