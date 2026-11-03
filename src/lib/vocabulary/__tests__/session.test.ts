import { describe, expect, it } from 'vitest'
import { advance, expireQuestion, remainingMs, selectChoice, startSession } from '../session'
import type { QuizQuestion } from '../types'

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    noteId: 'a',
    promptLabel: 'Word',
    prompt: 'ephemeral',
    correctLabel: 'lasting briefly',
    choices: [
      { id: 'ok', label: 'lasting briefly', correct: true },
      { id: 'no', label: 'practical', correct: false },
    ],
    explanation: {
      summary: 'ephemeral means lasting briefly.',
      usage: 'In context: The joy was ephemeral.',
      contrasts: [{ word: 'pragmatic', definition: 'pragmatic means practical.' }],
    },
  },
  {
    id: 'q2',
    noteId: 'b',
    promptLabel: 'Word',
    prompt: 'pragmatic',
    correctLabel: 'practical',
    choices: [
      { id: 'ok2', label: 'practical', correct: true },
      { id: 'no2', label: 'lasting briefly', correct: false },
    ],
    explanation: {
      summary: 'pragmatic means practical.',
      usage: 'In context: A pragmatic fix.',
      contrasts: [],
    },
  },
]

describe('quiz session', () => {
  it('reveals the correct answer as soon as the choice is wrong', () => {
    const started = startSession(questions, 15000, 1000)
    const revealed = selectChoice(started, 'no', 4000)
    expect(revealed.phase).toBe('revealed')
    expect(revealed.revealReason).toBe('wrong')
    expect(revealed.answers).toEqual([
      { questionId: 'q1', correct: false, reason: 'wrong', selectedLabel: 'practical' },
    ])
    expect(revealed.remainingAtRevealMs).toBe(12000)
    expect(selectChoice(revealed, 'ok', 4500)).toBe(revealed)
  })

  it('records a correct choice without moving on by itself', () => {
    const revealed = selectChoice(startSession(questions, 15000, 0), 'ok', 500)
    expect(revealed.revealReason).toBe('correct')
    expect(revealed.answers[0]?.correct).toBe(true)
    expect(revealed.index).toBe(0)
  })

  it('reveals on timeout and ignores a later timeout', () => {
    const started = startSession(questions, 15000, 0)
    const expired = expireQuestion(started, 15000)
    expect(expired.revealReason).toBe('timeout')
    expect(expired.answers[0]?.selectedLabel).toBeNull()
    expect(remainingMs(0, 15000, 16000)).toBe(0)
    expect(remainingMs(200, 10000, 100)).toBe(10000)
    expect(expireQuestion(expired, 16000)).toBe(expired)
  })

  it('advances to the next question and finishes after the last one', () => {
    const first = selectChoice(startSession(questions, 10000, 0), 'ok', 100)
    const next = advance(first, 200)
    expect(next.finished).toBe(false)
    expect(next.session.index).toBe(1)
    expect(next.session.phase).toBe('question')
    expect(next.session.startedAtPerf).toBe(200)
    const last = selectChoice(next.session, 'no2', 300)
    expect(advance(last, 400).finished).toBe(true)
  })
})
