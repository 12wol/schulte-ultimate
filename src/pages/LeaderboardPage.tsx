import { useEffect, useState } from 'react'
import { Card, Select, Table, Tag, Title } from 'animal-island-ui'
import { IslandBusy } from '../components/IslandBusy'
import { fetchLeaderboard } from '../lib/attempts'
import { formatDuration } from '../lib/format'
import { GRID_SIZE_OPTIONS } from '../variants/registry'
import { useAuth } from '../context/AuthContext'
import type { LeaderboardRow } from '../types'

type Metric = 'best' | 'avg' | 'worst'

function scoreMs(row: LeaderboardRow, metric: Metric): number {
  if (metric === 'avg') return row.avg_ms
  if (metric === 'worst') return row.worst_ms
  return row.best_ms
}

function metricLabel(metric: Metric): string {
  if (metric === 'avg') return '平均'
  if (metric === 'worst') return '最慢'
  return '最佳'
}

function secondaryColumn(metric: Metric): { title: string; key: 'best' | 'avg' | 'worst' } {
  if (metric === 'worst') return { title: '最佳', key: 'best' }
  if (metric === 'avg') return { title: '最佳', key: 'best' }
  return { title: '平均', key: 'avg' }
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const [gridSize, setGridSize] = useState(5)
  const [mode, setMode] = useState<'today' | 'all'>('today')
  const [metric, setMetric] = useState<Metric>('best')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await fetchLeaderboard({
        variantId: 'schulte',
        gridSize,
        mode,
        metric,
      })
      if (cancelled) return
      setRows(data)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [gridSize, mode, metric])

  const scoreLabel = metricLabel(metric)
  const secondary = secondaryColumn(metric)
  const dataSource = rows.map((r, i) => ({
    key: r.user_id,
    rank: i + 1,
    name: r.display_name,
    score: formatDuration(scoreMs(r, metric)),
    best: formatDuration(r.best_ms),
    avg: formatDuration(r.avg_ms),
    worst: formatDuration(r.worst_ms),
    count: r.attempt_count,
    me: r.user_id === user?.id ? '我' : '',
  }))

  const blurb =
    metric === 'worst'
      ? '最慢榜：按个人单局最慢成绩倒序，越慢越靠前（轻松趣味榜）。'
      : metric === 'avg'
        ? '平均榜看稳定性，最佳榜看爆发力。'
        : '最佳榜看爆发力，也可切换平均 / 最慢榜。'

  return (
    <div className="page leaderboard-page">
      <Title size="middle" color="app-red">
        排行榜
      </Title>
      <p className="muted">{blurb}</p>

      <div className="toolbar row">
        <Select
          aria-label="排名方式"
          options={[
            { key: 'best', label: '最佳排行' },
            { key: 'avg', label: '平均排行' },
            { key: 'worst', label: '最慢排行' },
          ]}
          value={metric}
          onChange={(k) => setMetric(k as Metric)}
        />
        <Select
          aria-label="范围"
          options={[
            { key: 'today', label: '今日榜' },
            { key: 'all', label: '总榜' },
          ]}
          value={mode}
          onChange={(k) => setMode(k as 'today' | 'all')}
        />
        <Select
          aria-label="网格"
          options={GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n}×${n}` }))}
          value={String(gridSize)}
          onChange={(k) => setGridSize(Number(k))}
        />
      </div>

      {metric === 'worst' && (
        <Tag color="app-teal" size="large">
          慢悠悠趣味榜
        </Tag>
      )}

      <Card
        color={metric === 'worst' ? 'app-teal' : 'app-orange'}
        pattern={metric === 'worst' ? 'app-teal' : 'app-orange'}
        className="leaderboard-card"
      >
        {loading ? (
          <IslandBusy label="统计岛民成绩…" />
        ) : (
          <div className="leaderboard-table-wrap">
            <Table
              rowKey="key"
              emptyText="还没有人上榜，去做第一名吧！"
              columns={[
                { title: '名次', dataIndex: 'rank', width: 64 },
                {
                  title: '岛民',
                  dataIndex: 'name',
                  render: (_v, record) => (
                    <span>
                      {String(record.name)}{' '}
                      {record.me ? <Tag color="app-green">我</Tag> : null}
                      {metric === 'worst' && record.rank === 1 ? (
                        <Tag color="app-teal">
                          {mode === 'today' ? '今日最慢' : '最慢王'}
                        </Tag>
                      ) : null}
                    </span>
                  ),
                },
                { title: scoreLabel, dataIndex: 'score' },
                { title: secondary.title, dataIndex: secondary.key },
                { title: '局数', dataIndex: 'count', width: 72 },
              ]}
              dataSource={dataSource}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
