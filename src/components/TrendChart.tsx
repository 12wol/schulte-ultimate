import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDuration } from '../lib/format'
import type { DailyStat, TestAttempt } from '../types'

type DayProps = {
  mode: 'day'
  stats: DailyStat[]
}

type AttemptProps = {
  mode: 'attempt'
  attempts: TestAttempt[]
}

type Props = DayProps | AttemptProps

export function TrendChart(props: Props) {
  if (props.mode === 'day') {
    const data = props.stats.map((s) => ({
      label: s.played_on.slice(5),
      最快: +(s.best_ms / 1000).toFixed(2),
      最慢: +(s.worst_ms / 1000).toFixed(2),
      平均: +(s.avg_ms / 1000).toFixed(2),
    }))

    if (data.length === 0) {
      return <p className="muted">这几天还没有记录，先去测几局吧～</p>
    }

    return (
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6d7c3" />
            <XAxis dataKey="label" stroke="#7a5c3e" />
            <YAxis stroke="#7a5c3e" tickFormatter={(v) => `${v}s`} width={48} />
            <Tooltip
              formatter={(value) => formatDuration(Math.round(Number(value) * 1000))}
              contentStyle={{
                borderRadius: 16,
                border: '2px solid #7a5c3e',
                background: '#fff8e8',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="最快" stroke="#3cb371" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="最慢" stroke="#e67e22" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="平均" stroke="#3aa8c1" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const data = props.attempts.map((a, i) => ({
    label: `#${i + 1}`,
    用时: +(a.duration_ms / 1000).toFixed(2),
  }))

  if (data.length === 0) {
    return <p className="muted">还没有逐局记录，先去测几局吧～</p>
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6d7c3" />
          <XAxis dataKey="label" stroke="#7a5c3e" interval="preserveStartEnd" />
          <YAxis stroke="#7a5c3e" tickFormatter={(v) => `${v}s`} width={48} />
          <Tooltip
            formatter={(value) => formatDuration(Math.round(Number(value) * 1000))}
            labelFormatter={(label) => `第 ${String(label).replace('#', '')} 局`}
            contentStyle={{
              borderRadius: 16,
              border: '2px solid #7a5c3e',
              background: '#fff8e8',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="用时" stroke="#19c8b9" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
