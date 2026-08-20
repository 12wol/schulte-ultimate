import { useEffect, useState } from 'react'
import { Card, DatePicker, Loading, Select, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { fetchAttemptsForDay, fetchDailyStats } from '../lib/attempts'
import { formatDuration, localDay } from '../lib/format'
import { GRID_SIZE_OPTIONS } from '../variants/registry'
import { StatCards } from '../components/StatCards'
import type { DailyStat, TestAttempt } from '../types'

export function HistoryPage() {
  const { user, profile } = useAuth()
  const [day, setDay] = useState(localDay())
  const [gridSize, setGridSize] = useState(profile?.preferred_grid_size ?? 5)
  const [stat, setStat] = useState<DailyStat | null>(null)
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !day) return
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
  }, [user, day, gridSize])

  return (
    <div className="page">
      <Title size="middle" color="app-orange">
        历史日历
      </Title>
      <p className="muted">按日期查看当天每一次成绩与三项指标。</p>

      <div className="toolbar row">
        <DatePicker
          aria-label="选择日期"
          value={day}
          onChange={(v) => {
            if (typeof v === 'string') setDay(v)
          }}
          allowClear={false}
          showToday
        />
        <Select
          aria-label="网格"
          options={GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n}×${n}` }))}
          value={String(gridSize)}
          onChange={(k) => setGridSize(Number(k))}
        />
      </div>

      {loading ? (
        <div className="center-block">
          <Loading />
          <p>翻开岛民日记…</p>
        </div>
      ) : (
        <>
          <StatCards
            bestMs={stat?.best_ms ?? null}
            worstMs={stat?.worst_ms ?? null}
            avgMs={stat?.avg_ms ?? null}
            attemptCount={stat?.attempt_count ?? 0}
          />
          <div className="attempt-list">
            {attempts.length === 0 ? (
              <Card>
                <p className="muted">这一天没有记录。</p>
              </Card>
            ) : (
              attempts.map((a) => (
                <Card key={a.id} color="app-blue">
                  <div className="attempt-row">
                    <span>{formatDuration(a.duration_ms)}</span>
                    <span className="muted">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                    <span className="muted">
                      误点 {(a.meta?.wrongClicks as number | undefined) ?? 0}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
