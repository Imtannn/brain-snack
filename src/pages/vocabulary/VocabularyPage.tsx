import { useState } from 'react'
import { Button } from '@shared/ui'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import { randomUnit } from '../../lib/core/clock'
import { uid } from '../../lib/core/uid'
import { modelNotice as describeModel } from '../../lib/gemini/client'
import { generateQuizFromNotes } from '../../lib/gemini/generateQuiz'
import { saveSnack, snackErrorMessage } from '../../lib/snacks/firestore'
import { snackTitle, type SavedSnack } from '../../lib/snacks/snackRecord'
import { DEFAULT_SECONDS, QUIZ_CHOICE_COUNT } from '../../lib/vocabulary/constants'
import { parseVocabularyPaste } from '../../lib/vocabulary/parseNotes'
import { buildMeaningQuiz, clampQuizSeconds } from '../../lib/vocabulary/quiz'
import type { AnswerRecord, QuizQuestion, VocabNote } from '../../lib/vocabulary/types'
import '../../styles/vocabulary.css'
import { SavedSnacks } from './SavedSnacks'
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

export function VocabularyPage() {
  const { user } = useAuth()
  const { key: geminiKey } = useGeminiKey()
  const [paste, setPaste] = useState('')
  const [secondsText, setSecondsText] = useState(String(DEFAULT_SECONDS))
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<VocabPhase>({ kind: 'input' })
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  function startQuiz() {
    if (generating) return
    const seconds = clampQuizSeconds(Number(secondsText))
    setSecondsText(String(seconds))
    if (user && geminiKey) {
      void startProQuiz(seconds)
      return
    }
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
      setError('Paste some notes before asking Gemini to build a snack.')
      setPhase({ kind: 'input' })
      return
    }
    setGenerating(true)
    setError('')
    try {
      const result = await generateQuizFromNotes(geminiKey, text)
      if (result.questions.length === 0) {
        setError('Gemini did not return any usable questions. Try a clearer list.')
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
      setError(err instanceof Error ? err.message : 'Gemini could not build this snack.')
      setPhase({ kind: 'input' })
    } finally {
      setGenerating(false)
    }
  }

  function restudy(snack: SavedSnack) {
    const seconds = clampQuizSeconds(snack.seconds)
    setPaste(snack.rawText)
    setSecondsText(String(seconds))
    setError('')
    setSaved(false)
    setSaveError('')
    setPhase({
      kind: 'quiz',
      runId: uid('run'),
      questions: snack.questions,
      seconds,
      rawText: snack.rawText,
      pro: true,
      model: snack.model,
      fallback: false,
    })
  }

  async function saveCurrent() {
    if (!user || phase.kind !== 'done' || !phase.pro || saving || saved) return
    setSaving(true)
    setSaveError('')
    try {
      await saveSnack(user.uid, {
        title: snackTitle(phase.rawText),
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

  const banner = !user
    ? ''
    : geminiKey
      ? 'Pro mode is on. Proceed sends this paste to Gemini.'
      : 'Add a Gemini key in Settings for AI questions and the tutor.'

  return (
    <main className="vocab-page">
      <div className="vocab-wrap">
        {phase.kind === 'input' ? (
          <>
            <VocabChrome
              title="Brain Snack"
              subtitle="Feed your mind in seconds. Paste a list, then crunch the meanings."
            />
            {user ? <SavedSnacks uid={user.uid} onRestudy={restudy} /> : null}
            <VocabularyInput
              paste={paste}
              secondsText={secondsText}
              error={error}
              banner={banner}
              busy={generating}
              proceedLabel={generating ? 'Crunching with Gemini…' : 'Proceed'}
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
              canSave={Boolean(user && phase.pro)}
              saving={saving}
              saved={saved}
              saveError={saveError}
              onSave={() => void saveCurrent()}
            />
          </>
        ) : null}
      </div>
    </main>
  )
}

function Finished({
  correct,
  total,
  onAgain,
  canSave,
  saving,
  saved,
  saveError,
  onSave,
}: {
  correct: number
  total: number
  onAgain: () => void
  canSave: boolean
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
      <div className="vocab-done__actions">
        {canSave ? (
          <Button onClick={onSave} size="lg" variant="quiet" className="btn-pop" disabled={saving || saved}>
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save snack'}
          </Button>
        ) : null}
        <Button onClick={onAgain} size="lg" className="btn-pop">
          Practice again
        </Button>
      </div>
      {saveError ? <p className="vocab-auth-error" role="alert">{saveError}</p> : null}
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
    return `Paste at least ${QUIZ_CHOICE_COUNT} pairs. Put each foreign word with its English meaning.`
  }
  return `Need at least ${QUIZ_CHOICE_COUNT} different English meanings so each question has ${QUIZ_CHOICE_COUNT} choices.`
}
