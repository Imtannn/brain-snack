import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRIMARY_MODEL } from '../client'
import {
  generateQuizFromNotes,
  isVocabListPaste,
  listQuizPrompt,
  quizPrompt,
  VOCAB_LIST_CHUNK,
} from '../generateQuiz'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>()
  return { ...actual, generateContent: vi.fn() }
})

import { generateContent } from '../client'

const generateContentMock = vi.mocked(generateContent)

function pair(index: number): string {
  return `word${index}: meaning ${index}`
}

function list(count: number): string {
  return Array.from({ length: count }, (_, index) => pair(index)).join('\n')
}

function geminiItem(question: string, answer: string) {
  return {
    question,
    correct_answer: answer,
    distractors: [`wrong-${question}-a`, `wrong-${question}-b`, `wrong-${question}-c`],
  }
}

function reply(items: unknown[]) {
  return { text: JSON.stringify(items), model: PRIMARY_MODEL, fallback: false }
}

describe('quizPrompt', () => {
  it('tells Brainy the study language so lookalikes stay distinct', () => {
    const prompt = quizPrompt('que: that / what', 'fr-FR')
    expect(prompt).toContain('French (fr-FR)')
    expect(prompt).toContain('que: that / what')
    expect(prompt).not.toContain('Spanish (Mexico)')
  })

  it('keeps a pasted list instead of capping at a dozen items', () => {
    const prompt = quizPrompt(list(30), 'fr-FR')
    expect(prompt).toContain('Keep the full list')
    expect(prompt).not.toMatch(/Aim for 6[–-]12/)
    expect(prompt).toContain('invent 8–12')
  })
})

describe('listQuizPrompt', () => {
  it('asks for exactly as many objects as pasted pairs', () => {
    const notes = Array.from({ length: 12 }, (_, index) => ({
      word: `word${index}`,
      definition: `meaning ${index}`,
      context: '',
    }))
    const prompt = listQuizPrompt(notes, 'fr-FR')
    expect(prompt).toContain('exactly 12 objects')
    expect(prompt).toContain('Do not drop, merge, skip')
    expect(prompt).toContain('French (fr-FR)')
    expect(prompt).toContain('word11 → meaning 11')
  })
})

describe('isVocabListPaste', () => {
  it('treats a colon vocabulary list as a list to keep', () => {
    expect(isVocabListPaste(list(30))).toBe(true)
  })

  it('does not treat a topic prompt as a vocabulary list', () => {
    expect(isVocabListPaste('French café words')).toBe(false)
  })
})

describe('generateQuizFromNotes', () => {
  beforeEach(() => {
    generateContentMock.mockReset()
  })

  it('keeps every pasted pair even when Brainy returns a short first chunk', async () => {
    const count = VOCAB_LIST_CHUNK + 2
    generateContentMock
      .mockResolvedValueOnce(
        reply(Array.from({ length: 6 }, (_, index) => geminiItem(`word${index}`, `meaning ${index}`))),
      )
      .mockResolvedValueOnce(
        reply([geminiItem(`word${VOCAB_LIST_CHUNK}`, `meaning ${VOCAB_LIST_CHUNK}`)]),
      )

    const result = await generateQuizFromNotes('test-key', list(count), 'fr-FR')
    expect(generateContentMock).toHaveBeenCalledTimes(2)
    expect(result.questions).toHaveLength(count)
    expect(result.questions.map((question) => question.prompt)).toEqual(
      Array.from({ length: count }, (_, index) => `word${index}`),
    )
    expect(result.questions[0]?.choices.some((choice) => choice.label === 'wrong-word0-a')).toBe(true)
    expect(result.questions[6]?.correctLabel).toBe('meaning 6')
  })

  it('sends topic-only text through the open-ended prompt', async () => {
    generateContentMock.mockResolvedValueOnce(reply([geminiItem('café', 'coffee shop')]))
    const result = await generateQuizFromNotes('test-key', 'French café words', 'fr-FR')
    expect(generateContentMock).toHaveBeenCalledTimes(1)
    const body = String(generateContentMock.mock.calls[0]?.[0] ?? '')
    expect(body).toBe('test-key')
    const contents = generateContentMock.mock.calls[0]?.[1]
    const prompt = contents?.[0]?.parts[0]?.text ?? ''
    expect(prompt).toContain('French café words')
    expect(prompt).toContain('Keep the full list')
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0]?.prompt).toBe('café')
  })
})
