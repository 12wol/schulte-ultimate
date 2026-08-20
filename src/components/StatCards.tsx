import { Card, Tag } from 'animal-island-ui'
import { formatDuration } from '../lib/format'

type Props = {
  bestMs: number | null
  worstMs: number | null
  avgMs: number | null
  attemptCount: number
}

export function StatCards({ bestMs, worstMs, avgMs, attemptCount }: Props) {
  const items = [
    { label: '最快', value: bestMs != null ? formatDuration(bestMs) : '—', color: 'app-green' as const },
    { label: '最慢', value: worstMs != null ? formatDuration(worstMs) : '—', color: 'app-orange' as const },
    { label: '平均', value: avgMs != null ? formatDuration(avgMs) : '—', color: 'app-blue' as const },
    { label: '次数', value: String(attemptCount), color: 'purple' as const },
  ]

  return (
    <div className="stat-grid">
      {items.map((item) => (
        <Card key={item.label} color={item.color}>
          <div className="stat-card-inner">
            <Tag color={item.color}>{item.label}</Tag>
            <strong className="stat-value">{item.value}</strong>
          </div>
        </Card>
      ))}
    </div>
  )
}
