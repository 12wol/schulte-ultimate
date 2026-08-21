import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Collapse, Divider, Tag, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { fetchAttemptsForDay, fetchTodayChampion } from '../lib/attempts'
import { localDay } from '../lib/format'
import { VARIANT_REGISTRY } from '../variants/registry'

export function HomePage() {
  const { user, profile } = useAuth()
  const gridSize = profile?.preferred_grid_size ?? 5
  const day = localDay()

  const [championName, setChampionName] = useState<string | null>(null)
  const [championIsSelf, setChampionIsSelf] = useState(false)
  const [practicedToday, setPracticedToday] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      const [champion, attempts] = await Promise.all([
        fetchTodayChampion({ variantId: 'schulte', gridSize }),
        fetchAttemptsForDay({
          userId: user.id,
          variantId: 'schulte',
          gridSize,
          day,
        }),
      ])
      if (cancelled) return

      if (champion) {
        setChampionName(champion.name)
        setChampionIsSelf(champion.userId === user.id)
      } else {
        setChampionName(null)
        setChampionIsSelf(false)
      }
      setPracticedToday(attempts.length > 0)
    })()

    return () => {
      cancelled = true
    }
  }, [user, gridSize, day])

  const tipLine = practicedToday
    ? '今天已经练过啦，要不要再冲一把，看看手感还在不在？'
    : '今天还没有练习哦，快去测试一下，看看自己有没有提升吧～'

  const championLine = !championName
    ? '今天的第一名宝座还空着，去坐一下？'
    : championIsSelf
      ? `哇，${championName}，你就是今日第一名！要不要再刷一刷守住宝座？`
      : `${championName} 是今日第一名，快去挑战他吧！`

  return (
    <div className="page">
      <Title size="middle" color="app-blue">
        今日挑战
      </Title>
      <p className="muted">{tipLine}</p>
      <p className="home-champion">{championLine}</p>

      <div className="home-hero-actions">
        <Link to="/play">
          <Button type="primary" size="large">
            去方格挑战
          </Button>
        </Link>
        <Link to="/leaderboard">
          <Button size="large">去看看排行榜</Button>
        </Link>
      </div>

      <Divider type="dashed-teal" />

      <Title size="small" color="app-green">
        其他测试
      </Title>
      <div className="variant-list">
        {VARIANT_REGISTRY.map((v) => (
          <Card key={v.id} color={v.status === 'live' ? 'app-green' : 'brown'}>
            <div className="variant-row">
              <div>
                <strong>{v.name}</strong>
                <p className="muted">
                  {v.status === 'live'
                    ? '按顺序点格子，越快越厉害！'
                    : '还在装修中，过几天再来看看～'}
                </p>
              </div>
              <Tag color={v.status === 'live' ? 'app-green' : 'app-orange'}>
                {v.status === 'live' ? '开放中' : '装修中'}
              </Tag>
            </div>
            {v.status === 'live' && (
              <Link to={`/play?variant=${v.id}`}>
                <Button type="primary" block>
                  进去玩
                </Button>
              </Link>
            )}
          </Card>
        ))}
      </div>

      <Divider type="line-teal" />

      <Collapse
        question="这里怎么玩呀？"
        answer={`先点「去方格挑战」，从 1 点到最大的数字就行。默认是 ${gridSize}×${gridSize}，不顺手就去设置里改。测完成绩会留下来，想回味去「今日 / 趋势 / 历史」转转，想较劲就去排行榜瞅瞅～`}
      />
      <Collapse
        question="排行榜上的名字怎么改？"
        answer="去「设置」里改「显示昵称」，保存就好啦。改的是大家看到的名字，登录用户名不会动哦。"
      />
    </div>
  )
}
