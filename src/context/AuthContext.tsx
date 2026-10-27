import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, setSession, type Session } from '@/services/api'
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

  // Restore a session on boot. The token is validated server-side in production;
  // here the stored account is re-resolved from the trusted roster.
  useEffect(() => {
    let cancelled = false
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setStatus('anonymous')
      return
    }
    try {
      const parsed = JSON.parse(raw) as Session
      // Role comes from the backend-provided user object, never the payload.
      if (parsed?.user?.id) {
        setSession(parsed)
        setUser(parsed.user)
        setStatus('authenticated')
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
        setStatus('anonymous')
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
      setStatus('anonymous')
    }
    return () => {
      cancelled = true
    }
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
