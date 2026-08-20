import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card, Loading, Select, Table, Tag, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { AppLog } from '../types'

export function DevLogsPage() {
  const { profile } = useAuth()
  const [level, setLevel] = useState('all')
  const [logs, setLogs] = useState<AppLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.is_developer || !supabase) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      let q = supabase
        .from('app_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (level !== 'all') q = q.eq('level', level)
      const { data, error } = await q
      if (cancelled) return
      if (error) console.error(error)
      setLogs((data ?? []) as AppLog[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.is_developer, level])

  if (!profile?.is_developer) {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="page">
      <Title size="middle" color="app-red">
        开发者木屋 · 日志
      </Title>
      <p className="muted">仅开发者可见。记录登录、存成绩、错误等事件。</p>

      <div className="toolbar">
        <Select
          aria-label="日志级别"
          options={[
            { key: 'all', label: '全部级别' },
            { key: 'info', label: 'info' },
            { key: 'warn', label: 'warn' },
            { key: 'error', label: 'error' },
            { key: 'debug', label: 'debug' },
          ]}
          value={level}
          onChange={setLevel}
        />
      </div>

      <Card>
        {loading ? (
          <div className="center-block">
            <Loading />
            <p>拉取日志…</p>
          </div>
        ) : (
          <Table
            rowKey="id"
            emptyText="暂无日志"
            scroll={{ x: 720 }}
            columns={[
              {
                title: '级别',
                dataIndex: 'level',
                width: 88,
                render: (v) => (
                  <Tag
                    color={
                      v === 'error'
                        ? 'app-red'
                        : v === 'warn'
                          ? 'app-orange'
                          : 'app-blue'
                    }
                  >
                    {String(v)}
                  </Tag>
                ),
              },
              { title: '事件', dataIndex: 'event', width: 160 },
              { title: '说明', dataIndex: 'message' },
              {
                title: '时间',
                dataIndex: 'created_at',
                width: 180,
                render: (v) => new Date(String(v)).toLocaleString(),
              },
            ]}
            dataSource={logs as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>
    </div>
  )
}
