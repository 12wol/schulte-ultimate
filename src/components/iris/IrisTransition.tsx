import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DevLogsPage } from '../../pages/DevLogsPage'
import { HistoryPage } from '../../pages/HistoryPage'
import { HomePage } from '../../pages/HomePage'
import { LeaderboardPage } from '../../pages/LeaderboardPage'
import { PlayPage } from '../../pages/PlayPage'
import { SettingsPage } from '../../pages/SettingsPage'
import { TodayPage } from '../../pages/TodayPage'
import { TrendsPage } from '../../pages/TrendsPage'
import './IrisWipe.css'

type IrisPhase = 'idle' | 'closing' | 'opening'

type IrisApi = {
  /** CTA：先收到小洞，执行动作，再往四周扩散 */
  expandThrough: (action?: () => void) => Promise<void>
  /** 通用切换：收缩 → 动作 → 扩散 */
  wipeThrough: (action?: () => void) => Promise<void>
}

const IrisContext = createContext<IrisApi | null>(null)

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function samePlace(
  a: { pathname: string; search: string; hash: string },
  b: { pathname: string; search: string; hash: string },
) {
  return a.pathname === b.pathname && a.search === b.search && a.hash === b.hash
}

function IrisOverlay({
  phase,
  onVeilEnd,
}: {
  phase: IrisPhase
  onVeilEnd: (phase: IrisPhase) => void
}) {
  const veilRef = useRef<HTMLDivElement>(null)

  if (phase === 'idle') return null

  return (
    <div className={`iris-wipe is-live is-${phase}`} aria-hidden>
      <div
        key={phase}
        ref={veilRef}
        className="iris-wipe__veil"
        onAnimationEnd={(e) => {
          if (e.target !== veilRef.current) return
          onVeilEnd(phase)
        }}
      />
      <div key={`${phase}-ring`} className="iris-wipe__ring" />
    </div>
  )
}

export function useIris() {
  const api = useContext(IrisContext)
  if (!api) {
    return {
      expandThrough: async (action?: () => void) => {
        action?.()
      },
      wipeThrough: async (action?: () => void) => {
        action?.()
      },
    } satisfies IrisApi
  }
  return api
}

export function IrisTransitionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<IrisPhase>('idle')
  const busyRef = useRef(false)
  const chainRef = useRef(Promise.resolve())
  const phaseWaitersRef = useRef<Array<(ended: IrisPhase) => void>>([])

  const onVeilEnd = useCallback((ended: IrisPhase) => {
    const waiters = phaseWaitersRef.current
    phaseWaitersRef.current = []
    waiters.forEach((w) => w(ended))
  }, [])

  const waitPhase = useCallback(() => {
    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }
      const timer = window.setTimeout(finish, 900)
      phaseWaitersRef.current.push(() => {
        window.clearTimeout(timer)
        finish()
      })
    })
  }, [])

  const runClose = useCallback(async () => {
    if (prefersReducedMotion()) return
    setPhase('closing')
    await waitPhase()
  }, [waitPhase])

  const runOpen = useCallback(async () => {
    if (prefersReducedMotion()) {
      setPhase('idle')
      return
    }
    setPhase('opening')
    await waitPhase()
    setPhase('idle')
  }, [waitPhase])

  const enqueue = useCallback((task: () => Promise<void>) => {
    chainRef.current = chainRef.current.then(task).catch(() => undefined)
    return chainRef.current
  }, [])

  const wipeThrough = useCallback(
    (action?: () => void) =>
      enqueue(async () => {
        busyRef.current = true
        try {
          await runClose()
          action?.()
          await runOpen()
        } finally {
          busyRef.current = false
        }
      }),
    [enqueue, runClose, runOpen],
  )

  const expandThrough = useCallback(
    (action?: () => void) =>
      enqueue(async () => {
        busyRef.current = true
        try {
          // 与 wipe 同节奏：收缩到洞口后换内容，再扩散展开（CTA 体感落在扩散段）
          await runClose()
          action?.()
          await runOpen()
        } finally {
          busyRef.current = false
        }
      }),
    [enqueue, runClose, runOpen],
  )

  const api = useMemo(
    () => ({
      expandThrough,
      wipeThrough,
    }),
    [expandThrough, wipeThrough],
  )

  return (
    <IrisContext.Provider value={api}>
      {children}
      <IrisOverlay phase={phase} onVeilEnd={onVeilEnd} />
    </IrisContext.Provider>
  )
}

/** 路由切换：四周收缩到中心小洞 → 换页 → 从小洞往四周扩散 */
export function IrisRouteOutlet() {
  const location = useLocation()
  const { wipeThrough } = useIris()
  const [displayLocation, setDisplayLocation] = useState(location)
  const displayRef = useRef(displayLocation)
  const runningRef = useRef(false)
  const pendingRef = useRef(location)

  useEffect(() => {
    displayRef.current = displayLocation
  }, [displayLocation])

  useEffect(() => {
    if (samePlace(location, displayRef.current)) return
    pendingRef.current = location

    if (runningRef.current) return

    const run = async () => {
      runningRef.current = true
      try {
        while (!samePlace(pendingRef.current, displayRef.current)) {
          const target = pendingRef.current
          await wipeThrough(() => {
            setDisplayLocation(target)
            displayRef.current = target
          })
        }
      } finally {
        runningRef.current = false
      }
    }

    void run()
  }, [location, wipeThrough])

  return (
    <Routes location={displayLocation}>
      <Route path="/" element={<HomePage />} />
      <Route path="/play" element={<PlayPage />} />
      <Route path="/today" element={<TodayPage />} />
      <Route path="/trends" element={<TrendsPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/dev-logs" element={<DevLogsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
