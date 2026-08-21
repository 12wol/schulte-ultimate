import { Cursor, Footer } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { IrisRouteOutlet } from './iris/IrisTransition'
import { PhoneMenu } from './PhoneMenu'

export function AppShell() {
  const { profile } = useAuth()

  return (
    <Cursor>
      <div className="app-shell">
        <main className="app-main">
          <IrisRouteOutlet />
        </main>

        <Footer type="sea" />

        <PhoneMenu showDevLogs={Boolean(profile?.is_developer)} />
      </div>
    </Cursor>
  )
}
