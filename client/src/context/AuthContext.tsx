import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/format'
import type { Currency, Theme, User } from '../lib/types'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User) => void
  /** Increments whenever data changes, so pages re-fetch. */
  version: number
  bump: () => void
  money: (n: number, opts?: { compact?: boolean }) => string
  currency: Currency
}

const Ctx = createContext<AuthValue | null>(null)
export const useAuth = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    api
      .get<{ user: User }>('/auth/me')
      .then((r) => setUserState(r.user))
      .catch(() => setUserState(null))
      .finally(() => setLoading(false))
  }, [])

  // Session expired mid-use: send the person back to login.
  useEffect(() => {
    const h = () => setUserState(null)
    window.addEventListener('sw:unauthorized', h)
    return () => window.removeEventListener('sw:unauthorized', h)
  }, [])

  const theme: Theme = user?.theme ?? 'light'
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => applyTheme('system')
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [theme])

  const login = useCallback(async (email: string, password: string) => {
    setUserState((await api.post<{ user: User }>('/auth/login', { email, password })).user)
  }, [])
  const register = useCallback(async (name: string, email: string, password: string) => {
    setUserState((await api.post<{ user: User }>('/auth/register', { name, email, password })).user)
  }, [])
  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined)
    setUserState(null)
  }, [])
  const bump = useCallback(() => setVersion((v) => v + 1), [])
  const currency: Currency = user?.currency ?? 'INR'
  const money = useCallback((n: number, opts?: { compact?: boolean }) => formatMoney(n, currency, opts), [currency])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser: setUserState as (u: User) => void, version, bump, money, currency }), [user, loading, login, register, logout, version, bump, money, currency])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
