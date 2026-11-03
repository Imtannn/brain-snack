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

  it('keeps a complete firestore document and drops a broken one', () => {
    expect(toSavedSnack('abc', {
      ownerId: 'user-1',
      title: 'French bites',
      rawText: 'bonjour: hello',
      seconds: 12,
      createdAt: 10,
      model: 'gemini-2.5-flash',
      questions: [question],
    })?.title).toBe('French bites')
    expect(toSavedSnack('abc', { title: 'Missing questions', ownerId: 'user-1', questions: [] })).toBeNull()
  })
})
