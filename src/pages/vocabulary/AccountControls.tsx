import { useState } from 'react'
import { Button } from '@shared/ui'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import { SettingsModal } from './SettingsModal'

export function AccountControls() {
  const { user, ready, signInWithGoogle, signOutUser } = useAuth()
  const { key, setKey } = useGeminiKey()
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!ready) {
    return <span className="vocab-account__wait">Checking sign-in</span>
  }

  if (!user) {
    return (
      <Button size="sm" variant="quiet" className="btn-pop" onClick={() => void signInWithGoogle()}>
        Log in
      </Button>
    )
  }

  const name = user.displayName || user.email || 'Signed in'

  return (
    <div className="vocab-account">
      <span className="vocab-account__name" title={name}>
        {name}
      </span>
      <Button size="sm" variant="quiet" className="btn-pop" onClick={() => setSettingsOpen(true)}>
        Settings
      </Button>
      <Button size="sm" variant="quiet" className="btn-pop" onClick={() => void signOutUser()}>
        Log out
      </Button>
      <SettingsModal open={settingsOpen} initialKey={key} onClose={() => setSettingsOpen(false)} onSave={setKey} />
    </div>
  )
}

export function AuthError() {
  const { error } = useAuth()
  if (!error) return null
  return <p className="vocab-auth-error" role="alert">{error}</p>
}
