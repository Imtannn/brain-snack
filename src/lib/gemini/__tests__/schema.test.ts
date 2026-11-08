import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '../../core/clock'
import { asGeneratedItem, questionsFromGeneratedItems, questionsFromModelText } from '../schema'

const item = {
  question: 'l’éclair',
  correct_answer: 'flash of lightning',
  distractors: ['ocean wave', 'evening sunset', 'garden butterfly'] as [string, string, string],
}

describe('questionsFromModelText', () => {
  it('maps generated items onto four quiz choices', () => {
    const questions = questionsFromGeneratedItems([item], createSeededRandom(2))
    expect(questions).toHaveLength(1)
    expect(questions[0]?.prompt).toBe('l’éclair')
    expect(questions[0]?.choices).toHaveLength(4)
  })

  it('maps a strict JSON array onto four quiz choices', () => {
    const questions = questionsFromModelText(JSON.stringify([item]), createSeededRandom(2))
    expect(questions).toHaveLength(1)
    expect(questions[0]?.prompt).toBe('l’éclair')
    expect(questions[0]?.correctLabel).toBe('flash of lightning')
    expect(questions[0]?.choices).toHaveLength(4)
    expect(questions[0]?.choices.filter((choice) => choice.correct)).toHaveLength(1)
    expect(questions[0]?.explanation.summary).toBe('l’éclair means flash of lightning.')
  })

  it('strips a json fence and skips items without three distinct distractors', () => {
    const raw = '```json\n[{"question":"star","correct_answer":"étoile","distractors":["wave","wave","shore"]},{"question":"wind","correct_answer":"breeze","distractors":["wave","shore","leaf"]}]\n```'
    const questions = questionsFromModelText(raw, createSeededRandom(1))
    expect(questions.map((question) => question.prompt)).toEqual(['wind'])
  })

  it('rejects text that is not a JSON array', () => {
    expect(() => questionsFromModelText('not json')).toThrow(/JSON array/)
    expect(() => questionsFromModelText('{"question":"only one"}')).toThrow(/JSON array/)
  })

  it('drops duplicate and blank distractors', () => {
    expect(asGeneratedItem({
      question: 'cat',
      correct_answer: 'chat',
      distractors: ['chat', ' ', 'dog', 'bird', 'fish'],
    })).toEqual({
      question: 'cat',
      correct_answer: 'chat',
      distractors: ['dog', 'bird', 'fish'],
    })
  })
})
