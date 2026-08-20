import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { Card, Loading, Select, Title } from 'animal-island-ui'
import { TrendChart } from '../components/TrendChart'
import { useAuth } from '../context/AuthContext'
import { fetchDailyStats, fetchRecentAttempts } from '../lib/attempts'
import { localDay } from '../lib/format'
import { GRID_SIZE_OPTIONS } from '../variants/registry'
import type { DailyStat, TestAttempt } from '../types'

type AxisMode = 'day' | 'attempt'

export function TrendsPage() {
  const { user, profile } = useAuth()
  const [gridSize, setGridSize] = useState(profile?.preferred_grid_size ?? 5)
  const [axis, setAxis] = useState<AxisMode>('day')
  const [dayRange, setDayRange] = useState('7')
  const [attemptRange, setAttemptRange] = useState('20')
  const [stats, setStats] = useState<DailyStat[]>([])
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)

  const { fromDay, toDay } = useMemo(() => {
    const to = localDay()
    const from = localDay(subDays(new Date(), Number(dayRange) - 1))
    return { fromDay: from, toDay: to }
  }, [dayRange])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      if (axis === 'day') {
        const rows = await fetchDailyStats({
          userId: user.id,
          variantId: 'schulte',
          gridSize,
          fromDay,
          toDay,
        })
        if (cancelled) return
        setStats(rows)
        setAttempts([])
      } else {
        const rows = await fetchRecentAttempts({
          userId: user.id,
          variantId: 'schulte',
          gridSize,
          limit: Number(attemptRange),
        })
        if (cancelled) return
        setAttempts(rows)
        setStats([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, gridSize, axis, fromDay, toDay, attemptRange])

  return (
    <div className="page">
      <Title size="middle" color="purple">
        趋势岛
      </Title>
      <p className="muted">
        {axis === 'day'
          ? '按天看最快 / 最慢 / 平均，观察每日练习效果。'
          : '按次数看每一局用时起伏，观察连续练习是否越来越快。'}
      </p>

      <div className="toolbar row">
        <Select
          aria-label="趋势维度"
          options={[
            { key: 'day', label: '按天趋势' },
            { key: 'attempt', label: '按次数趋势' },
          ]}
          value={axis}
          onChange={(k) => setAxis(k as AxisMode)}
        />
        {axis === 'day' ? (
          <Select
            aria-label="天数"
            options={[
              { key: '7', label: '近 7 日' },
              { key: '14', label: '近 14 日' },
              { key: '30', label: '近 30 日' },
            ]}
            value={dayRange}
            onChange={setDayRange}
          />
        ) : (
          <Select
            aria-label="局数"
            options={[
              { key: '20', label: '近 20 局' },
              { key: '50', label: '近 50 局' },
              { key: '100', label: '近 100 局' },
            ]}
            value={attemptRange}
            onChange={setAttemptRange}
          />
        )}
        <Select
          aria-label="网格"
          options={GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n}×${n}` }))}
          value={String(gridSize)}
          onChange={(k) => setGridSize(Number(k))}
        />
      </div>

      <Card color="purple" pattern="purple">
        {loading ? (
          <div className="center-block">
            <Loading />
            <p>绘制趋势…</p>
          </div>
        ) : axis === 'day' ? (
          <TrendChart mode="day" stats={stats} />
        ) : (
          <TrendChart mode="attempt" attempts={attempts} />
        )}
      </Card>
    </div>
  )
}
