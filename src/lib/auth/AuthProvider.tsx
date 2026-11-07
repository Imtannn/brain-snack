import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiHealth, apiLogin, apiLogout, apiMe, type ApiUser } from '../api/client'
import { migrateLocalGeminiKey } from './geminiKey'
import { migrateLocalSnacks } from '../snacks/store'

export type AuthUser = ApiUser

type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  error: string | null
  vaultReady: boolean
  signIn: (email: string, pin: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const signedOutAuth: AuthContextValue = {
  user: null,
  ready: true,
  error: null,
  vaultReady: false,
  signIn: async () => {},
  signOutUser: async () => {},
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? signedOutAuth
}

async function migrate(user: AuthUser) {
  const email = user.email ?? ''
  if (!email) return
  await migrateLocalSnacks(user.uid, email)
  await migrateLocalGeminiKey(user.uid, email)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vaultReady, setVaultReady] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const health = await apiHealth()
      if (!active) return
      setVaultReady(health.ok)
      if (!health.ok) {
        setReady(true)
        return
      }
      try {
        const next = await apiMe()
        if (!active) return
        if (next) {
          await migrate(next)
          if (!active) return
          setUser(next)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not restore your session.')
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (email: string, pin: string) => {
    const next = await apiLogin(email, pin)
    await migrate(next)
    setUser(next)
    setVaultReady(true)
    setError(null)
  }, [])

  const signOutUser = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
      setError(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, ready, error, vaultReady, signIn, signOutUser }),
    [user, ready, error, vaultReady, signIn, signOutUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
