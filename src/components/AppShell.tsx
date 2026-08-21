import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Cursor, Footer, Icon, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeContext'
import { SOFT_NAV_ICONS } from '../theme/SoftIcons'

const links = [
  { to: '/', label: '小岛', softLabel: '花园', islandIcon: 'icon-map' as const, softIcon: 'home' as const },
  { to: '/play', label: '测试', softLabel: '挑战', islandIcon: 'icon-diy' as const, softIcon: 'play' as const },
  { to: '/today', label: '今日', softLabel: '今日', islandIcon: 'icon-miles' as const, softIcon: 'today' as const },
  {
    to: '/trends',
    label: '趋势',
    softLabel: '趋势',
    islandIcon: 'icon-critterpedia' as const,
    softIcon: 'trends' as const,
  },
  {
    to: '/history',
    label: '历史',
    softLabel: '足迹',
    islandIcon: 'icon-camera' as const,
    softIcon: 'history' as const,
  },
  {
    to: '/leaderboard',
    label: '排行',
    softLabel: '邻居',
    islandIcon: 'icon-shopping' as const,
    softIcon: 'leaderboard' as const,
  },
  {
    to: '/settings',
    label: '设置',
    softLabel: '设置',
    islandIcon: 'icon-design' as const,
    softIcon: 'settings' as const,
  },
]

export function AppShell() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const soft = theme === 'soft'

  const shell = (
    <div className={`app-shell${soft ? ' soft-shell' : ''}`}>
      <header className="app-header">
        {soft ? (
          <h1 className="soft-brand">舒马特花园</h1>
        ) : (
          <Title size="large" color="app-green">
            舒马特测试终极无敌版
          </Title>
        )}
        <p className="app-subtitle">
          {profile
            ? soft
              ? `你好，${profile.display_name}`
              : `欢迎回来，${profile.display_name}`
            : soft
              ? '柔软注意力花园'
              : '注意力小岛'}
        </p>
      </header>

      <nav className="app-nav" aria-label="主导航">
        {links.map((link) => {
          const SoftIcon = SOFT_NAV_ICONS[link.softIcon]
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
            >
              {soft ? <SoftIcon size={18} /> : <Icon name={link.islandIcon} size={18} />}
              <span>{soft ? link.softLabel : link.label}</span>
            </NavLink>
          )
        })}
        {profile?.is_developer && (
          <NavLink
            to="/dev-logs"
            className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
          >
            {soft ? (
              <SOFT_NAV_ICONS.logs size={18} />
            ) : (
              <Icon name="icon-helicopter" size={18} />
            )}
            <span>日志</span>
          </NavLink>
        )}
      </nav>

      <main className="app-main" key={location.pathname}>
        <div className={soft ? 'page-enter' : undefined}>
          <Outlet />
        </div>
      </main>

      {soft ? (
        <p className="soft-footer">
          <span className="soft-footer-dot" />
          Soft Garden UI
        </p>
      ) : (
        <Footer type="sea" />
      )}
    </div>
  )

  if (soft) return shell
  return <Cursor>{shell}</Cursor>
}
