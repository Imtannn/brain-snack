import { useEffect, useState, type FormEvent } from 'react'
import { Button, Modal, Stack, TextField } from '@shared/ui'
import { useAuth, type SignupPending } from '../../lib/auth/AuthProvider'

type Mode = 'password' | 'code'

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, '').slice(0, max)
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21 21-9.3 21-21c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.6 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.3 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 40.6 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.2 45 32 45 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, login, requestLoginCode, verifyLoginCode, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('code')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState<SignupPending | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)

  useEffect(() => {
    if (open && user) onClose()
  }, [open, user, onClose])

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof Error ? err.message : fallback)
  }

  const onPasswordSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setFormBusy(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      fail(err, 'Could not sign in')
    } finally {
      setFormBusy(false)
    }
  }

  const onSendCode = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setFormBusy(true)
    try {
      const result = await requestLoginCode(email.trim())
      setPending(result)
      if (result.dev_code) setCode(result.dev_code)
    } catch (err) {
      fail(err, 'Could not send code')
    } finally {
      setFormBusy(false)
    }
  }

  const onVerifyCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!pending) return
    setError(null)
    setFormBusy(true)
    try {
      await verifyLoginCode(pending.email, code)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid code'
      setError(/incorrect code/i.test(message) ? `${message}. Use the latest code — tap Resend if you requested a new one.` : message)
    } finally {
      setFormBusy(false)
    }
  }

  const onResend = async () => {
    if (!pending) return
    setError(null)
    setResendBusy(true)
    try {
      const result = await requestLoginCode(pending.email)
      setPending(result)
      if (result.dev_code) setCode(result.dev_code)
    } catch (err) {
      fail(err, 'Could not resend code')
    } finally {
      setResendBusy(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setPending(null)
    setCode('')
  }

  return (
    <Modal open={open} title={pending ? 'Enter code' : 'Log in'} onClose={onClose} className="auth-modal">
      {pending ? (
        <form onSubmit={(event) => void onVerifyCode(event)}>
          <Stack gap="4">
            <p className="auth-sub">We prepared a 6-digit code for {pending.email}.</p>
            <p className="auth-sub">{pending.message}</p>
            {pending.dev_code ? (
              <p className="auth-dev-code">Code: <strong>{pending.dev_code}</strong></p>
            ) : null}
            <TextField
              label="Sign-in code"
              controlClassName="auth-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(digitsOnly(event.target.value, 6))}
            />
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <Button type="submit" block className="btn-pop" disabled={formBusy || code.length !== 6}>
              {formBusy ? 'Verifying…' : 'Verify and continue'}
            </Button>
            <p className="auth-switch">
              <button type="button" className="auth-text-btn" disabled={resendBusy} onClick={() => void onResend()}>
                {resendBusy ? 'Sending…' : 'Resend code'}
              </button>
              {' · '}
              <button type="button" className="auth-text-btn" onClick={() => setPending(null)}>
                Use a different email
              </button>
            </p>
          </Stack>
        </form>
      ) : (
        <Stack gap="4">
          <p className="auth-sub">Sign in to keep your snacks on this browser.</p>
          <Button
            type="button"
            block
            className="btn-pop auth-google-btn"
            disabled={googleBusy}
            onClick={() => {
              setError(null)
              setGoogleBusy(true)
              void signInWithGoogle()
                .catch((err: unknown) => fail(err, 'Google sign-in did not finish.'))
                .finally(() => setGoogleBusy(false))
            }}
          >
            <GoogleMark />
            {googleBusy ? 'Redirecting…' : 'Continue with Google'}
          </Button>
          <div className="auth-divider"><span>or continue with email</span></div>
          <form onSubmit={(event) => void (mode === 'password' ? onPasswordSubmit(event) : onSendCode(event))}>
            <Stack gap="4">
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {mode === 'password' ? (
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              ) : null}
              {error ? <p className="auth-error" role="alert">{error}</p> : null}
              <Button type="submit" block variant="quiet" className="btn-pop" disabled={formBusy}>
                {formBusy
                  ? mode === 'password' ? 'Signing in…' : 'Sending…'
                  : mode === 'password' ? 'Log in with password' : 'Send sign-in code'}
              </Button>
              <p className="auth-switch">
                {mode === 'password' ? (
                  <>
                    Prefer a one-time code?{' '}
                    <button type="button" className="auth-text-btn" onClick={() => switchMode('code')}>
                      Email me a code
                    </button>
                  </>
                ) : (
                  <>
                    Have a password?{' '}
                    <button type="button" className="auth-text-btn" onClick={() => switchMode('password')}>
                      Sign in with password
                    </button>
                  </>
                )}
              </p>
            </Stack>
          </form>
        </Stack>
      )}
    </Modal>
  )
}
