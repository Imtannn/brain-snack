import {
  MAX_SECONDS,
  MIN_SECONDS,
  PASTE_HINT,
  PASTE_PLACEHOLDER,
} from '../../lib/vocabulary/constants'
import { Button, Stack, TextArea, TextField } from '@shared/ui'

const SAMPLE_SNACK = [
  "l'éclair: flash of lightning (literally lightning speed, like the pastry)",
  "le papillon: butterfly fluttering in the garden",
  "l'étoile: star shining in the night sky",
  "le coucher de soleil: sunset over the evening ocean",
  "la vague: ocean wave crashing onto the shore",
  "le vent: gentle breeze blowing through trees",
].join('\n')

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
        <div className="vocab-sample-row">
          <h5 className="vocab-section-heading">Dump your snacks</h5>
          <button
            type="button"
            className="vocab-quick-btn"
            onClick={() => onPaste(SAMPLE_SNACK)}
          >
            ⚡️ Load sample snack bite
          </button>
        </div>

        <TextArea
          label="Vocabulary list"
          hint={PASTE_HINT}
          error={error || undefined}
          rows={10}
          value={paste}
          placeholder={PASTE_PLACEHOLDER}
          controlClassName="vocab-paste"
          onChange={(event) => onPaste(event.target.value)}
        />

        <div className="vocab-sample-row" style={{ marginTop: 'var(--space-2)' }}>
          <h5 className="vocab-section-heading">Crunch Timer</h5>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="vocab-quick-btn"
              onClick={() => onSeconds('8')}
            >
              8s (Speed)
            </button>
            <button
              type="button"
              className="vocab-quick-btn"
              onClick={() => onSeconds('12')}
            >
              12s (Normal)
            </button>
            <button
              type="button"
              className="vocab-quick-btn"
              onClick={() => onSeconds('20')}
            >
              20s (Chill)
            </button>
          </div>
        </div>

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

        <Button type="submit" block size="lg" className="btn-pop">
          Proceed
        </Button>
      </Stack>
    </form>
  )
}
