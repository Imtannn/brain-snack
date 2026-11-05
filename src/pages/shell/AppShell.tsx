import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/auth/AuthProvider'
import type { SavedSnack } from '../../lib/snacks/snackRecord'
import { HomeDashboard } from '../home/HomeDashboard'
import { VocabularyPage } from '../vocabulary/VocabularyPage'
import { AuthErrorBanner, TopNav } from './TopNav'

type Screen = 'home' | 'session'

export function AppShell() {
  const { user, ready } = useAuth()
  const [screen, setScreen] = useState<Screen>(() => (user ? 'home' : 'session'))
  const [restudySnack, setRestudySnack] = useState<SavedSnack | null>(null)
  const [sessionKey, setSessionKey] = useState(0)
  const wasSignedIn = useRef(Boolean(user))

  useEffect(() => {
    if (!ready) return
    const signedIn = Boolean(user)
    if (!signedIn) {
      setScreen('session')
      setRestudySnack(null)
    } else if (!wasSignedIn.current) {
      setScreen('home')
      setRestudySnack(null)
    }
    wasSignedIn.current = signedIn
  }, [user, ready])

  function openNewSnack() {
    setRestudySnack(null)
    setSessionKey((key) => key + 1)
    setScreen('session')
  }

  function openRestudy(snack: SavedSnack) {
    setRestudySnack(snack)
    setSessionKey((key) => key + 1)
    setScreen('session')
  }

  function goHome() {
    setRestudySnack(null)
    setScreen('home')
  }

  const showHome = Boolean(user && screen === 'session')

  return (
    <div className="app-shell">
      <TopNav showHome={showHome} onHome={goHome} />
      <AuthErrorBanner />
      <div className="app-shell__body">
        {screen === 'home' && user ? (
          <HomeDashboard onNewSnack={openNewSnack} onRestudy={openRestudy} />
        ) : null}
        {screen === 'session' ? (
          <VocabularyPage
            key={sessionKey}
            restudySnack={restudySnack}
            onHome={user ? goHome : undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
