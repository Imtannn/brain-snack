import type { AnswerRecord, QuizPhase, QuizQuestion, QuizSessionState, RevealReason } from './types'

export function remainingMs(startedAtPerf: number, limitMs: number, nowPerf: number): number {
  const elapsed = nowPerf - startedAtPerf
  if (elapsed <= 0) return limitMs
  return Math.max(0, limitMs - elapsed)
}

export function startSession(
  questions: readonly QuizQuestion[],
  limitMs: number,
  nowPerf: number,
): QuizSessionState {
  return {
    questions,
    index: 0,
    phase: 'question',
    revealReason: null,
    selectedChoiceId: null,
    remainingAtRevealMs: null,
    answers: [],
    startedAtPerf: nowPerf,
    limitMs,
  }
}

export function selectChoice(session: QuizSessionState, choiceId: string, nowPerf: number): QuizSessionState {
  if (session.phase !== 'question') return session
  const question = session.questions[session.index]
  const choice = question?.choices.find((item) => item.id === choiceId)
  if (!question || !choice) return session
  return reveal(session, choice.correct ? 'correct' : 'wrong', choiceId, nowPerf)
}

export function expireQuestion(session: QuizSessionState, nowPerf: number): QuizSessionState {
  if (session.phase !== 'question') return session
  return reveal(session, 'timeout', null, nowPerf)
}

export function advance(
  session: QuizSessionState,
  nowPerf: number,
): { session: QuizSessionState; finished: boolean } {
  if (session.phase !== 'revealed') return { session, finished: false }
  if (session.index >= session.questions.length - 1) return { session, finished: true }
  return {
    finished: false,
    session: {
      ...session,
      index: session.index + 1,
      phase: 'question',
      revealReason: null,
      selectedChoiceId: null,
      remainingAtRevealMs: null,
      startedAtPerf: nowPerf,
    },
  }
}

function reveal(
  session: QuizSessionState,
  reason: RevealReason,
  choiceId: string | null,
  nowPerf: number,
): QuizSessionState {
  const question = session.questions[session.index]
  if (!question) return session
  const selected = question.choices.find((choice) => choice.id === choiceId) ?? null
  const answer: AnswerRecord = {
    questionId: question.id,
    correct: reason === 'correct',
    reason,
    selectedLabel: selected?.label ?? null,
  }
  const phase: QuizPhase = 'revealed'
  return {
    ...session,
    phase,
    revealReason: reason,
    selectedChoiceId: choiceId,
    remainingAtRevealMs: remainingMs(session.startedAtPerf, session.limitMs, nowPerf),
    answers: [...session.answers, answer],
  }
}
