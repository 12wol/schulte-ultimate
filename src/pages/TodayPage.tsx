import { useEffect, useState } from 'react'
import { Card, Loading, Select, Title } from 'animal-island-ui'
import { StatCards } from '../components/StatCards'
import { useAuth } from '../context/AuthContext'
import { fetchAttemptsForDay, fetchDailyStats } from '../lib/attempts'
import { formatDuration, localDay } from '../lib/format'
import { GRID_SIZE_OPTIONS } from '../variants/registry'
import type { DailyStat, TestAttempt } from '../types'

export function TodayPage() {
  const { user, profile } = useAuth()
  const [gridSize, setGridSize] = useState(profile?.preferred_grid_size ?? 5)
  const [stat, setStat] = useState<DailyStat | null>(null)
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const day = localDay()

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [stats, list] = await Promise.all([
        fetchDailyStats({
          userId: user.id,
          variantId: 'schulte',
          gridSize,
          fromDay: day,
          toDay: day,
        }),
        fetchAttemptsForDay({
          userId: user.id,
          variantId: 'schulte',
          gridSize,
          day,
        }),
      ])
      if (cancelled) return
      setStat(stats[0] ?? null)
      setAttempts(list)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, gridSize, day])

  return (
    <div className="page">
      <Title size="middle" color="app-blue">
        今日战绩 · {day}
      </Title>

      <div className="toolbar">
        <Select
          aria-label="网格大小"
          options={GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n}×${n}` }))}
          value={String(gridSize)}
          onChange={(k) => setGridSize(Number(k))}
        />
      </div>

      {loading ? (
        <div className="center-block">
          <Loading />
          <p>统计今日数据…</p>
        </div>
      ) : (
        <>
          <StatCards
            bestMs={stat?.best_ms ?? null}
            worstMs={stat?.worst_ms ?? null}
            avgMs={stat?.avg_ms ?? null}
            attemptCount={stat?.attempt_count ?? 0}
          />

          <Title size="small" color="app-orange">
            每一次明细
          </Title>
          {attempts.length === 0 ? (
            <Card>
              <p className="muted">今天还没有测试，去挑战一局吧。</p>
            </Card>
          ) : (
            <div className="attempt-list">
              {attempts.map((a, i) => (
                <Card key={a.id} color="warm-peach-pink">
                  <div className="attempt-row">
                    <strong>#{attempts.length - i}</strong>
                    <span>{formatDuration(a.duration_ms)}</span>
                    <span className="muted">
                      {new Date(a.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
