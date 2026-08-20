import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { Card, Loading, Select, Title } from 'animal-island-ui'
import { TrendChart } from '../components/TrendChart'
import { useAuth } from '../context/AuthContext'
import { fetchDailyStats } from '../lib/attempts'
import { localDay } from '../lib/format'
import { GRID_SIZE_OPTIONS } from '../variants/registry'
import type { DailyStat } from '../types'

export function TrendsPage() {
  const { user, profile } = useAuth()
  const [gridSize, setGridSize] = useState(profile?.preferred_grid_size ?? 5)
  const [range, setRange] = useState('7')
  const [stats, setStats] = useState<DailyStat[]>([])
  const [loading, setLoading] = useState(true)

  const { fromDay, toDay } = useMemo(() => {
    const to = localDay()
    const from = localDay(subDays(new Date(), Number(range) - 1))
    return { fromDay: from, toDay: to }
  }, [range])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const rows = await fetchDailyStats({
        userId: user.id,
        variantId: 'schulte',
        gridSize,
        fromDay,
        toDay,
      })
      if (cancelled) return
      setStats(rows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, gridSize, fromDay, toDay])

  return (
    <div className="page">
      <Title size="middle" color="purple">
        趋势岛
      </Title>
      <p className="muted">看每日最快 / 最慢 / 平均，观察练习效果。</p>

      <div className="toolbar row">
        <Select
          aria-label="天数"
          options={[
            { key: '7', label: '近 7 日' },
            { key: '14', label: '近 14 日' },
            { key: '30', label: '近 30 日' },
          ]}
          value={range}
          onChange={setRange}
        />
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
        ) : (
          <TrendChart stats={stats} />
        )}
      </Card>
    </div>
  )
}
