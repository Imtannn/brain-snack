import { useState } from 'react'
import { Button, Stack } from '@shared/ui'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import type { SavedSnack } from '../../lib/snacks/snackRecord'
import { SavedSnacks } from '../vocabulary/SavedSnacks'
import { SettingsModal } from '../vocabulary/SettingsModal'

export function HomeDashboard({
  onNewSnack,
  onRestudy,
}: {
  onNewSnack: () => void
  onRestudy: (snack: SavedSnack) => void
}) {
  const { user } = useAuth()
  const { key: geminiKey, setKey } = useGeminiKey()
  const [settingsOpen, setSettingsOpen] = useState(false)
  if (!user) return null

  const greeting = user.displayName || user.email || 'there'

  return (
    <div className="home-dash vocab-wrap">
      <header className="home-dash__hero">
        <p className="ds-eyebrow">Signed in</p>
        <h1 className="ds-title">Welcome back, {greeting}</h1>
        <p className="ds-subtitle">Pick a saved snack or start a new one.</p>
      </header>

      <section className="home-dash__status" aria-label="Brainy">
        {geminiKey ? (
          <p className="home-dash__note is-ready">Brainy is ready — our AI agent for lists, quizzes, and tutoring.</p>
        ) : (
          <Stack gap="3">
            <p className="home-dash__note">Add a Brainy key to unlock our AI agent for lists, quizzes, and tutoring.</p>
            <Button size="sm" variant="quiet" className="btn-pop" onClick={() => setSettingsOpen(true)}>
              Open settings
            </Button>
          </Stack>
        )}
      </section>

      <div className="home-dash__cta">
        <Button size="lg" className="btn-pop" onClick={onNewSnack}>
          New snack
        </Button>
      </div>

      <SavedSnacks uid={user.uid} onRestudy={onRestudy} />

      <SettingsModal
        open={settingsOpen}
        initialKey={geminiKey}
        onClose={() => setSettingsOpen(false)}
        onSave={setKey}
      />
    </div>
  )
}
