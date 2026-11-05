import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { googleClientId, requestGoogleProfile } from './googleSignIn'
import {
  consumeLoginCode,
  findAccount,
  hashPassword,
  issueLoginCode,
  readSession,
  sessionFor,
  upsertAccount,
  writeSession,
  type LocalSession,
} from './localAccounts'

export type AuthUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

export type SignupPending = {
  needs_verification: boolean
  email: string
  email_sent: boolean
  message: string
  dev_code?: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  requestLoginCode: (email: string) => Promise<SignupPending>
  verifyLoginCode: (email: string, code: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const signedOutAuth: AuthContextValue = {
  user: null,
  ready: true,
  error: null,
  login: async () => {},
  requestLoginCode: async () => ({
    needs_verification: false,
    email: '',
    email_sent: false,
    message: '',
  }),
  verifyLoginCode: async () => {},
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  clearError: () => {},
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? signedOutAuth
}

function toAuthUser(session: LocalSession): AuthUser {
  return {
    uid: session.uid,
    displayName: session.displayName,
    email: session.email,
    photoURL: null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const session = readSession()
    return session ? toAuthUser(session) : null
  })
  const [error, setError] = useState<string | null>(null)

  const accept = useCallback((session: LocalSession) => {
    writeSession(session)
    setUser(toAuthUser(session))
    setError(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const existing = findAccount(email)
    const passwordHash = await hashPassword(password)
    if (existing?.passwordHash && existing.passwordHash !== passwordHash) {
      throw new Error('Invalid email or password')
    }
    const account = {
      email: email.trim().toLowerCase(),
      passwordHash,
      name: existing?.name ?? '',
    }
    upsertAccount(account)
    accept(sessionFor(account.email, account.name))
  }, [accept])

  const requestLoginCode = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase()
    const code = issueLoginCode(normalized)
    return {
      needs_verification: true,
      email: normalized,
      email_sent: false,
      message: 'This sign-in stays in the browser, so the code is shown here.',
      dev_code: code,
    }
  }, [])

  const verifyLoginCode = useCallback(async (email: string, code: string) => {
    if (!consumeLoginCode(email, code)) throw new Error('Incorrect code')
    const existing = findAccount(email)
    const account = {
      email: email.trim().toLowerCase(),
      passwordHash: existing?.passwordHash ?? null,
      name: existing?.name ?? '',
    }
    upsertAccount(account)
    accept(sessionFor(account.email, account.name))
  }, [accept])

  const signInWithGoogle = useCallback(async () => {
    const clientId = googleClientId()
    if (!clientId) {
      throw new Error('Add VITE_GOOGLE_CLIENT_ID to .env to use Google. Email sign-in works without it.')
    }
    const profile = await requestGoogleProfile(clientId)
    const existing = findAccount(profile.email)
    const account = {
      email: profile.email.trim().toLowerCase(),
      passwordHash: existing?.passwordHash ?? null,
      name: profile.name || existing?.name || '',
    }
    upsertAccount(account)
    accept(sessionFor(account.email, account.name))
  }, [accept])

  const signOutUser = useCallback(async () => {
    writeSession(null)
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      user,
      ready: true,
      error,
      login,
      requestLoginCode,
      verifyLoginCode,
      signInWithGoogle,
      signOutUser,
      clearError,
    }),
    [user, error, login, requestLoginCode, verifyLoginCode, signInWithGoogle, signOutUser, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
