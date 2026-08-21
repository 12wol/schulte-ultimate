import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loading } from 'animal-island-ui'
import { AppShell } from './components/AppShell'
import { IrisTransitionProvider } from './components/iris/IrisTransition'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth()

  if (!ready) {
    return (
      <div className="center-block">
        <Loading />
        <p>正在唤醒小岛…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <IrisTransitionProvider>
              <AppShell />
            </IrisTransitionProvider>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
