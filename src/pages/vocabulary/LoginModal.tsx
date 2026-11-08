import { useEffect, useState, type FormEvent } from 'react'
import { Button, Modal, Stack, TextField } from '@shared/ui'
import { useAuth } from '../../lib/auth/AuthProvider'

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && user) onClose()
  }, [open, user, onClose])

  useEffect(() => {
    if (!open) {
      setError(null)
      setBusy(false)
      setPin('')
    }
  }, [open])

  const onSend = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim().toLowerCase(), pin.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Log in" onClose={onClose}>
      <form onSubmit={(event) => void onSend(event)}>
        <Stack gap="4">
          <p className="auth-sub">Same email and PIN on every device. Your snacks stay in one vault.</p>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="PIN"
            type="password"
            autoComplete="current-password"
            required
            minLength={4}
            value={pin}
            hint="At least 4 characters. A new email creates your vault."
            onChange={(event) => setPin(event.target.value)}
          />
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <Button type="submit" block className="btn-pop" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}
