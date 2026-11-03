import { useEffect, useState } from 'react'
import { Button, Modal, Stack, TextField } from '@shared/ui'

export function SettingsModal({
  open,
  initialKey,
  onClose,
  onSave,
}: {
  open: boolean
  initialKey: string
  onClose: () => void
  onSave: (key: string) => void
}) {
  const [draft, setDraft] = useState(initialKey)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(initialKey)
    setVisible(false)
    setError('')
  }, [open, initialKey])

  return (
    <Modal
      open={open}
      title="Gemini key"
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault()
        const next = draft.trim()
        if (!next) {
          setError('Paste a Gemini API key first.')
          return
        }
        onSave(next)
        onClose()
      }}
    >
      <Stack gap="4">
        <TextField
          label="Google Gemini API key"
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          value={draft}
          error={error || undefined}
          hint="Saved in this browser for your account only. It is not stored in Firestore."
          onChange={(event) => {
            setDraft(event.target.value)
            setError('')
          }}
        />
        <div className="vocab-settings-actions">
          <Button type="button" variant="quiet" onClick={() => setVisible((current) => !current)}>
            {visible ? 'Hide key' : 'Show key'}
          </Button>
          {initialKey ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                onSave('')
                onClose()
              }}
            >
              Remove key
            </Button>
          ) : null}
          <Button type="submit" className="btn-pop">
            Save key
          </Button>
        </div>
      </Stack>
    </Modal>
  )
}
