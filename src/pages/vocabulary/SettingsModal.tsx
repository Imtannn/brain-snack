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
      title="Brainy"
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault()
        const next = draft.trim()
        if (!next) {
          setError('Paste an API key first.')
          return
        }
        onSave(next)
        onClose()
      }}
    >
      <Stack gap="4">
        <p className="ds-subtitle">Our AI agent. Paste an API key from Google AI Studio.</p>
        <TextField
          label="API key"
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          value={draft}
          error={error || undefined}
          hint="Saved in this browser for this account only."
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
