import { useEffect, useState } from 'react'
import { primeSpeech, speakWord, stopSpeaking } from '../../lib/speech/speak'

export function HearButton({ text, lang = '' }: { text: string; lang?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    primeSpeech()
    stopSpeaking()
    setBusy(false)
    setError('')
    return () => stopSpeaking()
  }, [text])

  function hear() {
    if (busy || !text.trim()) return
    setBusy(true)
    setError('')
    try {
      speakWord(text, {
        lang,
        onEnd: () => setBusy(false),
        onError: (message) => {
          setBusy(false)
          setError(message)
        },
      })
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not play that word.')
    }
  }

  return (
    <div className="vocab-hear">
      <button
        type="button"
        className="vocab-hear__btn"
        aria-label="Hear word"
        title="Hear word"
        disabled={busy || !text.trim()}
        aria-busy={busy || undefined}
        onClick={hear}
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
