export type TestVariantId = 'schulte' | (string & {})

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export type Profile = {
  id: string
  display_name: string
  username: string
  preferred_grid_size: number
  is_developer: boolean
  created_at: string
  updated_at: string
}

export type TestAttempt = {
  id: string
  user_id: string
  variant_id: string
  grid_size: number
  duration_ms: number
  played_on: string
  meta: Record<string, unknown>
  created_at: string
}

export type DailyStat = {
  user_id: string
  variant_id: string
  grid_size: number
  played_on: string
  attempt_count: number
  best_ms: number
  worst_ms: number
  avg_ms: number
}

export type AppLog = {
  id: string
  user_id: string | null
  level: LogLevel
  event: string
  message: string | null
  meta: Record<string, unknown>
  created_at: string
}

export type LeaderboardRow = {
  user_id: string
  display_name: string
  best_ms: number
  avg_ms: number
  worst_ms: number
  attempt_count: number
  played_on?: string
}

/** 方格远征排行行：按层数 / 通关用时，不与经典最短用时混榜 */
export type RogueLeaderboardRow = {
  user_id: string
  display_name: string
  best_layers: number
  best_ms: number
  clear_count: number
  attempt_count: number
  won_best_ms: number
  /** 平均清关层数（平均层数榜主列） */
  avg_layers: number
  played_on?: string
}
