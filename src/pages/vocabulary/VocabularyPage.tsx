import { useRef } from 'react'
import { Button, TextField } from '@shared/ui'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import { modelNotice } from '../../lib/gemini/client'
import type { QuizQuestion } from '../../lib/vocabulary/types'
import { snackTitle } from '../../lib/snacks/snackRecord'
import type { SavedSnack } from '../../lib/snacks/snackRecord'
import { useSpeechLang } from '../../lib/speech/SpeechLangProvider'
import { VocabChrome } from './VocabChrome'
import { VocabularyInput } from './VocabularyInput'
import { VocabularyQuiz } from './VocabularyQuiz'
import { useQuizRun } from './useQuizRun'
import { useSnackSave } from './useSnackSave'

export function VocabularyPage({
  restudySnack = null,
  onHome,
}: {
  restudySnack?: SavedSnack | null
  onHome?: () => void
} = {}) {
  const { user } = useAuth()
  const { key: geminiKey } = useGeminiKey()
  const { lang, setLang } = useSpeechLang()
  const canUseSmartAnswers = Boolean(user && geminiKey)
  const rememberRef = useRef<(questions: readonly QuizQuestion[], model: string | null) => void>(() => {})
  const readyRef = useRef<() => void>(() => {})
  const quiz = useQuizRun(
    restudySnack,
    geminiKey,
    canUseSmartAnswers,
    (questions, model) => rememberRef.current(questions, model),
    () => readyRef.current(),
  )
  const save = useSnackSave({
    user,
    restudySnack,
    paste: quiz.paste,
    secondsText: quiz.secondsText,
    smartAnswers: quiz.smartAnswers,
    canUseSmartAnswers,
    phase: quiz.phase,
    setError: quiz.setError,
  })
  rememberRef.current = save.rememberQuestions
  readyRef.current = () => save.setSaveError('')

  const { phase } = quiz
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
            paste={quiz.paste}
            secondsText={quiz.secondsText}
            error={quiz.error}
            banner={banner}
            busy={quiz.generating}
            proceedLabel={quiz.generating ? 'Crunching with Brainy…' : 'Proceed'}
            smartAnswers={quiz.smartAnswers}
            canUseSmartAnswers={canUseSmartAnswers}
            onSmartAnswers={quiz.setSmartAnswers}
            canSave={Boolean(user)}
            saveTitle={save.saveTitle}
            saveOpen={save.saveOpen}
            saving={save.saving}
            saved={save.saved}
            saveError={save.saveError}
            onSaveTitle={(value) => {
              save.setSaveTitle(value)
              save.setSaveError('')
            }}
            onOpenSave={save.openSave}
            onSave={() => void save.saveList()}
            onPaste={(value) => {
              quiz.setPaste(value)
              quiz.setError('')
              save.detach()
            }}
            onSeconds={(value) => {
              quiz.setSecondsText(value)
              quiz.setError('')
            }}
            speechLang={lang}
            onSpeechLang={setLang}
            onProceed={quiz.startQuiz}
          />
        </>
      ) : null}

      {phase.kind === 'quiz' ? (
        <>
          <VocabChrome
            eyebrow="Quick Drill"
            title="Brain Snack"
            actions={
              <Button variant="quiet" onClick={() => quiz.setPhase({ kind: 'input' })}>
                Edit bites
              </Button>
            }
          />
          <VocabularyQuiz
            key={phase.runId}
            questions={phase.questions}
            seconds={phase.seconds}
            lang={lang}
            modelNotice={phase.pro && phase.model ? modelNotice() : ''}
            tutor={phase.pro && geminiKey ? { apiKey: geminiKey } : null}
            onFinish={(answers) => {
              save.setSaveError('')
              if (!save.saved) save.setSaveTitle(snackTitle(phase.rawText))
              quiz.setPhase({
                kind: 'done',
                questions: phase.questions,
                answers: answers.slice(),
                seconds: phase.seconds,
                rawText: phase.rawText,
                pro: phase.pro,
                model: phase.model,
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
              <Button variant="quiet" onClick={() => quiz.setPhase({ kind: 'input' })}>
                Edit list
              </Button>
            }
          />
          <Finished
            correct={phase.answers.filter((answer) => answer.correct).length}
            total={phase.answers.length}
            onAgain={quiz.startQuiz}
            onHome={onHome}
            canSave={Boolean(user) && !save.saved}
            title={save.saveTitle}
            onTitle={(value) => {
              save.setSaveTitle(value)
              save.setSaveError('')
            }}
            saving={save.saving}
            saved={save.saved}
            saveError={save.saveError}
            onSave={() => void save.saveCurrent()}
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
      {saved ? (
        <p className="vocab-save-toast" role="status">
          Snack saved. It’s waiting in Your Snack Vault.
        </p>
      ) : null}
      {canSave ? (
        <div className="vocab-save">
          <TextField
            label="Snack name"
            value={title}
            placeholder="French Café Words"
            disabled={saving}
            onChange={(event) => onTitle(event.target.value)}
          />
          <Button onClick={onSave} size="lg" block className="btn-pop" disabled={saving} aria-busy={saving || undefined}>
            {saving ? 'Saving…' : 'Save Snack'}
          </Button>
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
