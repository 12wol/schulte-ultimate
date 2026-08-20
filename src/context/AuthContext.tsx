import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { writeLog } from '../lib/logger'
import {
  normalizeUsername,
  usernameToAuthEmail,
  validateUsername,
} from '../lib/username'
import type { Profile } from '../types'

type AuthContextValue = {
  ready: boolean
  configured: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  refreshProfile: () => Promise<void>
  signIn: (username: string, password: string) => Promise<string | null>
  signUp: (username: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  updateProfile: (
    patch: Partial<Pick<Profile, 'display_name' | 'preferred_grid_size'>>,
  ) => Promise<string | null>
  unlockDeveloper: (passcode: string) => Promise<boolean>
  lockDeveloper: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
    return [
      '邮箱发送次数超限（Confirm email 仍会触发发信）。',
      '请立刻：Supabase → Authentication → Providers → Email → 关闭 Confirm email。',
      '然后等待约 30～60 分钟再注册；或换一个从未注册过的用户名稍后再试。',
    ].join('')
  }
  if (m.includes('invalid login')) return '用户名或密码不对'
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return '这个用户名已被占用'
  }
  if (m.includes('password')) return '密码不符合要求（至少 6 位）'
  return message
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error(error)
    return null
  }
  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    const next = await fetchProfile(session.user.id)
    setProfile(next)
  }, [session?.user])

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const signIn = useCallback(async (username: string, password: string) => {
    if (!supabase) return '尚未配置 Supabase'
    const invalid = validateUsername(username)
    if (invalid) return invalid

    const email = usernameToAuthEmail(username)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      await writeLog('warn', 'auth.sign_in_failed', error.message, {
        username: normalizeUsername(username),
      })
      return translateAuthError(error.message)
    }
    await writeLog('info', 'auth.sign_in', '登录成功', {
      username: normalizeUsername(username),
    })
    return null
  }, [])

  const signUp = useCallback(async (username: string, password: string) => {
    if (!supabase) return '尚未配置 Supabase'
    const invalid = validateUsername(username)
    if (invalid) return invalid
    if (password.length < 6) return '密码至少 6 位'

    const normalized = normalizeUsername(username)

    const { data: available, error: checkErr } = await supabase.rpc(
      'is_username_available',
      { p_username: normalized },
    )
    if (checkErr) {
      const missingFn = /could not find the function/i.test(checkErr.message)
      if (!missingFn) {
        return `无法检查用户名：${checkErr.message}`
      }
      // 函数尚未创建时先跳过检查，靠假邮箱唯一性兜底；请尽快执行 002 SQL
    } else if (available === false) {
      return '这个用户名已被占用'
    }

    const email = usernameToAuthEmail(normalized)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalized,
          display_name: normalized,
        },
      },
    })
    if (error) {
      await writeLog('warn', 'auth.sign_up_failed', error.message, { username: normalized })
      return translateAuthError(error.message)
    }
    await writeLog('info', 'auth.sign_up', '注册成功', { username: normalized })

    if (!data.session) {
      return 'NEED_EMAIL_CONFIRM'
    }
    return null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await writeLog('info', 'auth.sign_out', '退出登录', {}, session?.user.id)
    await supabase.auth.signOut()
    setProfile(null)
  }, [session?.user.id])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, 'display_name' | 'preferred_grid_size'>>) => {
      if (!supabase || !session?.user) return '未登录'
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', session.user.id)
      if (error) return error.message
      await refreshProfile()
      await writeLog('info', 'profile.update', '更新资料', patch, session.user.id)
      return null
    },
    [refreshProfile, session?.user],
  )

  const unlockDeveloper = useCallback(
    async (passcode: string) => {
      if (!supabase) return false
      const { data, error } = await supabase.rpc('unlock_developer', { passcode })
      if (error) {
        await writeLog('error', 'dev.unlock_failed', error.message, {}, session?.user.id)
        return false
      }
      await refreshProfile()
      if (data === true) {
        await writeLog('info', 'dev.unlock', '开发者木屋已解锁', {}, session?.user.id)
      }
      return data === true
    },
    [refreshProfile, session?.user.id],
  )

  const lockDeveloper = useCallback(async () => {
    if (!supabase) return
    await supabase.rpc('lock_developer')
    await refreshProfile()
  }, [refreshProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      updateProfile,
      unlockDeveloper,
      lockDeveloper,
    }),
    [
      ready,
      session,
      profile,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      updateProfile,
      unlockDeveloper,
      lockDeveloper,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
