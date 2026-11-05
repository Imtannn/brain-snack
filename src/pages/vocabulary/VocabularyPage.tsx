import { useState } from 'react'
import { Button, TextField } from '@shared/ui'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import { randomUnit } from '../../lib/core/clock'
import { uid } from '../../lib/core/uid'
import { modelNotice as describeModel } from '../../lib/gemini/client'
import { generateQuizFromNotes } from '../../lib/gemini/generateQuiz'
import { saveSnack, snackErrorMessage } from '../../lib/snacks/store'
import { snackTitle, type SavedSnack } from '../../lib/snacks/snackRecord'
import { DEFAULT_SECONDS, QUIZ_CHOICE_COUNT } from '../../lib/vocabulary/constants'
import { parseVocabularyPaste } from '../../lib/vocabulary/parseNotes'
import { buildMeaningQuiz, clampQuizSeconds } from '../../lib/vocabulary/quiz'
import type { AnswerRecord, QuizQuestion, VocabNote } from '../../lib/vocabulary/types'
import '../../styles/vocabulary.css'
import { VocabChrome } from './VocabChrome'
import { VocabularyInput } from './VocabularyInput'
import { VocabularyQuiz } from './VocabularyQuiz'

type QuizRun = {
  runId: string
  questions: QuizQuestion[]
  seconds: number
  rawText: string
  pro: boolean
  model: string | null
  fallback: boolean
}

type VocabPhase =
  | { kind: 'input' }
  | ({ kind: 'quiz' } & QuizRun)
  | ({ kind: 'done'; answers: AnswerRecord[] } & Omit<QuizRun, 'runId'>)

export function VocabularyPage({
  restudySnack = null,
  onHome,
}: {
  restudySnack?: SavedSnack | null
  onHome?: () => void
} = {}) {
  const { user } = useAuth()
  const { key: geminiKey } = useGeminiKey()
  const [paste, setPaste] = useState(restudySnack?.rawText ?? '')
  const [secondsText, setSecondsText] = useState(String(restudySnack?.seconds ?? DEFAULT_SECONDS))
  const [smartAnswers, setSmartAnswers] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<VocabPhase>(() =>
    restudySnack
      ? {
          // Replay the saved questions exactly. No parser, no Gemini call.
          kind: 'quiz',
          runId: uid('run'),
          questions: restudySnack.questions,
          seconds: clampQuizSeconds(restudySnack.seconds),
          rawText: restudySnack.rawText,
          pro: true,
          model: restudySnack.model,
          fallback: false,
        }
      : { kind: 'input' },
  )
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveError, setSaveError] = useState('')
  const canUseSmartAnswers = Boolean(user && geminiKey)

  function startQuiz() {
    if (generating) return
    const seconds = clampQuizSeconds(Number(secondsText))
    setSecondsText(String(seconds))
    if (canUseSmartAnswers && smartAnswers) {
      void startProQuiz(seconds)
      return
    }
    startLocalQuiz(seconds)
  }

  function startLocalQuiz(seconds: number) {
    const notes = notesFromPaste(paste)
    const questions = buildMeaningQuiz(notes, randomUnit)
    if (questions.length === 0) {
      setError(quizError(notes.length))
      setPhase({ kind: 'input' })
      return
    }
    setError('')
    setSaved(false)
    setSaveError('')
    setPhase({
      kind: 'quiz',
      runId: uid('run'),
      questions,
      seconds,
      rawText: paste,
      pro: false,
      model: null,
      fallback: false,
    })
  }

  async function startProQuiz(seconds: number) {
    const text = paste.trim()
    if (!text) {
      setError('Paste a list, notes, or a topic before asking Brainy.')
      setPhase({ kind: 'input' })
      return
    }
    setGenerating(true)
    setError('')
    try {
      const result = await generateQuizFromNotes(geminiKey, text)
      if (result.questions.length === 0) {
        setError('Brainy did not return any usable questions. Try clearer notes or a topic.')
        setPhase({ kind: 'input' })
        return
      }
      setSaved(false)
      setSaveError('')
      setPhase({
        kind: 'quiz',
        runId: uid('run'),
        questions: result.questions,
        seconds,
        rawText: text,
        pro: true,
        model: result.model,
        fallback: result.fallback,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brainy could not build this snack.')
      setPhase({ kind: 'input' })
    } finally {
      setGenerating(false)
    }
  }

  async function saveCurrent() {
    if (!user || phase.kind !== 'done' || saving || saved) return
    const title = saveTitle.trim()
    if (!title) {
      setSaveError('Name this snack before saving.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await saveSnack(user.uid, {
        title,
        rawText: phase.rawText,
        seconds: phase.seconds,
        questions: phase.questions,
        model: phase.model,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(snackErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const banner =
    user && !geminiKey ? 'Add a Brainy key in Settings to unlock Smart Answers and the tutor.' : ''

  return (
    <div className="vocab-wrap">
      {phase.kind === 'input' ? (
        <>
          <VocabChrome
            title="Brain Snack"
            subtitle="Paste text — a list, notes, or a topic — then crunch the meanings."
          />
          <VocabularyInput
            paste={paste}
            secondsText={secondsText}
            error={error}
            banner={banner}
            busy={generating}
            proceedLabel={generating ? 'Crunching with Brainy…' : 'Proceed'}
            smartAnswers={smartAnswers}
            canUseSmartAnswers={canUseSmartAnswers}
            onSmartAnswers={setSmartAnswers}
            onPaste={(value) => {
              setPaste(value)
              setError('')
            }}
            onSeconds={(value) => {
              setSecondsText(value)
              setError('')
            }}
            onProceed={startQuiz}
          />
        </>
      ) : null}

      {phase.kind === 'quiz' ? (
        <>
          <VocabChrome
            eyebrow="Quick Drill"
            title="Brain Snack"
            actions={
              <Button variant="quiet" onClick={() => setPhase({ kind: 'input' })}>
                Edit bites
              </Button>
            }
          />
          <VocabularyQuiz
            key={phase.runId}
            questions={phase.questions}
            seconds={phase.seconds}
            modelNotice={phase.pro && phase.model ? describeModel(phase.model, phase.fallback) : ''}
            tutor={phase.pro && geminiKey ? { apiKey: geminiKey } : null}
            onFinish={(answers) => {
              setSaved(false)
              setSaveError('')
              setSaveTitle(snackTitle(phase.rawText))
              setPhase({
                kind: 'done',
                questions: phase.questions,
                answers: answers.slice(),
                seconds: phase.seconds,
                rawText: phase.rawText,
                pro: phase.pro,
                model: phase.model,
                fallback: phase.fallback,
              })
            }}
          />
        </>
      ) : null}

      {phase.kind === 'done' ? (
        <>
          <VocabChrome
            eyebrow="Results"
            title="Brain Snack"
            subtitle="Bite-sized session complete"
            actions={
              <Button variant="quiet" onClick={() => setPhase({ kind: 'input' })}>
                Edit list
              </Button>
            }
          />
          <Finished
            correct={phase.answers.filter((answer) => answer.correct).length}
            total={phase.answers.length}
            onAgain={startQuiz}
            onHome={onHome}
            canSave={Boolean(user)}
            title={saveTitle}
            onTitle={(value) => {
              setSaveTitle(value)
              setSaveError('')
              setSaved(false)
            }}
            saving={saving}
            saved={saved}
            saveError={saveError}
            onSave={() => void saveCurrent()}
          />
        </>
      ) : null}
    </div>
  )
}

function Finished({
  correct,
  total,
  onAgain,
  onHome,
  canSave,
  title,
  onTitle,
  saving,
  saved,
  saveError,
  onSave,
}: {
  correct: number
  total: number
  onAgain: () => void
  onHome?: () => void
  canSave: boolean
  title: string
  onTitle: (value: string) => void
  saving: boolean
  saved: boolean
  saveError: string
  onSave: () => void
}) {
  const ratio = total > 0 ? correct / total : 0
  const rankClass = ratio === 1 ? 'is-perfect' : ratio >= 0.7 ? 'is-great' : 'is-good'
  const rankLabel = ratio === 1 ? '🏆 Snack Master (100%)' : ratio >= 0.7 ? '⚡️ Brain Buffet' : '🍪 Quick Nibble'

  return (
    <div className="vocab-done">
      <div className={`vocab-rank-badge ${rankClass}`}>{rankLabel}</div>
      <p className="vocab-score">
        {correct}
        <span>/{total}</span>
      </p>
      <p className="ds-subtitle">
        {correct} of {total} correct.
      </p>
      {canSave ? (
        <div className="vocab-save">
          <TextField
            label="Snack name"
            value={title}
            placeholder="French Café Words"
            disabled={saving || saved}
            onChange={(event) => onTitle(event.target.value)}
          />
          <Button onClick={onSave} size="lg" block className="btn-pop" disabled={saving || saved} aria-busy={saving || undefined}>
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save Snack'}
          </Button>
          {saved ? (
            <p className="vocab-save-toast" role="status">
              Snack saved. It’s waiting in Your Snack Vault.
            </p>
          ) : null}
          {saveError ? <p className="vocab-auth-error" role="alert">{saveError}</p> : null}
        </div>
      ) : null}
      <div className="vocab-done__actions">
        <Button onClick={onAgain} size="lg" className="btn-pop" variant={canSave ? 'quiet' : undefined}>
          Practice again
        </Button>
        {onHome ? (
          <Button onClick={onHome} size="lg" variant="quiet" className="btn-pop">
            Home
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function notesFromPaste(text: string): VocabNote[] {
  const notes: VocabNote[] = []
  for (const note of parseVocabularyPaste(text).notes) {
    const word = note.word.trim()
    const definition = note.definition.trim()
    if (!word || !definition) continue
    notes.push({ id: uid('note'), word, definition, context: '' })
  }
  return notes
}

function quizError(count: number): string {
  if (count < QUIZ_CHOICE_COUNT) {
    return `Need at least ${QUIZ_CHOICE_COUNT} word: meaning pairs for free mode — or turn on Brainy: Smart Answers if you have a key.`
  }
  return `Need at least ${QUIZ_CHOICE_COUNT} different English meanings so each question has ${QUIZ_CHOICE_COUNT} choices.`
}
