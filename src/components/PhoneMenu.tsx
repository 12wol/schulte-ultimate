import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from 'animal-island-ui'
import type { IconName } from 'animal-island-ui'
import './phone-menu.css'

type NavApp = {
  to: string
  label: string
  icon: IconName
  color: string
  end?: boolean
}

const APPS: NavApp[] = [
  { to: '/', label: '小岛', icon: 'icon-map', color: '#82D5BB', end: true },
  { to: '/play', label: '方格测试', icon: 'icon-diy', color: '#E59266' },
  { to: '/today', label: '今日', icon: 'icon-miles', color: '#889DF0' },
  { to: '/trends', label: '趋势', icon: 'icon-critterpedia', color: '#F7CD67' },
  { to: '/history', label: '历史', icon: 'icon-camera', color: '#B77DEE' },
  { to: '/leaderboard', label: '排行', icon: 'icon-shopping', color: '#F8A6B2' },
  { to: '/settings', label: '设置', icon: 'icon-design', color: '#8AC68A' },
]

type Props = {
  showDevLogs?: boolean
}

/**
 * 动森 Nook Phone 风格导航：收起为小手机，点开后显示 app 宫格。
 */
export function PhoneMenu({ showDevLogs = false }: Props) {
  const [open, setOpen] = useState(false)
  const [miniPress, setMiniPress] = useState(false)
  const [pressedApp, setPressedApp] = useState<string | null>(null)
  const location = useLocation()
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const pressTimer = useRef<number | null>(null)

  const apps: NavApp[] = showDevLogs
    ? [...APPS, { to: '/dev-logs', label: '日志', icon: 'icon-helicopter', color: '#FC736D' }]
    : APPS

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    closeBtnRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (pressTimer.current != null) window.clearTimeout(pressTimer.current)
    }
  }, [])

  /** 触摸/点击时播一段短抖动，避免 :active 一闪而过看不清 */
  const bump = (key: string | 'mini', ms = 420) => {
    if (pressTimer.current != null) window.clearTimeout(pressTimer.current)
    if (key === 'mini') setMiniPress(true)
    else setPressedApp(key)
    pressTimer.current = window.setTimeout(() => {
      setMiniPress(false)
      setPressedApp(null)
      pressTimer.current = null
    }, ms)
  }

  return (
    <div className={`phone-menu${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`phone-menu__mini${miniPress ? ' is-press' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? '收起菜单' : '打开小岛手机菜单'}
        onPointerDown={() => bump('mini')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="phone-menu__mini-hint" aria-hidden>
          {open ? '收起' : '菜单'}
        </span>
        <span className="phone-menu__mini-bezel" aria-hidden>
          <span className="phone-menu__mini-screen">
            <span className="phone-menu__mini-dot" style={{ background: '#82D5BB' }} />
            <span className="phone-menu__mini-dot" style={{ background: '#E59266' }} />
            <span className="phone-menu__mini-dot" style={{ background: '#889DF0' }} />
            <span className="phone-menu__mini-dot" style={{ background: '#F7CD67' }} />
          </span>
          <span className="phone-menu__mini-home" />
        </span>
      </button>

      {open && (
        <div className="phone-menu__backdrop" aria-hidden onClick={() => setOpen(false)} />
      )}

      <div
        id={panelId}
        className="phone-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-label="小岛手机菜单"
        hidden={!open}
      >
        <div className="phone-menu__device">
          <div className="phone-menu__status">
            <span className="phone-menu__status-time">Nook</span>
            <button
              ref={closeBtnRef}
              type="button"
              className="phone-menu__close"
              aria-label="关闭菜单"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <p className="phone-menu__welcome">欢迎回来！</p>

          <nav className="phone-menu__apps" aria-label="页面应用">
            {apps.map((app, index) => (
              <NavLink
                key={app.to}
                to={app.to}
                end={app.end}
                className={({ isActive }) =>
                  [
                    'phone-menu__app',
                    isActive ? 'is-active' : '',
                    pressedApp === app.to ? 'is-press' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
                style={{
                  ['--app-color' as string]: app.color,
                  ['--app-i' as string]: index,
                }}
                onPointerDown={() => bump(app.to)}
                onClick={() => setOpen(false)}
              >
                <span className="phone-menu__app-tile">
                  <Icon name={app.icon} size="100%" className="phone-menu__app-icon" />
                </span>
                <span className="phone-menu__app-label" role="tooltip">
                  {app.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="phone-menu__page-dot" aria-hidden />
        </div>
      </div>
    </div>
  )
}
