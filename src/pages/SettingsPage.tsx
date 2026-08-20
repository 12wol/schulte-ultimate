import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Input,
  Notification,
  Select,
  Title,
} from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { GRID_SIZE_OPTIONS } from '../variants/registry'

export function SettingsPage() {
  const { profile, updateProfile, signOut, unlockDeveloper, lockDeveloper } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [grid, setGrid] = useState(String(profile?.preferred_grid_size ?? 5))
  const [passcode, setPasscode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(profile?.display_name ?? '')
    setGrid(String(profile?.preferred_grid_size ?? 5))
  }, [profile])

  const save = async () => {
    setBusy(true)
    const err = await updateProfile({
      display_name: name.trim() || '岛民',
      preferred_grid_size: Number(grid),
    })
    setBusy(false)
    if (err) Notification.error(err)
    else Notification.success('设置已保存')
  }

  const unlock = async () => {
    const ok = await unlockDeveloper(passcode)
    if (ok) {
      Notification.success('开发者木屋已解锁')
      setPasscode('')
    } else {
      Notification.error('口令不对')
    }
  }

  return (
    <div className="page">
      <Title size="middle" color="app-blue">
        小岛设置
      </Title>

      <Card color="app-yellow">
        <div className="auth-form">
          <label className="field-label">登录用户名（不可改）</label>
          <Input value={profile?.username ?? ''} disabled />
          <label className="field-label">显示昵称</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} allowClear />
          <label className="field-label">默认网格</label>
          <Select
            aria-label="默认网格"
            options={GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n}×${n}` }))}
            value={grid}
            onChange={setGrid}
          />
          <Button type="primary" block loading={busy} onClick={() => void save()}>
            保存
          </Button>
        </div>
      </Card>

      <Divider type="wave-yellow" />

      <Title size="small" color="app-orange">
        开发者木屋
      </Title>
      <Card>
        {profile?.is_developer ? (
          <div className="auth-form">
            <p>已解锁。导航栏会出现「日志」入口。</p>
            <Button
              danger
              onClick={() => {
                void lockDeveloper().then(() => Notification.info('已锁定开发者权限'))
              }}
            >
              锁定开发者权限
            </Button>
          </div>
        ) : (
          <div className="auth-form">
            <Input
              type="password"
              placeholder="开发者口令"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <Button type="primary" onClick={() => void unlock()}>
              解锁
            </Button>
          </div>
        )}
      </Card>

      <Divider type="dashed-brown" />
      <Button block onClick={() => void signOut()}>
        退出登录
      </Button>
    </div>
  )
}
