import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Notification, Tag, Title } from 'animal-island-ui'
import { useAuth } from '../context/AuthContext'
import { saveAttempt } from '../lib/attempts'
import { formatDuration } from '../lib/format'
import { SchulteBoard, type SchulteResult } from '../variants/schulte/SchulteBoard'
import {
  ROGUE_LAYERS,
  ROGUE_LEADERBOARD_GRID,
  ROGUE_VARIANT_ID,
  START_FOCUS,
  buildModifiers,
  getRelic,
  hasGamblerDice,
  mergeLayerModifiers,
  npcResultLine,
  rollRelicChoices,
} from '../variants/schulte-rogue/content'
import type { RelicDef, RogueRunResult } from '../variants/schulte-rogue/types'
import '../variants/schulte-rogue/rogue.css'

type Phase = 'hub' | 'battle' | 'pick' | 'retry' | 'result'

function newSeed() {
  return `r${Date.now().toString(36)}`
}

/**
 * 方格远征：8 层肉鸽 Run（时限 + 专注力）。
 */
export function RoguePage() {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('hub')
  const [focus, setFocus] = useState(START_FOCUS)
  const [layerIdx, setLayerIdx] = useState(0)
  const [relics, setRelics] = useState<string[]>([])
  const [offers, setOffers] = useState<RelicDef[]>([])
  const [boardKey, setBoardKey] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [seed, setSeed] = useState(newSeed)
  const [result, setResult] = useState<RogueRunResult | null>(null)
  const [saving, setSaving] = useState(false)

  const focusRef = useRef(focus)
  const wrongRef = useRef(0)
  const relicsRef = useRef(relics)
  const runStartedAtRef = useRef(runStartedAt)
  focusRef.current = focus
  wrongRef.current = totalWrong
  relicsRef.current = relics
  runStartedAtRef.current = runStartedAt

  const layer = ROGUE_LAYERS[layerIdx]!
  const modifiers = useMemo(() => {
    return mergeLayerModifiers(buildModifiers(relics), layer)
  }, [relics, layer])

  const timeLimitMs = useMemo(() => {
    // 地板 8s：稀有增益的时限税（−8/−10）在前几层仍能生效，不被 15s 吃掉
    const sec = Math.max(8, layer.baseTimeSec + modifiers.timerDeltaSec)
    return sec * 1000
  }, [layer.baseTimeSec, modifiers.timerDeltaSec])

  const endRun = useCallback(
    async (won: boolean, layersCleared: number, focusLeft: number) => {
      const durationMs =
        runStartedAtRef.current != null
          ? Math.round(performance.now() - runStartedAtRef.current)
          : 0
      const payload: RogueRunResult = {
        won,
        layersCleared,
        focusLeft,
        totalWrong: wrongRef.current,
        durationMs,
        relics: [...relicsRef.current],
        seed,
      }
      setResult(payload)
      setPhase('result')

      if (!user) return
      setSaving(true)
      const { error } = await saveAttempt({
        variantId: ROGUE_VARIANT_ID,
        gridSize: ROGUE_LEADERBOARD_GRID,
        durationMs: Math.max(durationMs, 1000),
        meta: {
          mode: 'rogue',
          won: payload.won,
          layersCleared: payload.layersCleared,
          focusLeft: payload.focusLeft,
          relics: payload.relics,
          totalWrong: payload.totalWrong,
          seed: payload.seed,
        },
      })
      setSaving(false)
      if (error) {
        Notification.error(
          /variant|enabled|test_variants/i.test(error)
            ? '远征结算未入库：请先在 Supabase 执行 006、007 号 migration'
            : /点击序列|click/i.test(error)
              ? '远征结算未入库：请先在 Supabase 执行 007 号 migration（肉鸽专用入库）'
              : `结算保存失败：${error}`,
        )
        return
      }
      Notification.success('这一趟远征已经记在小岛日记里啦')
    },
    [user, seed],
  )

  const startRun = () => {
    setFocus(START_FOCUS)
    focusRef.current = START_FOCUS
    setLayerIdx(0)
    setRelics([])
    relicsRef.current = []
    setOffers([])
    setTotalWrong(0)
    wrongRef.current = 0
    setResult(null)
    setSeed(newSeed())
    const t0 = performance.now()
    setRunStartedAt(t0)
    runStartedAtRef.current = t0
    setBoardKey((k) => k + 1)
    setPhase('battle')
  }

  const hurtFocus = (amount: number, wrongDelta = 0) => {
    if (wrongDelta) {
      wrongRef.current += wrongDelta
      setTotalWrong(wrongRef.current)
    }
    const next = Math.max(0, focusRef.current - amount)
    focusRef.current = next
    setFocus(next)
    return next
  }

  const onWrongClick = () => {
    const dmg = hasGamblerDice(relicsRef.current) ? 2 : 1
    const left = hurtFocus(dmg, 1)
    if (left <= 0) {
      void endRun(false, layerIdx, 0)
      return false
    }
    return true
  }

  const onTimeout = () => {
    const left = hurtFocus(1)
    if (left <= 0) {
      void endRun(false, layerIdx, 0)
      return
    }
    setPhase('retry')
  }

  const onLayerClear = (_result: SchulteResult) => {
    const cleared = layerIdx + 1
    if (layer.kind === 'boss' || layerIdx >= ROGUE_LAYERS.length - 1) {
      void endRun(true, cleared, focusRef.current)
      return
    }
    const bonus =
      layer.rareWeightBonus + (hasGamblerDice(relicsRef.current) ? 2 : 0)
    const choices = rollRelicChoices(relicsRef.current, bonus, 3)
    if (choices.length === 0) {
      setLayerIdx((i) => i + 1)
      setBoardKey((k) => k + 1)
      setPhase('battle')
      return
    }
    setOffers(choices)
    setPhase('pick')
  }

  const pickRelic = (relic: RelicDef) => {
    const nextRelics = [...relicsRef.current, relic.id]
    relicsRef.current = nextRelics
    setRelics(nextRelics)
    if (relic.focusOnPickup != null) {
      const nextFocus = Math.max(0, focusRef.current + relic.focusOnPickup)
      focusRef.current = nextFocus
      setFocus(nextFocus)
      if (nextFocus <= 0) {
        void endRun(false, layerIdx + 1, 0)
        return
      }
    }
    setLayerIdx((i) => i + 1)
    setBoardKey((k) => k + 1)
    setOffers([])
    setPhase('battle')
  }

  const retryLayer = () => {
    setBoardKey((k) => k + 1)
    setPhase('battle')
  }

  return (
    <div className="page rogue-page">
      <Title size="middle" color="app-green">
        方格远征
      </Title>
      <p className="muted">
        八层山林，时限催着走，专注力是你的命。走完可上远征专榜（最远层 / 通关速度）。
      </p>

      {phase === 'hub' && (
        <Card color="lime-green" pattern="lime-green">
          <div className="rogue-hub">
            <p>
              开局专注 <strong>{START_FOCUS}</strong> 点。超时或点错会掉专注；掉光就结束。
            </p>
            <p className="muted">清关后三选一遗物，规则会被一点点改写哦。</p>
            <Button type="primary" size="large" block onClick={startRun}>
              出发远征
            </Button>
            <Link to="/leaderboard?board=rogue" className="rogue-back">
              <Button block>看远征排行榜</Button>
            </Link>
            <Link to="/play" className="rogue-back">
              <Button block>回经典方格</Button>
            </Link>
          </div>
        </Card>
      )}

      {(phase === 'battle' || phase === 'retry' || phase === 'pick') && (
        <div className="rogue-status">
          <Tag color="app-red" size="large">
            专注 {'♥'.repeat(Math.max(0, focus))}
            {focus === 0 ? '（见底）' : ''}
          </Tag>
          <Tag color="brown" size="large">
            第 {layer.index}/8 · {layer.label}
          </Tag>
          <Tag
            color={layer.kind === 'normal' ? 'app-green' : 'app-orange'}
            size="large"
          >
            {layer.kind === 'boss' ? 'Boss' : layer.kind === 'elite' ? '精英' : '普通'}
          </Tag>
        </div>
      )}

      {phase === 'battle' && (
        <Card color="app-green" pattern="app-green">
          {layer.hint && <p className="rogue-relic-line muted">{layer.hint}</p>}
          {relics.length > 0 && (
            <p className="rogue-relic-line muted">
              行囊：{relics.map((id) => getRelic(id)?.name ?? id).join('、')}
            </p>
          )}
          <SchulteBoard
            key={boardKey}
            mode="rogue"
            gridSize={layer.gridSize}
            modifiers={modifiers}
            timeLimitMs={timeLimitMs}
            autoStart
            onWrongClick={onWrongClick}
            onTimeout={onTimeout}
            onFinished={onLayerClear}
          />
        </Card>
      )}

      {phase === 'retry' && (
        <Card color="app-orange" pattern="app-orange">
          <div className="rogue-hub">
            <Title size="small" color="app-orange">
              沙漏见底啦
            </Title>
            <p>专注 −1，还剩 {focus} 点。要不要再闯一次本层？</p>
            <Button type="primary" size="large" block onClick={retryLayer}>
              再试本层
            </Button>
            <Button block onClick={() => void endRun(false, layerIdx, focusRef.current)}>
              先回营地结算
            </Button>
          </div>
        </Card>
      )}

      {phase === 'pick' && (
        <Card color="yellow-green" pattern="yellow-green">
          <Title size="small" color="app-green">
            路边三件宝贝，挑一个吧
          </Title>
          <div className="rogue-offers">
            {offers.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`rogue-offer rarity-${r.rarity} kind-${r.kind}`}
                onClick={() => pickRelic(r)}
              >
                <strong>{r.name}</strong>
                <span className="rogue-offer__rarity">
                  {r.kind === 'buff' ? '增益' : r.kind === 'debuff' ? '减益' : '险注'}
                  {' · '}
                  {r.rarity === 'common' ? '普通' : r.rarity === 'rare' ? '稀有' : '史诗'}
                </span>
                <span className="rogue-offer__desc">{r.description}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {phase === 'result' && result && (
        <Card
          color={result.won ? 'app-green' : 'brown'}
          pattern={result.won ? 'app-green' : 'brown'}
        >
          <div className="rogue-hub">
            <Title size="small" color={result.won ? 'app-green' : 'app-orange'}>
              {result.won ? '通关！' : '远征结束'}
            </Title>
            <p>{npcResultLine(result.won, result.layersCleared)}</p>
            <ul className="rogue-result-list">
              <li>
                {result.won
                  ? `通关：清关 ${result.layersCleared} 层`
                  : result.layersCleared <= 0
                    ? '清关 0 层（倒下在第 1 层）'
                    : `清关 ${result.layersCleared} 层（倒下在第 ${Math.min(result.layersCleared + 1, 8)} 层）`}
              </li>
              <li>总用时：{formatDuration(result.durationMs)}</li>
              <li>误点：{result.totalWrong}</li>
              <li>剩余专注：{result.focusLeft}</li>
              <li>
                遗物：
                {result.relics.length
                  ? result.relics.map((id) => getRelic(id)?.name ?? id).join('、')
                  : '无'}
              </li>
            </ul>
            {saving && <p className="muted">正在写入小岛日记…</p>}
            <Button type="primary" size="large" block onClick={startRun}>
              再走一趟
            </Button>
            <Link to="/leaderboard?board=rogue" className="rogue-back">
              <Button block>看远征排行榜</Button>
            </Link>
            <Link to="/" className="rogue-back">
              <Button block>回小岛</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
