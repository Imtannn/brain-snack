import {
  MAX_SECONDS,
  MIN_SECONDS,
  PASTE_HINT,
  PASTE_PLACEHOLDER,
} from '../../lib/vocabulary/constants'
import { Button, Stack, Switch, TextArea, TextField } from '@shared/ui'

const SAMPLE_SNACK = [
  "l'éclair: flash of lightning (literally lightning speed, like the pastry)",
  'le papillon: butterfly fluttering in the garden',
  "l'étoile: star shining in the night sky",
  'le coucher de soleil: sunset over the evening ocean',
  'la vague: ocean wave crashing onto the shore',
  'le vent: gentle breeze blowing through trees',
].join('\n')

export function VocabularyInput({
  paste,
  secondsText,
  error,
  onPaste,
  onSeconds,
  onProceed,
  busy = false,
  proceedLabel = 'Proceed',
  banner = '',
  smartAnswers = false,
  onSmartAnswers,
  canUseSmartAnswers = false,
}: {
  paste: string
  secondsText: string
  error: string
  onPaste: (value: string) => void
  onSeconds: (value: string) => void
  onProceed: () => void
  busy?: boolean
  proceedLabel?: string
  banner?: string
  smartAnswers?: boolean
  onSmartAnswers?: (value: boolean) => void
  canUseSmartAnswers?: boolean
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) return
        onProceed()
      }}
    >
      <Stack gap="4">
        {banner ? <p className="vocab-pro-banner">{banner}</p> : null}

        <div className="vocab-sample-row">
          <h5 className="vocab-section-heading">Dump your snacks</h5>
          <button
            type="button"
            className="vocab-quick-btn"
            onClick={() => onPaste(SAMPLE_SNACK)}
            disabled={busy}
          >
            ⚡️ Load sample snack bite
          </button>
        </div>

        <TextArea
          label="Paste anything"
          hint={PASTE_HINT}
          error={error || undefined}
          rows={12}
          value={paste}
          placeholder={PASTE_PLACEHOLDER}
          controlClassName="vocab-paste"
          onChange={(event) => onPaste(event.target.value)}
        />

        <div className="vocab-sample-row" style={{ marginTop: 'var(--space-2)' }}>
          <h5 className="vocab-section-heading">Crunch Timer</h5>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="vocab-quick-btn" onClick={() => onSeconds('8')} disabled={busy}>
              8s (Speed)
            </button>
            <button type="button" className="vocab-quick-btn" onClick={() => onSeconds('12')} disabled={busy}>
              12s (Normal)
            </button>
            <button type="button" className="vocab-quick-btn" onClick={() => onSeconds('20')} disabled={busy}>
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

        {canUseSmartAnswers && onSmartAnswers ? (
          <div className="vocab-smart">
            <div className="vocab-smart__copy">
              <p className="vocab-smart__label">Brainy: Smart Answers</p>
              <p className="ds-subtitle vocab-smart__hint">
                {smartAnswers
                  ? 'On — Brainy reads anything you paste and builds tricky, context-aware choices (uses your key).'
                  : 'Off — free & fast. Parses word lists locally with random distractors (no API tokens).'}
              </p>
            </div>
            <Switch
              checked={smartAnswers}
              onChange={onSmartAnswers}
              label="Brainy: Smart Answers"
              disabled={busy}
            />
          </div>
        ) : null}

        <Button type="submit" block size="lg" className="btn-pop" disabled={busy} aria-busy={busy || undefined}>
          {proceedLabel}
        </Button>
      </Stack>
    </form>
  )
}
