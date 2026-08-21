import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Select, Table, Tag, Title } from 'animal-island-ui'
import { IslandBusy } from '../components/IslandBusy'
import { fetchLeaderboard, fetchRogueLeaderboard } from '../lib/attempts'
import { formatDuration } from '../lib/format'
import { GRID_SIZE_OPTIONS } from '../variants/registry'
import { ROGUE_VARIANT_ID } from '../variants/schulte-rogue/content'
import { useAuth } from '../context/AuthContext'
import type { LeaderboardRow, RogueLeaderboardRow } from '../types'

type BoardKind = 'schulte' | 'rogue'
type ClassicMetric = 'best' | 'avg' | 'worst'
type RogueMetric = 'depth' | 'clear' | 'avg'

function scoreMs(row: LeaderboardRow, metric: ClassicMetric): number {
  if (metric === 'avg') return row.avg_ms
  if (metric === 'worst') return row.worst_ms
  return row.best_ms
}

function metricLabel(metric: ClassicMetric): string {
  if (metric === 'avg') return '平均'
  if (metric === 'worst') return '最慢'
  return '最佳'
}

function secondaryColumn(metric: ClassicMetric): { title: string; key: 'best' | 'avg' | 'worst' } {
  if (metric === 'worst') return { title: '最佳', key: 'best' }
  if (metric === 'avg') return { title: '最佳', key: 'best' }
  return { title: '平均', key: 'avg' }
}

/**
 * 排行榜：经典方格按用时；方格远征按层数/通关，两套互不混榜。
 */
export function LeaderboardPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const initialBoard: BoardKind =
    params.get('board') === 'rogue' || params.get('variant') === ROGUE_VARIANT_ID
      ? 'rogue'
      : 'schulte'

  const [board, setBoard] = useState<BoardKind>(initialBoard)
  const [gridSize, setGridSize] = useState(5)
  const [mode, setMode] = useState<'today' | 'all'>('today')
  const [metric, setMetric] = useState<ClassicMetric>('best')
  const [rogueMetric, setRogueMetric] = useState<RogueMetric>('depth')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [rogueRows, setRogueRows] = useState<RogueLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      if (board === 'rogue') {
        const data = await fetchRogueLeaderboard({ mode, metric: rogueMetric })
        if (cancelled) return
        setRogueRows(data)
        setRows([])
      } else {
        const data = await fetchLeaderboard({
          variantId: 'schulte',
          gridSize,
          mode,
          metric,
        })
        if (cancelled) return
        setRows(data)
        setRogueRows([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [board, gridSize, mode, metric, rogueMetric])

  const scoreLabel = metricLabel(metric)
  const secondary = secondaryColumn(metric)
  const classicData = rows.map((r, i) => ({
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

  const rogueData = rogueRows.map((r, i) => ({
    key: r.user_id,
    rank: i + 1,
    name: r.display_name,
    layers: `${r.best_layers} 层`,
    avgLayers: `${r.avg_layers ?? 0} 层`,
    runTime: formatDuration(r.best_ms),
    clearTime: r.won_best_ms > 0 ? formatDuration(r.won_best_ms) : '—',
    clears: r.clear_count,
    count: r.attempt_count,
    me: r.user_id === user?.id ? '我' : '',
  }))

  const blurb =
    board === 'rogue'
      ? rogueMetric === 'clear'
        ? '通关榜：只看通关最快的一趟（未通关不上榜）。'
        : rogueMetric === 'avg'
          ? '平均层数榜：看走得稳不稳；同平均再比最远那趟用时。'
          : '最远榜：先比走到第几层，同层再比对应用时（越快越好）。'
      : metric === 'worst'
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
          aria-label="玩法"
          options={[
            { key: 'schulte', label: '经典方格' },
            { key: 'rogue', label: '方格远征' },
          ]}
          value={board}
          onChange={(k) => {
            const next = k as BoardKind
            setBoard(next)
            const q = new URLSearchParams(params)
            if (next === 'rogue') q.set('board', 'rogue')
            else q.delete('board')
            q.delete('variant')
            setParams(q, { replace: true })
          }}
        />
        {board === 'rogue' ? (
          <Select
            aria-label="远征排名方式"
            options={[
              { key: 'depth', label: '最远排行' },
              { key: 'clear', label: '通关最快' },
              { key: 'avg', label: '平均层数' },
            ]}
            value={rogueMetric}
            onChange={(k) => setRogueMetric(k as RogueMetric)}
          />
        ) : (
          <Select
            aria-label="排名方式"
            options={[
              { key: 'best', label: '最佳排行' },
              { key: 'avg', label: '平均排行' },
              { key: 'worst', label: '最慢排行' },
            ]}
            value={metric}
            onChange={(k) => setMetric(k as ClassicMetric)}
          />
        )}
        <Select
          aria-label="范围"
          options={[
            { key: 'today', label: '今日榜' },
            { key: 'all', label: '总榜' },
          ]}
          value={mode}
          onChange={(k) => setMode(k as 'today' | 'all')}
        />
        {board === 'schulte' ? (
          <Select
            aria-label="网格"
            options={GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n}×${n}` }))}
            value={String(gridSize)}
            onChange={(k) => setGridSize(Number(k))}
          />
        ) : null}
      </div>

      {board === 'schulte' && metric === 'worst' ? (
        <Tag color="app-teal" size="large">
          慢悠悠趣味榜
        </Tag>
      ) : null}
      {board === 'rogue' ? (
        <Tag color="app-green" size="large">
          远征专榜 · 不与经典用时混排
        </Tag>
      ) : null}

      <Card
        color={
          board === 'rogue'
            ? 'app-green'
            : metric === 'worst'
              ? 'app-teal'
              : 'app-orange'
        }
        pattern={
          board === 'rogue'
            ? 'app-green'
            : metric === 'worst'
              ? 'app-teal'
              : 'app-orange'
        }
        className="leaderboard-card"
      >
        {loading ? (
          <IslandBusy label="统计岛民成绩…" />
        ) : (
          <div className="leaderboard-table-wrap">
            {board === 'rogue' ? (
              <Table
                rowKey="key"
                emptyText="还没有远征成绩，去做第一名吧！"
                columns={[
                  { title: '名次', dataIndex: 'rank', width: 64 },
                  {
                    title: '岛民',
                    dataIndex: 'name',
                    render: (_v, record) => (
                      <span>
                        {String(record.name)}{' '}
                        {record.me ? <Tag color="app-green">我</Tag> : null}
                      </span>
                    ),
                  },
                  ...(rogueMetric === 'avg'
                    ? [
                        { title: '平均', dataIndex: 'avgLayers', width: 88 },
                        { title: '最远', dataIndex: 'layers', width: 88 },
                      ]
                    : [{ title: '最远', dataIndex: 'layers', width: 88 }]),
                  {
                    title: rogueMetric === 'clear' ? '通关用时' : '该趟用时',
                    dataIndex: rogueMetric === 'clear' ? 'clearTime' : 'runTime',
                  },
                  { title: '通关', dataIndex: 'clears', width: 72 },
                  { title: '局数', dataIndex: 'count', width: 72 },
                ]}
                dataSource={rogueData}
              />
            ) : (
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
                dataSource={classicData}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
