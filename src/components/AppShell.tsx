import { NavLink, Outlet } from 'react-router-dom'
import { Cursor, Footer, Icon, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: '小岛', icon: 'icon-map' as const },
  { to: '/play', label: '测试', icon: 'icon-diy' as const },
  { to: '/today', label: '今日', icon: 'icon-miles' as const },
  { to: '/trends', label: '趋势', icon: 'icon-critterpedia' as const },
  { to: '/history', label: '历史', icon: 'icon-camera' as const },
  { to: '/leaderboard', label: '排行', icon: 'icon-shopping' as const },
  { to: '/settings', label: '设置', icon: 'icon-design' as const },
]

export function AppShell() {
  const { profile } = useAuth()

  return (
    <Cursor>
      <div className="app-shell">
        <header className="app-header">
          <Title size="large" color="app-green">
            舒马特测试终极无敌版
          </Title>
          <p className="app-subtitle">
            {profile ? `欢迎回来，${profile.display_name}` : '注意力小岛'}
          </p>
        </header>

        <nav className="app-nav" aria-label="主导航">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
            >
              <Icon name={link.icon} size={18} />
              <span>{link.label}</span>
            </NavLink>
          ))}
          {profile?.is_developer && (
            <NavLink
              to="/dev-logs"
              className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
            >
              <Icon name="icon-helicopter" size={18} />
              <span>日志</span>
            </NavLink>
          )}
        </nav>

        <main className="app-main">
          <Outlet />
        </main>

        <Footer type="sea" />
      </div>
    </Cursor>
  )
}
