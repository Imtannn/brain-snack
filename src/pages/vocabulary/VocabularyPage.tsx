import { useState } from 'react'
import { Button } from '@shared/ui'
import { randomUnit } from '../../lib/core/clock'
import { uid } from '../../lib/core/uid'
import { DEFAULT_SECONDS, QUIZ_CHOICE_COUNT } from '../../lib/vocabulary/constants'
import { parseVocabularyPaste } from '../../lib/vocabulary/parseNotes'
import { buildMeaningQuiz, clampQuizSeconds } from '../../lib/vocabulary/quiz'
import type { AnswerRecord, QuizQuestion, VocabNote } from '../../lib/vocabulary/types'
import '../../styles/vocabulary.css'
import { VocabChrome } from './VocabChrome'
import { VocabularyInput } from './VocabularyInput'
import { VocabularyQuiz } from './VocabularyQuiz'

type VocabPhase =
  | { kind: 'input' }
  | { kind: 'quiz'; runId: string; questions: QuizQuestion[]; seconds: number }
  | { kind: 'done'; questions: QuizQuestion[]; answers: AnswerRecord[]; seconds: number }

export function VocabularyPage() {
  const [paste, setPaste] = useState('')
  const [secondsText, setSecondsText] = useState(String(DEFAULT_SECONDS))
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<VocabPhase>({ kind: 'input' })

  function startQuiz() {
    const seconds = clampQuizSeconds(Number(secondsText))
    setSecondsText(String(seconds))
    const notes = notesFromPaste(paste)
    const questions = buildMeaningQuiz(notes, randomUnit)
    if (questions.length === 0) {
      setError(quizError(notes.length))
      setPhase({ kind: 'input' })
      return
    }
    setError('')
    setPhase({ kind: 'quiz', runId: uid('run'), questions, seconds })
  }

  return (
    <main className="vocab-page">
      <div className="vocab-wrap">
        {phase.kind === 'input' ? (
          <>
            <VocabChrome
              title="Brain Snack"
              subtitle="Feed your mind in seconds. Paste a list, then crunch the meanings."
            />
            <VocabularyInput
              paste={paste}
              secondsText={secondsText}
              error={error}
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
              onFinish={(answers) =>
                setPhase({
                  kind: 'done',
                  questions: phase.questions,
                  answers: answers.slice(),
                  seconds: phase.seconds,
                })
              }
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
}: {
  correct: number
  total: number
  onAgain: () => void
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
      <Button onClick={onAgain} size="lg" className="btn-pop">
        Practice again
      </Button>
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
