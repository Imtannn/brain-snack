import { useEffect, useState } from 'react'
import { Button, Stack } from '@shared/ui'
import { deleteSnack, listSnacks, snackErrorMessage } from '../../lib/snacks/firestore'
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
    setLoading(true)
    listSnacks(uid)
      .then((next) => {
        if (!active) return
        setSnacks(next)
        setError('')
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(snackErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
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
    <section className="vocab-snacks" aria-label="Saved snacks">
      <h2 className="vocab-section-heading">Saved snacks</h2>
      {loading ? <p className="ds-subtitle">Loading saved snacks…</p> : null}
      {error ? <p className="vocab-auth-error" role="alert">{error}</p> : null}
      {!loading && snacks.length === 0 && !error ? (
        <p className="ds-subtitle">Finish a Gemini session and save it to restudy here.</p>
      ) : null}
      <Stack gap="3">
        {snacks.map((snack) => (
          <article key={snack.id} className="vocab-snack">
            <div>
              <p className="vocab-snack__title">{snack.title}</p>
              <p className="ds-subtitle">
                {snack.questions.length} questions
                {snack.createdAt ? ` · ${new Date(snack.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
              </p>
            </div>
            <div className="vocab-snack__actions">
              <Button size="sm" className="btn-pop" onClick={() => onRestudy(snack)}>
                Restudy
              </Button>
              <Button size="sm" variant="quiet" onClick={() => void remove(snack)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </Stack>
    </section>
  )
}
