import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Tag } from 'animal-island-ui'
import { formatDuration } from '../../lib/format'
import './schulte.css'

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

/** 动森风彩色格子（颜色与数字无固定对应，避免泄露顺序） */
const TONE_COUNT = 8

function buildToneMap(numbers: number[]): Record<number, number> {
  const tones = shuffle(numbers.map((_, i) => i % TONE_COUNT))
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
}

type Props = {
  gridSize: number
  onFinished: (result: SchulteResult) => void
}

type Phase = 'idle' | 'running' | 'done'

export function SchulteBoard({ gridSize, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [cells, setCells] = useState<number[]>(() =>
    shuffle(Array.from({ length: gridSize * gridSize }, (_, i) => i + 1)),
  )
  const [toneMap, setToneMap] = useState<Record<number, number>>(() =>
    buildToneMap(Array.from({ length: gridSize * gridSize }, (_, i) => i + 1)),
  )
  const [expect, setExpect] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [flashWrong, setFlashWrong] = useState<number | null>(null)
  const [boardPulse, setBoardPulse] = useState(false)
  const startedAt = useRef<number | null>(null)
  const clicksRef = useRef<SchulteClick[]>([])
  const wrongRef = useRef(0)
  const raf = useRef<number | null>(null)
  const wrongTimer = useRef<number | null>(null)
  const pulseTimer = useRef<number | null>(null)

  const total = gridSize * gridSize

  const clearTimers = () => {
    if (wrongTimer.current != null) window.clearTimeout(wrongTimer.current)
    if (pulseTimer.current != null) window.clearTimeout(pulseTimer.current)
  }

  const resetBoard = useCallback(() => {
    clearTimers()
    const nextCells = shuffle(Array.from({ length: total }, (_, i) => i + 1))
    setCells(nextCells)
    setToneMap(buildToneMap(nextCells))
    setExpect(1)
    setElapsed(0)
    setWrong(0)
    wrongRef.current = 0
    setFlashWrong(null)
    setBoardPulse(false)
    startedAt.current = null
    clicksRef.current = []
    setPhase('idle')
  }, [total])

  useEffect(() => {
    resetBoard()
  }, [gridSize, resetBoard])

  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      if (startedAt.current != null) {
        setElapsed(performance.now() - startedAt.current)
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [phase])

  const start = () => {
    resetBoard()
    startedAt.current = performance.now()
    setPhase('running')
  }

  const onCell = (n: number) => {
    if (phase !== 'running') return

    if (n === expect) {
      const t = Math.round(performance.now() - (startedAt.current ?? performance.now()))
      clicksRef.current = [...clicksRef.current, { n, t }]
      if (n === total) {
        setElapsed(t)
        setPhase('done')
        onFinished({
          durationMs: t,
          gridSize,
          wrongClicks: wrongRef.current,
          clicks: clicksRef.current,
        })
        return
      }
      setExpect(n + 1)
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
  }

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }),
    [gridSize],
  )

  return (
    <div className="schulte-wrap">
      <div className="schulte-hud">
        <Tag color="app-blue" size="large">
          下一个：{phase === 'done' ? '完成' : expect}
        </Tag>
        <Tag color="app-green" size="large">
          {formatDuration(Math.round(elapsed))}
        </Tag>
        <Tag color="app-orange" size="large">
          误点 {wrong}
        </Tag>
      </div>

      <div
        className={['schulte-grid', boardPulse ? 'is-pulse-bad' : ''].filter(Boolean).join(' ')}
        style={gridStyle}
      >
        {cells.map((n) => (
          <button
            key={`${gridSize}-${n}`}
            type="button"
            data-tone={toneMap[n] ?? 0}
            className={[
              'schulte-cell',
              phase === 'idle' ? 'is-idle' : '',
              flashWrong === n ? 'is-wrong' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onCell(n)}
            disabled={phase === 'done'}
          >
            {n}
          </button>
        ))}
      </div>

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
    </div>
  )
}
