import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '../../core/clock'
import { buildExplanation, buildMeaningQuiz, buildQuiz, clampQuizSeconds, shuffleQuestions, type QuizIds } from '../quiz'
import type { VocabNote } from '../types'

const notes: VocabNote[] = [
  { id: 'a', word: 'ephemeral', definition: 'lasting briefly', context: 'The joy was ephemeral.' },
  { id: 'b', word: 'pragmatic', definition: 'sensible and realistic', context: 'A pragmatic fix.' },
  { id: 'c', word: 'candid', definition: 'truthful and straightforward', context: '' },
  { id: 'd', word: 'resilient', definition: 'quick to recover', context: 'A resilient town.' },
  { id: 'e', word: 'echo', definition: 'lasting briefly', context: 'Same meaning, different word.' },
]

const ids: QuizIds = (() => {
  let question = 0
  let choice = 0
  return {
    question: () => `q${(question += 1)}`,
    choice: () => `c${(choice += 1)}`,
  }
})()

describe('buildQuiz', () => {
  it('builds four choices with one correct definition and a context explanation', () => {
    const quiz = buildQuiz(notes.slice(0, 4), 'word-to-definition', createSeededRandom(3), notes.slice(0, 4), ids)
    const first = quiz.find((question) => question.noteId === 'a')
    expect(first?.choices).toHaveLength(4)
    expect(first?.choices.filter((choice) => choice.correct)).toHaveLength(1)
    expect(first?.promptLabel).toBe('Word')
    expect(first?.explanation.summary).toBe('ephemeral means lasting briefly.')
    expect(first?.explanation.usage.startsWith('In context:')).toBe(true)
    expect(first?.explanation.contrasts.length).toBeGreaterThan(0)
  })

  it('asks for the word when the direction is definition to word', () => {
    const quiz = buildQuiz(notes.slice(0, 3), 'definition-to-word', createSeededRandom(1), notes.slice(0, 3), ids)
    expect(quiz[0]?.promptLabel).toBe('Definition')
    expect(quiz[0]?.choices.map((choice) => choice.label).sort()).toEqual(['candid', 'ephemeral', 'pragmatic'])
  })

  it('does not offer a distractor with the same label', () => {
    const quiz = buildQuiz([notes[0], notes[1], notes[4]], 'word-to-definition', createSeededRandom(2), undefined, ids)
    const ephemeral = quiz.find((question) => question.noteId === 'a')
    const labels = ephemeral?.choices.map((choice) => choice.label.toLowerCase()) ?? []
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.filter((label) => label === 'lasting briefly')).toHaveLength(1)
  })

  it('still builds a question from one prompt when the deck has other meanings', () => {
    const quiz = buildQuiz([notes[0]], 'word-to-definition', createSeededRandom(4), notes.slice(0, 4), ids)
    expect(quiz).toHaveLength(1)
    expect(quiz[0]?.choices.length).toBeGreaterThan(1)
  })

  it('returns nothing when every meaning is the same', () => {
    const twin: VocabNote = { ...notes[0], id: 'z', word: 'fleeting' }
    expect(buildQuiz([notes[0], twin], 'word-to-definition', createSeededRandom(5), undefined, ids)).toEqual([])
  })

  it('is stable for the same seed', () => {
    const first = buildQuiz(notes.slice(0, 4), 'word-to-definition', createSeededRandom(9), notes.slice(0, 4), ids)
    const second = buildQuiz(notes.slice(0, 4), 'word-to-definition', createSeededRandom(9), notes.slice(0, 4), ids)
    expect(first.map((question) => question.noteId)).toEqual(second.map((question) => question.noteId))
  })
})

describe('buildExplanation', () => {
  it('explains the word, the context, and the other choices', () => {
    const explanation = buildExplanation(notes[0], [notes[1]])
    expect(explanation.summary).toBe('ephemeral means lasting briefly.')
    expect(explanation.usage).toContain('The joy was ephemeral.')
    expect(explanation.contrasts[0]?.definition).toContain('pragmatic means sensible and realistic.')
    expect(explanation.contrasts[0]?.definition).toContain('different from ephemeral')
  })

  it('notes a missing context sentence', () => {
    expect(buildExplanation(notes[2], []).usage).toMatch(/No context sentence/)
  })
})

describe('buildMeaningQuiz', () => {
  it('asks for the English meaning with exactly four choices', () => {
    const quiz = buildMeaningQuiz(notes.slice(0, 4), createSeededRandom(3), ids)
    expect(quiz.length).toBeGreaterThan(0)
    for (const question of quiz) {
      expect(question.promptLabel).toBe('Word')
      expect(question.choices).toHaveLength(4)
      expect(question.choices.filter((choice) => choice.correct)).toHaveLength(1)
      expect(question.choices.some((choice) => choice.label === question.correctLabel)).toBe(true)
    }
  })

  it('returns nothing until four different meanings are available', () => {
    expect(buildMeaningQuiz(notes.slice(0, 3), createSeededRandom(1), ids)).toEqual([])
  })
})

describe('clampQuizSeconds', () => {
  it('keeps a manual value inside the allowed range', () => {
    expect(clampQuizSeconds(12.4)).toBe(12)
    expect(clampQuizSeconds(1)).toBe(3)
    expect(clampQuizSeconds(400)).toBe(180)
    expect(clampQuizSeconds(Number.NaN)).toBe(15)
  })
})

describe('shuffleQuestions', () => {
  it('keeps the same questions while changing order for a new crunch', () => {
    const original = buildMeaningQuiz(notes.slice(0, 4), createSeededRandom(3), ids)
    const first = shuffleQuestions(original, createSeededRandom(11)).map((question) => question.id)
    const second = shuffleQuestions(original, createSeededRandom(12)).map((question) => question.id)
    expect([...first].sort()).toEqual(original.map((question) => question.id).sort())
    expect(first).not.toEqual(second)
  })
})
