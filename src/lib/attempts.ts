import { supabase } from './supabase'
import type { DailyStat, LeaderboardRow, RogueLeaderboardRow, TestAttempt } from '../types'

/** 成绩只能走 submit_attempt；客户端对 test_attempts 没有 insert 权限 */
export async function saveAttempt(input: {
  variantId: string
  gridSize: number
  durationMs: number
  meta?: Record<string, unknown>
}): Promise<{ data: TestAttempt | null; error: string | null }> {
  if (!supabase) return { data: null, error: '未配置数据库' }

  const { data, error } = await supabase.rpc('submit_attempt', {
    p_variant_id: input.variantId,
    p_grid_size: input.gridSize,
    p_duration_ms: input.durationMs,
    p_meta: input.meta ?? {},
  })

  if (error) {
    if (/could not find the function/i.test(error.message)) {
      return {
        data: null,
        error: '请先在 Supabase SQL Editor 依次执行 004、005 号 migration',
      }
    }
    return { data: null, error: error.message }
  }
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

/** Recent attempts chronological (oldest → newest within the window) for attempt-based trends */
export async function fetchRecentAttempts(params: {
  userId: string
  variantId: string
  gridSize: number
  limit: number
}): Promise<TestAttempt[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('user_id', params.userId)
    .eq('variant_id', params.variantId)
    .eq('grid_size', params.gridSize)
    .order('created_at', { ascending: false })
    .limit(params.limit)

  if (error) {
    console.error(error)
    return []
  }
  return ((data ?? []) as TestAttempt[]).slice().reverse()
}

export async function fetchLeaderboard(params: {
  variantId: string
  gridSize: number
  mode: 'today' | 'all'
  metric: 'best' | 'avg' | 'worst'
}): Promise<LeaderboardRow[]> {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('fetch_leaderboard', {
    p_variant_id: params.variantId,
    p_grid_size: params.gridSize,
    p_mode: params.mode,
    p_metric: params.metric,
  })

  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as LeaderboardRow[]
}

/** 方格远征排行：最远层 / 通关速度 / 平均层数 */
export async function fetchRogueLeaderboard(params: {
  mode: 'today' | 'all'
  metric: 'depth' | 'clear' | 'avg'
}): Promise<RogueLeaderboardRow[]> {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('fetch_rogue_leaderboard', {
    p_mode: params.mode,
    p_metric: params.metric,
  })

  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as RogueLeaderboardRow[]
}

/** 今日最佳榜第一名；展示名优先昵称，否则用户名 */
export async function fetchTodayChampion(params: {
  variantId: string
  gridSize: number
}): Promise<{ userId: string; name: string; bestMs: number } | null> {
  if (!supabase) return null

  const rows = await fetchLeaderboard({
    ...params,
    mode: 'today',
    metric: 'best',
  })
  const first = rows[0]
  if (!first) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', first.user_id)
    .maybeSingle()

  const nick = profile?.display_name?.trim() ?? ''
  const username = profile?.username?.trim() ?? ''
  const name = nick || username || first.display_name || '岛民'

  return {
    userId: first.user_id,
    name,
    bestMs: first.best_ms,
  }
}

