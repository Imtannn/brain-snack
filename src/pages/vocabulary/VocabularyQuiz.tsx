import { useCallback, useEffect, useState } from 'react'
import { perfNow } from '../../lib/core/clock'
import { CHOICE_KEYS, TIMER_TICK_MS } from '../../lib/vocabulary/constants'
import { advance, expireQuestion, remainingMs, selectChoice, startSession } from '../../lib/vocabulary/session'
import type { AnswerRecord, QuizQuestion, QuizSessionState, RevealReason } from '../../lib/vocabulary/types'
import { Button, type ButtonVariant, ProgressBar, Stack, Surface } from '@shared/ui'

export function VocabularyQuiz({
  questions,
  seconds,
  onFinish,
}: {
  questions: readonly QuizQuestion[]
  seconds: number
  onFinish: (answers: readonly AnswerRecord[]) => void
}) {
  const [session, setSession] = useState<QuizSessionState>(() =>
    startSession(questions, seconds * 1000, perfNow()),
  )
  const [now, setNow] = useState(() => session.startedAtPerf)
  const question = session.questions[session.index]
  const answering = session.phase === 'question'
  const liveMs = remainingMs(session.startedAtPerf, session.limitMs, now)
  const shownMs = answering ? liveMs : session.revealReason === 'timeout' ? 0 : (session.remainingAtRevealMs ?? 0)
  const secondsLeft = Math.ceil(shownMs / 1000)
  const low = answering && secondsLeft <= 4
  const timedOut = session.revealReason === 'timeout'
  const percent = session.limitMs === 0 ? 0 : (shownMs / session.limitMs) * 100

  useEffect(() => {
    if (!answering) return
    const startedAt = session.startedAtPerf
    const limitMs = session.limitMs
    const id = window.setInterval(() => {
      const tick = perfNow()
      setNow(tick)
      if (remainingMs(startedAt, limitMs, tick) <= 0) {
        setSession((current) => expireQuestion(current, tick))
      }
    }, TIMER_TICK_MS)
    return () => window.clearInterval(id)
  }, [answering, session.startedAtPerf, session.limitMs])

  useEffect(() => {
    if (!answering || !question) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const choice = question.choices[Number(event.key) - 1]
      if (!choice) return
      event.preventDefault()
      setSession((current) => selectChoice(current, choice.id, perfNow()))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answering, question])

  const goNext = useCallback(() => {
    const step = advance(session, perfNow())
    if (step.finished) onFinish(step.session.answers)
    else setSession(step.session)
  }, [onFinish, session])

  useEffect(() => {
    if (answering || !question) return
    const onKey = (event: KeyboardEvent) => {
      const space = event.key === ' ' || event.code === 'Space'
      if (!space && event.key !== 'Enter') return
      if (space) event.preventDefault()
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Enter') event.preventDefault()
      goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answering, goNext, question])

  if (!question) return null

  function choose(choiceId: string) {
    setSession((current) => selectChoice(current, choiceId, perfNow()))
  }

  const countClass = `vocab-timer__count${low ? ' is-low' : ''}${timedOut ? ' is-out' : ''}`

  return (
    <Stack gap="5">
      <div className="vocab-timer" role="timer" aria-live="off" aria-atomic="true" aria-label={`${secondsLeft} seconds remaining`}>
        <div className="vocab-timer__row">
          <p className="ds-eyebrow">
            Bite {session.index + 1} of {session.questions.length}
          </p>
          <p className={countClass}>
            <span>⏳</span>
            <span>{secondsLeft}s</span>
          </p>
        </div>
        <ProgressBar
          progress={percent}
          className="vocab-timer__bar"
          bgClassName="vocab-timer__track"
          fillClassName={low || timedOut ? 'vocab-timer__fill is-low' : 'vocab-timer__fill'}
          aria-label="Time remaining"
        />
      </div>

      <div className="vocab-target-box">
        <p className="ds-eyebrow" style={{ color: 'var(--melon)', fontWeight: 800 }}>Choose the English meaning</p>
        <h2 className="vocab-prompt">{question.prompt}</h2>
      </div>

      <div className="vocab-choices">
        {question.choices.map((choice, index) => (
          <Button
            key={choice.id}
            block
            variant={choiceVariant(choice.correct, choice.id === session.selectedChoiceId, session.phase)}
            className="vocab-choice"
            aria-pressed={choice.id === session.selectedChoiceId}
            onClick={() => choose(choice.id)}
          >
            <span className="vocab-choice__key">{CHOICE_KEYS[index] ?? String(index + 1)}</span>
            <span className="vocab-choice__label">{choice.label}</span>
          </Button>
        ))}
      </div>

      {session.phase === 'revealed' && session.revealReason ? (
        <Reveal question={question} reason={session.revealReason} selectedLabel={session.answers.at(-1)?.selectedLabel ?? null} />
      ) : null}

      {session.phase === 'revealed' ? (
        <Button onClick={goNext} size="lg" className="btn-pop">
          {session.index === session.questions.length - 1 ? 'See results' : 'Next question'}
        </Button>
      ) : (
        <p className="ds-subtitle" style={{ textAlign: 'center' }}>
          Keys 1 to {question.choices.length} answer. The clock stops when you choose, or when it hits zero.
        </p>
      )}
    </Stack>
  )
}

function Reveal({
  question,
  reason,
  selectedLabel,
}: {
  question: QuizQuestion
  reason: RevealReason
  selectedLabel: string | null
}) {
  const heading = reason === 'correct' ? 'Correct' : reason === 'wrong' ? 'Not quite' : 'Time is up'
  const meaning = `The English meaning is “${question.correctLabel}”.`
  const lead = reason === 'wrong' && selectedLabel
    ? `You chose “${selectedLabel}”. ${meaning}`
    : reason === 'timeout'
      ? `The timer ran out. ${meaning}`
      : meaning
  return (
    <Surface pad stack="2" className={`vocab-reveal is-${reason === 'correct' ? 'correct' : reason === 'wrong' ? 'wrong' : 'timeout'}`} aria-live="assertive">
      <p className="ds-eyebrow">{heading}</p>
      <p className="ds-body" style={{ fontWeight: 600 }}>{lead}</p>
      <p className="ds-body">{question.explanation.summary}</p>
    </Surface>
  )
}

function choiceVariant(
  correct: boolean,
  selected: boolean,
  phase: QuizSessionState['phase'],
): ButtonVariant {
  if (phase !== 'revealed') return 'ghost'
  if (correct) return 'primary'
  if (selected) return 'danger'
  return 'ghost'
}
