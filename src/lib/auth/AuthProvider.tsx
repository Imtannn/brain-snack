import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiLogin, apiLogout, apiMe, type ApiUser } from '../api/client'
import { migrateLocalGeminiKey } from './geminiKey'
import { migrateLocalSnacks } from '../snacks/store'

export type AuthUser = ApiUser

type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  signIn: (email: string, pin: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const signedOutAuth: AuthContextValue = {
  user: null,
  ready: true,
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

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const next = await apiMe()
        if (!active) return
        if (next) {
          await migrate(next)
          if (!active) return
          setUser(next)
        }
      } catch {
        // Guest play still works if the vault is briefly unreachable.
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
  }, [])

  const signOutUser = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, ready, signIn, signOutUser }),
    [user, ready, signIn, signOutUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
