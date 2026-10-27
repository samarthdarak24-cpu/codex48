import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, setSession, SESSION_EXPIRED_EVENT, type Session } from '@/services/api'
import type { Role, User } from '@/lib/types'

const STORAGE_KEY = 'precedent.session'

interface AuthState {
  user: User | null
  status: 'loading' | 'authenticated' | 'anonymous'
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  hasRole: (role: Role) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthState['status']>('loading')

  // Restore a session on boot, but validate the stored token against the
  // server first. If the account no longer exists (e.g. the database was
  // reseeded) /auth/me returns 401 and we drop the session instead of showing
  // a stale dashboard whose actions all fail with "User not found".
  useEffect(() => {
    let cancelled = false
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setStatus('anonymous')
      return
    }
    let parsed: Session | null = null
    try {
      parsed = JSON.parse(raw) as Session
    } catch {
      parsed = null
    }
    if (!parsed?.token || !parsed?.user?.id) {
      sessionStorage.removeItem(STORAGE_KEY)
      setStatus('anonymous')
      return
    }
    setSession(parsed)
    authApi
      .me()
      .then((fresh) => {
        if (cancelled) return
        setSession({ token: parsed!.token, user: fresh })
        setUser(fresh)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setSession(null)
        sessionStorage.removeItem(STORAGE_KEY)
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Any request that gets a 401 clears the session and emits this event; drop
  // the in-memory user so the route guards redirect to /login.
  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      setStatus('anonymous')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      login,
      logout,
      hasRole: (role: Role) => user?.role === role,
    }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
