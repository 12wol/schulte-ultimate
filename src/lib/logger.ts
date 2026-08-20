import { supabase } from './supabase'
import type { LogLevel } from '../types'

export async function writeLog(
  level: LogLevel,
  event: string,
  message?: string,
  meta: Record<string, unknown> = {},
  _userId?: string | null,
): Promise<void> {
  // Always mirror to console for local debugging
  console[level === 'debug' ? 'log' : level](`[${event}]`, message ?? '', meta)

  if (!supabase) return

  try {
    // RLS: only attach user_id when JWT session exists (matches auth.uid())
    const { data: authData } = await supabase.auth.getSession()
    const sessionUserId = authData.session?.user.id ?? null

    const { error } = await supabase.from('app_logs').insert({
      user_id: sessionUserId,
      level,
      event,
      message: message ?? null,
      meta,
    })
    if (error) {
      console.warn('writeLog skipped:', error.message)
    }
  } catch (err) {
    console.error('writeLog failed', err)
  }
}
