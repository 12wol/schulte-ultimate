import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Card, Divider, Input, Loading, Notification, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { ready, configured, user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  if (!ready) {
    return (
      <div className="center-block">
        <Loading />
        <p>正在唤醒小岛…</p>
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />

  if (!configured) {
    return (
      <div className="auth-page">
        <Title size="large" color="app-orange">
          先接通小岛数据库
        </Title>
        <Card color="app-yellow">
          <p>
            复制 <code>.env.example</code> 为 <code>.env.local</code>，填入 Supabase 的 URL 与 anon
            key，然后在 SQL Editor 依次执行 <code>001_init.sql</code> 与{' '}
            <code>002_username_login.sql</code>。
          </p>
          <p className="muted">并关闭 Authentication → Email → Confirm email。</p>
        </Card>
      </div>
    )
  }

  const submit = async () => {
    if (!username.trim() || !password) {
      setHint('请填写用户名和密码')
      Notification.warning('请填写用户名和密码')
      return
    }
    if (password.length < 6) {
      setHint('密码至少 6 位')
      Notification.warning('密码至少 6 位')
      return
    }
    setBusy(true)
    setHint(null)
    const err =
      mode === 'in'
        ? await signIn(username, password)
        : await signUp(username, password)
    setBusy(false)

    if (err === 'NEED_EMAIL_CONFIRM') {
      const msg =
        '账号可能已创建，但仍要求邮箱验证。请到 Supabase → Authentication → Providers → Email，关闭 Confirm email 后，用同一用户名密码登录。'
      setHint(msg)
      Notification.warning(msg)
      setMode('in')
      return
    }

    if (err) {
      setHint(err)
      Notification.error(err)
      return
    }
    setHint(mode === 'in' ? '登录成功，正在进入小岛…' : '注册成功，正在进入小岛…')
    Notification.success(mode === 'in' ? '欢迎回岛！' : '注册成功，可以开始测试啦')
  }

  return (
    <div className="auth-page">
      <Title size="large" color="app-green">
        舒马特测试终极无敌版
      </Title>
      <p className="app-subtitle">用户名登录 · 好友排行榜 · 不需要邮箱</p>

      <Card color="app-green" pattern="app-green">
        <div className="auth-form">
          <Input
            size="large"
            placeholder="用户名（3～20 位英文字母/数字/下划线）"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            allowClear
          />
          <Input
            size="large"
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="primary" size="large" block loading={busy} onClick={() => void submit()}>
            {mode === 'in' ? '登录上岛' : '注册开岛'}
          </Button>
          {hint && (
            <Card color="app-yellow">
              <p className="auth-hint">{hint}</p>
            </Card>
          )}
          <Divider type="wave-yellow" />
          <Button
            type="text"
            block
            onClick={() => {
              setHint(null)
              setMode((m) => (m === 'in' ? 'up' : 'in'))
            }}
          >
            {mode === 'in' ? '还没有账号？去注册' : '已有账号？去登录'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
