import { supabase } from './supabase'
import { localDay } from './format'
import type { DailyStat, LeaderboardRow, TestAttempt } from '../types'

export async function saveAttempt(input: {
  userId: string
  variantId: string
  gridSize: number
  durationMs: number
  meta?: Record<string, unknown>
}): Promise<{ data: TestAttempt | null; error: string | null }> {
  if (!supabase) return { data: null, error: '未配置数据库' }

  const payload = {
    user_id: input.userId,
    variant_id: input.variantId,
    grid_size: input.gridSize,
    duration_ms: input.durationMs,
    played_on: localDay(),
    meta: input.meta ?? {},
  }

  const { data, error } = await supabase.from('test_attempts').insert(payload).select('*').single()
  if (error) return { data: null, error: error.message }
  return { data: data as TestAttempt, error: null }
}

export async function fetchAttemptsForDay(params: {
  userId: string
  variantId: string
  gridSize: number
  day: string
}): Promise<TestAttempt[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('user_id', params.userId)
    .eq('variant_id', params.variantId)
    .eq('grid_size', params.gridSize)
    .eq('played_on', params.day)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as TestAttempt[]
}

export async function fetchDailyStats(params: {
  userId: string
  variantId: string
  gridSize: number
  fromDay: string
  toDay: string
}): Promise<DailyStat[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', params.userId)
    .eq('variant_id', params.variantId)
    .eq('grid_size', params.gridSize)
    .gte('played_on', params.fromDay)
    .lte('played_on', params.toDay)
    .order('played_on', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as DailyStat[]
}

export async function fetchLeaderboard(params: {
  variantId: string
  gridSize: number
  mode: 'today' | 'all'
  metric: 'best' | 'avg' | 'worst'
}): Promise<LeaderboardRow[]> {
  if (!supabase) return []

  let query = supabase
    .from('test_attempts')
    .select('user_id, duration_ms, played_on')
    .eq('variant_id', params.variantId)
    .eq('grid_size', params.gridSize)

  if (params.mode === 'today') {
    query = query.eq('played_on', localDay())
  }

  const { data, error } = await query.order('duration_ms', { ascending: true }).limit(2000)
  if (error) {
    console.error(error)
    return []
  }

  type Agg = {
    user_id: string
    display_name: string
    best_ms: number
    worst_ms: number
    sum_ms: number
    attempt_count: number
    played_on?: string
  }

  const agg = new Map<string, Agg>()
  for (const row of data ?? []) {
    const userId = row.user_id as string
    const duration = row.duration_ms as number
    const existing = agg.get(userId)
    if (!existing) {
      agg.set(userId, {
        user_id: userId,
        display_name: '岛民',
        best_ms: duration,
        worst_ms: duration,
        sum_ms: duration,
        attempt_count: 1,
        played_on: row.played_on as string,
      })
    } else {
      existing.attempt_count += 1
      existing.sum_ms += duration
      if (duration < existing.best_ms) {
        existing.best_ms = duration
        existing.played_on = row.played_on as string
      }
      if (duration > existing.worst_ms) {
        existing.worst_ms = duration
      }
    }
  }

  const ids = [...agg.keys()]
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', ids)
    for (const p of profiles ?? []) {
      const row = agg.get(p.id as string)
      if (row) row.display_name = (p.display_name as string) || '岛民'
    }
  }

  const rows: LeaderboardRow[] = [...agg.values()].map((r) => ({
    user_id: r.user_id,
    display_name: r.display_name,
    best_ms: r.best_ms,
    avg_ms: Math.round(r.sum_ms / r.attempt_count),
    worst_ms: r.worst_ms,
    attempt_count: r.attempt_count,
    played_on: r.played_on,
  }))

  const sorted =
    params.metric === 'avg'
      ? rows.sort((a, b) => a.avg_ms - b.avg_ms || a.best_ms - b.best_ms)
      : params.metric === 'worst'
        ? rows.sort((a, b) => b.worst_ms - a.worst_ms || b.avg_ms - a.avg_ms)
        : rows.sort((a, b) => a.best_ms - b.best_ms || a.avg_ms - b.avg_ms)

  return sorted.slice(0, 20)
}
