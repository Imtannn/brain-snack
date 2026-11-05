import { useEffect, useState } from 'react'
import { speakWord, stopSpeaking } from '../../lib/gemini/speak'

export function HearButton({
  text,
  apiKey = null,
}: {
  text: string
  apiKey?: string | null
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const label = apiKey ? 'Hear with Brainy' : 'Hear word'

  useEffect(() => {
    stopSpeaking()
    setBusy(false)
    setError('')
    return () => stopSpeaking()
  }, [text])

  async function hear() {
    if (busy || !text.trim()) return
    setBusy(true)
    setError('')
    try {
      await speakWord(text, { apiKey })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not play that word.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="vocab-hear">
      <button
        type="button"
        className="vocab-hear__btn"
        aria-label={label}
        title={label}
        disabled={busy || !text.trim()}
        aria-busy={busy || undefined}
        onClick={() => void hear()}
      >
        <span aria-hidden="true">{busy ? '…' : '🔊'}</span>
        <span>{busy ? 'Speaking…' : 'Hear'}</span>
      </button>
      {error ? (
        <p className="vocab-auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
