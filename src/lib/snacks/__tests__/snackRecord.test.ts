import { describe, expect, it } from 'vitest'
import type { QuizQuestion } from '../../vocabulary/types'
import { snackTitle, toSavedSnack } from '../snackRecord'

const question: QuizQuestion = {
  id: 'q1',
  noteId: 'n1',
  promptLabel: 'Word',
  prompt: 'bonjour',
  correctLabel: 'hello',
  choices: [{ id: 'c1', label: 'hello', correct: true }],
  explanation: { summary: 'bonjour means hello.', usage: '', contrasts: [] },
}

describe('saved snack records', () => {
  it('names a snack from the first pasted line', () => {
    expect(snackTitle("l'éclair: flash of lightning\nle vent: breeze")).toBe("l'éclair")
    expect(snackTitle('   \n')).toBe('Untitled snack')
  })

  it('keeps a finished quiz and a named list, and drops an empty record', () => {
    expect(toSavedSnack('abc', {
      ownerId: 'user-1',
      title: 'French bites',
      rawText: 'bonjour: hello',
      seconds: 12,
      createdAt: 10,
      model: 'gemini-2.5-flash',
      questions: [question],
    })?.title).toBe('French bites')
    expect(toSavedSnack('list', {
      ownerId: 'user-1',
      title: 'Café',
      rawText: 'bonjour: hello',
      seconds: 15,
      questions: [],
      smartAnswers: true,
    })?.smartAnswers).toBe(true)
    expect(toSavedSnack('abc', { title: 'Missing questions', ownerId: 'user-1', questions: [] })).toBeNull()
  })

  it('keeps a study language on the snack', () => {
    expect(toSavedSnack('lang', {
      ownerId: 'user-1',
      title: 'Café',
      rawText: 'que: what',
      seconds: 15,
      questions: [],
      speechLang: 'fr-FR',
    })?.speechLang).toBe('fr-FR')
  })
})

