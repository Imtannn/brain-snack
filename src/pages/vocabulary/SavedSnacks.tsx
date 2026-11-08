import { useEffect, useState } from 'react'
import { Button, IconButton, Stack } from '@shared/ui'
import { deleteSnack, listSnacks, snackErrorMessage } from '../../lib/snacks/store'
import type { SavedSnack } from '../../lib/snacks/snackRecord'

export function SavedSnacks({
  uid,
  onRestudy,
}: {
  uid: string
  onRestudy: (snack: SavedSnack) => void
}) {
  const [snacks, setSnacks] = useState<SavedSnack[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load(showLoading: boolean) {
      if (showLoading) setLoading(true)
      try {
        const next = await listSnacks(uid)
        if (!active) return
        setSnacks(next)
        setError('')
      } catch (err: unknown) {
        if (!active) return
        setError(snackErrorMessage(err))
      } finally {
        if (active && showLoading) setLoading(false)
      }
    }

    void load(true)
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(false)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [uid])

  async function remove(snack: SavedSnack) {
    if (!window.confirm(`Delete “${snack.title}”?`)) return
    try {
      await deleteSnack(uid, snack.id)
      setSnacks((current) => current.filter((item) => item.id !== snack.id))
      setError('')
    } catch (err) {
      setError(snackErrorMessage(err))
    }
  }

  return (
    <section className="vocab-snacks" aria-label="Your Snack Vault">
      <h2 className="vocab-section-heading">Your Snack Vault</h2>
      {loading ? <p className="ds-subtitle">Loading your snacks…</p> : null}
      {error ? <p className="vocab-auth-error" role="alert">{error}</p> : null}
      {!loading && snacks.length === 0 && !error ? (
        <p className="ds-subtitle">Save a snack, then crunch it again here.</p>
      ) : null}
      <Stack gap="3">
        {snacks.map((snack) => (
          <article key={snack.id} className="vocab-snack">
            <div className="vocab-snack__copy">
              <p className="vocab-snack__title">{snack.title}</p>
              <p className="ds-subtitle">
                {snack.questions.length === 0 ? 'Saved list' : `${snack.questions.length} questions`}
                {snack.createdAt
                  ? ` · ${new Date(snack.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : ''}
              </p>
            </div>
            <div className="vocab-snack__actions">
              <Button size="sm" className="btn-pop" onClick={() => onRestudy(snack)}>
                Crunch Again
              </Button>
              <IconButton label={`Delete ${snack.title}`} className="vocab-snack__delete" onClick={() => void remove(snack)}>
                <TrashIcon />
              </IconButton>
            </div>
          </article>
        ))}
      </Stack>
    </section>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
