import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loading } from 'animal-island-ui'
import { AppShell } from './components/AppShell'
import { useAuth } from './context/AuthContext'
import { DevLogsPage } from './pages/DevLogsPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlayPage } from './pages/PlayPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { TrendsPage } from './pages/TrendsPage'

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
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="trends" element={<TrendsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="dev-logs" element={<DevLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
