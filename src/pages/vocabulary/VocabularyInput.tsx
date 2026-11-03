import {
  MAX_SECONDS,
  MIN_SECONDS,
  PASTE_HINT,
  PASTE_PLACEHOLDER,
} from '../../lib/vocabulary/constants'
import { Button, Stack, TextArea, TextField } from '@shared/ui'

export function VocabularyInput({
  paste,
  secondsText,
  error,
  onPaste,
  onSeconds,
  onProceed,
}: {
  paste: string
  secondsText: string
  error: string
  onPaste: (value: string) => void
  onSeconds: (value: string) => void
  onProceed: () => void
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onProceed()
      }}
    >
      <Stack gap="4">
        <TextArea
          label="Vocabulary list"
          hint={PASTE_HINT}
          error={error || undefined}
          rows={12}
          value={paste}
          placeholder={PASTE_PLACEHOLDER}
          controlClassName="vocab-paste"
          onChange={(event) => onPaste(event.target.value)}
        />
        <TextField
          label="Seconds per question"
          type="number"
          inputMode="numeric"
          min={MIN_SECONDS}
          max={MAX_SECONDS}
          value={secondsText}
          hint={`From ${MIN_SECONDS} to ${MAX_SECONDS} seconds. A wrong answer or a timeout shows the English meaning.`}
          onChange={(event) => onSeconds(event.target.value)}
        />
        <Button type="submit" block>
          Proceed
        </Button>
      </Stack>
    </form>
  )
}
