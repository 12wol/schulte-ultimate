import { Cursor, Footer } from 'animal-island-ui'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IrisRouteOutlet } from './iris/IrisTransition'
import { PhoneMenu } from './PhoneMenu'

export function AppShell() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  // 远征用库内森林底（tree）；其余页面保持海边（sea）
  const footerType = pathname.startsWith('/rogue') ? 'tree' : 'sea'

  return (
    <Cursor>
      <div className="app-shell">
        <main className="app-main">
          <IrisRouteOutlet />
        </main>

        <Footer type={footerType} />

        <PhoneMenu showDevLogs={Boolean(profile?.is_developer)} />
      </div>
    </Cursor>
  )
}
