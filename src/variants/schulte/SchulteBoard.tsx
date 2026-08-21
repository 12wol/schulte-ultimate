import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Tag } from 'animal-island-ui'
import { useIris } from '../../components/iris/IrisTransition'
import { formatDuration } from '../../lib/format'
import type { RogueModifiers } from '../schulte-rogue/types'
import './schulte.css'

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const TONE_COUNT = 8
const LOUD_TONE_COUNT = 12

function buildToneMap(numbers: number[], toneCount: number): Record<number, number> {
  const tones = shuffle(numbers.map((_, i) => i % toneCount))
  const map: Record<number, number> = {}
  numbers.forEach((n, i) => {
    map[n] = tones[i] ?? 0
  })
  return map
}

export type SchulteClick = {
  n: number
  t: number
}

export type SchulteResult = {
  durationMs: number
  gridSize: number
  wrongClicks: number
  clicks: SchulteClick[]
  timedOut?: boolean
}

export type SchulteBoardMode = 'classic' | 'rogue'

type Props = {
  gridSize: number
  onFinished: (result: SchulteResult) => void
  /** 经典 / 远征 */
  mode?: SchulteBoardMode
  modifiers?: Partial<RogueModifiers>
  /** 层时限（毫秒）；仅 rogue */
  timeLimitMs?: number | null
  /** 点错回调（远征扣专注）；返回是否允许继续（false 则停手） */
  onWrongClick?: () => boolean
  /** 超时回调 */
  onTimeout?: () => void
  /** 远征：挂载后自动开打，隐藏经典开始按钮 */
  autoStart?: boolean
}

type Phase = 'idle' | 'running' | 'done'

/**
 * 舒尔特棋盘。经典模式保持原交互；远征模式可注入修饰器与时限。
 */
export function SchulteBoard({
  gridSize,
  onFinished,
  mode = 'classic',
  modifiers,
  timeLimitMs = null,
  onWrongClick,
  onTimeout,
  autoStart = false,
}: Props) {
  const { expandThrough } = useIris()
  const reverse = Boolean(modifiers?.reverse)
  const hintNext = Boolean(modifiers?.hintNext)
  const fog = Boolean(modifiers?.fog)
  const loudColors = Boolean(modifiers?.loudColors)
  const reshuffleEvery = modifiers?.reshuffleEvery ?? null
  const vanishCleared = Boolean(modifiers?.vanishCleared)
  const autoClearCount = Math.max(0, modifiers?.autoClearCount ?? 0)
  const toneCount = loudColors ? LOUD_TONE_COUNT : TONE_COUNT

  const total = gridSize * gridSize
  const firstExpect = reverse ? total : 1

  const [phase, setPhase] = useState<Phase>('idle')
  const [cells, setCells] = useState<number[]>(() =>
    shuffle(Array.from({ length: total }, (_, i) => i + 1)),
  )
  const [toneMap, setToneMap] = useState<Record<number, number>>(() =>
    buildToneMap(
      Array.from({ length: total }, (_, i) => i + 1),
      toneCount,
    ),
  )
  const [expect, setExpect] = useState(firstExpect)
  const [elapsed, setElapsed] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [flashWrong, setFlashWrong] = useState<number | null>(null)
  const [boardPulse, setBoardPulse] = useState(false)
  const [cleared, setCleared] = useState<Set<number>>(() => new Set())
  const [autoCleared, setAutoCleared] = useState<Set<number>>(() => new Set())

  const startedAt = useRef<number | null>(null)
  const clicksRef = useRef<SchulteClick[]>([])
  const wrongRef = useRef(0)
  const correctStreak = useRef(0)
  const timedOutRef = useRef(false)
  const raf = useRef<number | null>(null)
  const wrongTimer = useRef<number | null>(null)
  const pulseTimer = useRef<number | null>(null)
  const onFinishedRef = useRef(onFinished)
  const onTimeoutRef = useRef(onTimeout)
  onFinishedRef.current = onFinished
  onTimeoutRef.current = onTimeout

  const clearTimers = () => {
    if (wrongTimer.current != null) window.clearTimeout(wrongTimer.current)
    if (pulseTimer.current != null) window.clearTimeout(pulseTimer.current)
  }

  const resetBoard = useCallback(() => {
    clearTimers()
    const nextCells = shuffle(Array.from({ length: total }, (_, i) => i + 1))
    setCells(nextCells)
    setToneMap(buildToneMap(nextCells, toneCount))
    setExpect(reverse ? total : 1)
    setElapsed(0)
    setWrong(0)
    wrongRef.current = 0
    correctStreak.current = 0
    timedOutRef.current = false
    setFlashWrong(null)
    setBoardPulse(false)
    setCleared(new Set())
    setAutoCleared(new Set())
    startedAt.current = null
    clicksRef.current = []
    setPhase('idle')
  }, [total, reverse, toneCount])

  useEffect(() => {
    resetBoard()
  }, [gridSize, resetBoard])

  const beginRun = useCallback(() => {
    clearTimers()
    const nextCells = shuffle(Array.from({ length: total }, (_, i) => i + 1))
    setCells(nextCells)
    setToneMap(buildToneMap(nextCells, toneCount))
    setElapsed(0)
    setWrong(0)
    wrongRef.current = 0
    correctStreak.current = 0
    timedOutRef.current = false
    setFlashWrong(null)
    setBoardPulse(false)
    clicksRef.current = []

    const pre = new Set<number>()
    let nextExpect = reverse ? total : 1
    const autoN = Math.min(autoClearCount, Math.max(0, total - 1))
    for (let i = 0; i < autoN; i += 1) {
      pre.add(nextExpect)
      nextExpect = reverse ? nextExpect - 1 : nextExpect + 1
    }
    setAutoCleared(new Set(pre))
    setCleared(new Set(pre))
    setExpect(nextExpect)
    startedAt.current = performance.now()
    setPhase('running')
  }, [total, reverse, toneCount, autoClearCount])

  useEffect(() => {
    if (!autoStart) return
    beginRun()
  }, [autoStart, beginRun])

  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      if (startedAt.current != null) {
        const ms = performance.now() - startedAt.current
        setElapsed(ms)
        if (
          mode === 'rogue' &&
          timeLimitMs != null &&
          timeLimitMs > 0 &&
          ms >= timeLimitMs &&
          !timedOutRef.current
        ) {
          timedOutRef.current = true
          setPhase('done')
          onTimeoutRef.current?.()
          return
        }
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [phase, mode, timeLimitMs])

  const start = () => {
    void expandThrough(() => {
      beginRun()
    })
  }

  const advanceExpect = (current: number) => {
    if (reverse) return current - 1
    return current + 1
  }

  const isCompleteValue = (n: number) => (reverse ? n === 1 : n === total)

  const onCell = (n: number) => {
    if (phase !== 'running') return

    if (n === expect) {
      const t = Math.round(performance.now() - (startedAt.current ?? performance.now()))
      clicksRef.current = [...clicksRef.current, { n, t }]
      setCleared((prev) => new Set(prev).add(n))

      if (isCompleteValue(n)) {
        setElapsed(t)
        setPhase('done')
        onFinishedRef.current({
          durationMs: t,
          gridSize,
          wrongClicks: wrongRef.current,
          clicks: clicksRef.current,
        })
        return
      }

      correctStreak.current += 1
      if (reshuffleEvery && correctStreak.current % reshuffleEvery === 0) {
        setCells((prev) => shuffle([...prev]))
      }

      setExpect(advanceExpect(n))
      return
    }

    wrongRef.current += 1
    setWrong(wrongRef.current)
    setFlashWrong(n)
    setBoardPulse(true)
    if (wrongTimer.current != null) window.clearTimeout(wrongTimer.current)
    if (pulseTimer.current != null) window.clearTimeout(pulseTimer.current)
    wrongTimer.current = window.setTimeout(() => setFlashWrong(null), 380)
    pulseTimer.current = window.setTimeout(() => setBoardPulse(false), 280)

    if (mode === 'rogue' && onWrongClick) {
      const keepGoing = onWrongClick()
      if (!keepGoing) {
        setPhase('done')
      }
    }
  }

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }),
    [gridSize],
  )

  const remainMs =
    mode === 'rogue' && timeLimitMs != null ? Math.max(0, timeLimitMs - elapsed) : null

  return (
    <div className="schulte-wrap">
      <div className="schulte-hud">
        <Tag color="app-blue" size="large">
          下一个：{phase === 'done' ? '完成' : expect}
        </Tag>
        {remainMs != null ? (
          <Tag color={remainMs < 8000 ? 'app-red' : 'app-green'} size="large">
            剩余 {formatDuration(Math.round(remainMs))}
          </Tag>
        ) : (
          <Tag color="app-green" size="large">
            {formatDuration(Math.round(elapsed))}
          </Tag>
        )}
        <Tag color="app-orange" size="large">
          误点 {wrong}
        </Tag>
      </div>

      <div
        className={[
          'schulte-grid',
          boardPulse ? 'is-pulse-bad' : '',
          fog ? 'is-fog' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={gridStyle}
      >
        {cells.map((n, cellIndex) => {
          const isHint = hintNext && phase === 'running' && n === expect
          // 迷雾下已点过的格也不变亮，避免桌面被「亮块」标进度
          const isFogged = fog && phase === 'running' && n !== expect
          const isVanished =
            cleared.has(n) && (vanishCleared || autoCleared.has(n))
          return (
            <button
              key={`c-${cellIndex}-${n}`}
              type="button"
              data-tone={(toneMap[n] ?? 0) % 8}
              className={[
                'schulte-cell',
                phase === 'idle' ? 'is-idle' : '',
                flashWrong === n ? 'is-wrong' : '',
                isHint ? 'is-hint' : '',
                isFogged ? 'is-fogged' : '',
                isVanished ? 'is-cleared' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onCell(n)}
              disabled={phase === 'done' || isVanished}
            >
              {n}
            </button>
          )
        })}
      </div>

      {mode === 'classic' && (
        <div className="schulte-actions">
          {phase === 'idle' && (
            <Button type="primary" size="large" block onClick={start}>
              开始挑战
            </Button>
          )}
          {phase === 'running' && (
            <Button size="large" block onClick={resetBoard}>
              重新开始
            </Button>
          )}
          {phase === 'done' && (
            <Button type="primary" size="large" block onClick={start}>
              再来一局
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
