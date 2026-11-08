import { useCallback, useEffect, useState } from 'react'
import { perfNow } from '../../lib/core/clock'
import { CHOICE_KEYS, TIMER_TICK_MS } from '../../lib/vocabulary/constants'
import { advance, expireQuestion, remainingMs, selectChoice, startSession } from '../../lib/vocabulary/session'
import type { AnswerRecord, QuizQuestion, QuizSessionState, RevealReason } from '../../lib/vocabulary/types'
import { Button, type ButtonVariant, ProgressBar, Stack, Surface } from '@shared/ui'
import { HearButton } from './HearButton'
import { MarkdownText } from './MarkdownText'
import { TutorPanel } from './TutorPanel'

export function VocabularyQuiz({
  questions,
  seconds,
  onFinish,
  tutor = null,
  modelNotice = '',
  lang,
}: {
  questions: readonly QuizQuestion[]
  seconds: number
  onFinish: (answers: readonly AnswerRecord[]) => void
  tutor?: { apiKey: string } | null
  modelNotice?: string
  lang: string
}) {
  const [session, setSession] = useState<QuizSessionState>(() =>
    startSession(questions, seconds * 1000, perfNow()),
  )
  const question = session.questions[session.index]
  const answering = session.phase === 'question'
  const expire = useCallback((tick: number) => {
    setSession((current) => expireQuestion(current, tick))
  }, [])

  useEffect(() => {
    if (!answering || !question) return
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event)) return
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
      if (isTypingTarget(event)) return
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

  return (
    <Stack gap="5">
      <QuizTimer
        active={answering}
        startedAtPerf={session.startedAtPerf}
        limitMs={session.limitMs}
        frozenMs={session.remainingAtRevealMs ?? 0}
        timedOut={session.revealReason === 'timeout'}
        index={session.index}
        total={session.questions.length}
        onExpire={expire}
      />

      <div className="vocab-target-box">
        <p className="ds-eyebrow" style={{ color: 'var(--melon)', fontWeight: 800 }}>Choose the English meaning</p>
        <div className="vocab-prompt-row">
          <h2 className={question.prompt.length > 80 ? 'vocab-prompt is-long' : 'vocab-prompt'}>{question.prompt}</h2>
          <HearButton text={question.prompt} lang={lang} />
        </div>
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

      {modelNotice ? <p className="ds-subtitle vocab-model-line">{modelNotice}</p> : null}

      {session.phase === 'revealed' && session.revealReason ? (
        <Reveal
          question={question}
          reason={session.revealReason}
          selectedLabel={session.answers.at(-1)?.selectedLabel ?? null}
          speechLang={lang}
        />
      ) : null}

      {session.phase === 'revealed' && tutor && session.revealReason && session.revealReason !== 'correct' ? (
        <TutorPanel
          key={`${question.id}-${session.revealReason}`}
          apiKey={tutor.apiKey}
          question={question}
          reason={session.revealReason}
          selectedLabel={session.answers.at(-1)?.selectedLabel ?? null}
          lang={lang}
        />
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

function QuizTimer({
  active,
  startedAtPerf,
  limitMs,
  frozenMs,
  timedOut,
  index,
  total,
  onExpire,
}: {
  active: boolean
  startedAtPerf: number
  limitMs: number
  frozenMs: number
  timedOut: boolean
  index: number
  total: number
  onExpire: (now: number) => void
}) {
  const [now, setNow] = useState(startedAtPerf)

  useEffect(() => {
    setNow(startedAtPerf)
  }, [startedAtPerf])

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      const tick = perfNow()
      setNow(tick)
      if (remainingMs(startedAtPerf, limitMs, tick) <= 0) onExpire(tick)
    }, TIMER_TICK_MS)
    return () => window.clearInterval(id)
  }, [active, limitMs, onExpire, startedAtPerf])

  const liveMs = remainingMs(startedAtPerf, limitMs, now)
  const shownMs = active ? liveMs : timedOut ? 0 : frozenMs
  const secondsLeft = Math.ceil(shownMs / 1000)
  const low = active && secondsLeft <= 4
  const percent = limitMs === 0 ? 0 : (shownMs / limitMs) * 100
  const countClass = `vocab-timer__count${low ? ' is-low' : ''}${timedOut ? ' is-out' : ''}`

  return (
    <div className="vocab-timer" role="timer" aria-live="off" aria-atomic="true" aria-label={`${secondsLeft} seconds remaining`}>
      <div className="vocab-timer__row">
        <p className="ds-eyebrow">
          Bite {index + 1} of {total}
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
  )
}

function Reveal({
  question,
  reason,
  selectedLabel,
  speechLang,
}: {
  question: QuizQuestion
  reason: RevealReason
  selectedLabel: string | null
  speechLang?: string
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
      <MarkdownText text={question.explanation.summary} className="ds-body" />
      <HearButton text={question.prompt} lang={speechLang} />
    </Surface>
  )
}

function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
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
