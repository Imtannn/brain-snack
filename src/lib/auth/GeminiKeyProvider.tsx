import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearGeminiKey, readGeminiKey, writeGeminiKey } from './geminiKey'
import { useAuth } from './AuthProvider'

type GeminiKeyContextValue = {
  key: string
  setKey: (value: string) => void
}

const GeminiKeyContext = createContext<GeminiKeyContextValue | null>(null)

const emptyKey: GeminiKeyContextValue = {
  key: '',
  setKey: () => {},
}

export function useGeminiKey(): GeminiKeyContextValue {
  return useContext(GeminiKeyContext) ?? emptyKey
}

export function GeminiKeyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [key, setKeyState] = useState(() => (user?.uid ? readGeminiKey(user.uid) : ''))

  useEffect(() => {
    setKeyState(uid ? readGeminiKey(uid) : '')
  }, [uid])

  const setKey = useCallback(
    (value: string) => {
      if (!uid) return
      const trimmed = value.trim()
      if (trimmed) writeGeminiKey(uid, trimmed)
      else clearGeminiKey(uid)
      setKeyState(trimmed)
    },
    [uid],
  )

  const value = useMemo(() => ({ key, setKey }), [key, setKey])
  return <GeminiKeyContext.Provider value={value}>{children}</GeminiKeyContext.Provider>
}
