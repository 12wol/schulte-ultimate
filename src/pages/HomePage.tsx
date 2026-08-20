import { Link } from 'react-router-dom'
import { Button, Card, Collapse, Divider, Tag, Title } from 'animal-island-ui'
import { getLiveVariants, VARIANT_REGISTRY } from '../variants/registry'
import { useAuth } from '../context/AuthContext'

export function HomePage() {
  const { profile } = useAuth()
  const live = getLiveVariants()

  return (
    <div className="page">
      <Title size="middle" color="app-blue">
        今日小岛看板
      </Title>
      <p className="muted">
        每次测试都会入库；可按日期回看，并跟踪最快 / 最慢 / 平均的多日趋势。
      </p>

      <div className="home-hero-actions">
        <Link to="/play">
          <Button type="primary" size="large">
            开始舒尔特挑战
          </Button>
        </Link>
        <Link to="/leaderboard">
          <Button size="large">查看排行榜</Button>
        </Link>
      </div>

      <Divider type="dashed-teal" />

      <Title size="small" color="app-green">
        测试变体
      </Title>
      <div className="variant-list">
        {VARIANT_REGISTRY.map((v) => (
          <Card key={v.id} color={v.status === 'live' ? 'app-green' : 'brown'}>
            <div className="variant-row">
              <div>
                <strong>{v.name}</strong>
                <p className="muted">{v.description}</p>
              </div>
              <Tag color={v.status === 'live' ? 'app-green' : 'app-orange'}>
                {v.status === 'live' ? '可玩' : '预留'}
              </Tag>
            </div>
            {v.status === 'live' && (
              <Link to={`/play?variant=${v.id}`}>
                <Button type="primary" block>
                  进入
                </Button>
              </Link>
            )}
          </Card>
        ))}
      </div>

      <Divider type="line-teal" />

      <Collapse
        question="小岛怎么玩？"
        answer={`当前已上线：${live.map((v) => v.name).join('、')}。默认 ${profile?.preferred_grid_size ?? 5}×${profile?.preferred_grid_size ?? 5}，可在设置里改。测完自动保存，去「今日 / 趋势 / 历史」看变化，和朋友比排行榜。`}
      />
      <Collapse
        question="开发者木屋在哪？"
        answer="设置页输入开发者口令解锁后，导航会出现「日志」。默认口令见 SQL 种子（建议上线后立刻改掉）。"
      />
    </div>
  )
}
