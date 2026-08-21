import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Card, Notification, Select, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { saveAttempt } from '../lib/attempts'
import { writeLog } from '../lib/logger'
import { formatDuration } from '../lib/format'
import { GRID_SIZE_OPTIONS, getVariant } from '../variants/registry'
import { SchulteBoard, type SchulteResult } from '../variants/schulte/SchulteBoard'
import { ROGUE_VARIANT_ID } from '../variants/schulte-rogue/content'

export function PlayPage() {
  const { user, profile } = useAuth()
  const [params] = useSearchParams()
  const variantId = params.get('variant') ?? 'schulte'
  const variant = getVariant(variantId)

  const [gridSize, setGridSize] = useState(
    () => profile?.preferred_grid_size ?? 5,
  )
  const [last, setLast] = useState<SchulteResult | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.preferred_grid_size) {
      setGridSize(profile.preferred_grid_size)
    }
  }, [profile?.preferred_grid_size])

  const gridOptions = useMemo(
    () => GRID_SIZE_OPTIONS.map((n) => ({ key: String(n), label: `${n} × ${n}` })),
    [],
  )

  if (variantId === ROGUE_VARIANT_ID || variant?.href === '/rogue') {
    return <Navigate to="/rogue" replace />
  }

  const onFinished = async (result: SchulteResult) => {
    setLast(result)
    if (!user) return
    setSaving(true)
    const { error } = await saveAttempt({
      variantId: 'schulte',
      gridSize: result.gridSize,
      durationMs: result.durationMs,
      meta: { wrongClicks: result.wrongClicks, clicks: result.clicks },
    })
    setSaving(false)
    if (error) {
      Notification.error(`保存失败：${error}`)
      await writeLog('error', 'attempt.save_failed', error, result, user.id)
      return
    }
    Notification.success(`完成！${formatDuration(result.durationMs)} 已入库`)
    await writeLog(
      'info',
      'attempt.saved',
      '测试完成并保存',
      result,
      user.id,
    )
  }

  if (!variant || variant.status !== 'live') {
    return (
      <Card color="app-orange">
        <p>该变体尚未开放，先玩舒尔特方格吧。</p>
      </Card>
    )
  }

  return (
    <div className="page">
      <Title size="middle" color="app-green">
        {variant.name}
      </Title>
      <p className="muted">{variant.description}</p>

      <div className="toolbar">
        <label className="field-label" htmlFor="grid-size">
          网格大小
        </label>
        <Select
          aria-labelledby="grid-size"
          options={gridOptions}
          value={String(gridSize)}
          onChange={(key) => setGridSize(Number(key))}
        />
      </div>

      <Card color="app-blue" pattern="app-blue">
        <SchulteBoard gridSize={gridSize} onFinished={(r) => void onFinished(r)} />
      </Card>

      {last && (
        <Card color="app-yellow">
          <p>
            上一局：{formatDuration(last.durationMs)} · 误点 {last.wrongClicks}
            {saving ? ' · 保存中…' : ''}
          </p>
        </Card>
      )}
    </div>
  )
}
