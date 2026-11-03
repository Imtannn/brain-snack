import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { firebaseConfigured, getFirebaseAuth } from '../firebase/config'

export type AuthUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  configured: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const signedOutAuth: AuthContextValue = {
  user: null,
  ready: true,
  configured: false,
  error: null,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? signedOutAuth
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  }
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled.'
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorized in Firebase Authentication settings.'
  if (code === 'auth/operation-not-allowed') return 'Turn on Google sign-in in the Firebase console.'
  if (code === 'auth/popup-blocked') return 'The browser blocked the Google sign-in popup.'
  if (error instanceof Error && error.message) return error.message
  return 'Google sign-in failed.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = firebaseConfigured()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(!configured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!configured) return
    let unsubscribe = () => {}
    try {
      const auth = getFirebaseAuth()
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser ? toAuthUser(firebaseUser) : null)
        setReady(true)
      })
    } catch (err) {
      setError(authErrorMessage(err))
      setReady(true)
    }
    return unsubscribe
  }, [configured])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    if (!configured) {
      setError('Add the Firebase web config to .env, then restart the dev server.')
      return
    }
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }, [configured])

  const signOutUser = useCallback(async () => {
    setError(null)
    if (!configured) return
    try {
      await signOut(getFirebaseAuth())
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }, [configured])

  const value = useMemo(
    () => ({ user, ready, configured, error, signInWithGoogle, signOutUser }),
    [user, ready, configured, error, signInWithGoogle, signOutUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
