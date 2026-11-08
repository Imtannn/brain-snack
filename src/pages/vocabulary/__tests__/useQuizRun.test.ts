import { describe, expect, it } from 'vitest'
import type { SavedSnack } from '../../../lib/snacks/snackRecord'
import type { QuizQuestion } from '../../../lib/vocabulary/types'
import { savedQuestionsToReplay } from '../useQuizRun'

const question: QuizQuestion = {
  id: 'q1',
  noteId: 'n1',
  promptLabel: 'Word',
  prompt: 'bonjour',
  correctLabel: 'hello',
  choices: [
    { id: 'c1', label: 'hello', correct: true },
    { id: 'c2', label: 'bye', correct: false },
  ],
  explanation: { summary: 'bonjour means hello.', usage: '', contrasts: [] },
}

const snack: SavedSnack = {
  id: 'snack-1',
  ownerId: 'user-a',
  title: 'FR - Review',
  rawText: 'bonjour: hello',
  seconds: 15,
  createdAt: 1,
  questions: [question],
  model: 'gemini',
  smartAnswers: true,
}

describe('savedQuestionsToReplay', () => {
  it('reuses the saved set when Crunch Again has not changed the list', () => {
    expect(savedQuestionsToReplay(snack, 'bonjour: hello')?.[0]?.id).toBe('q1')
  })

  it('does not reuse questions when the paste is a new list', () => {
    expect(savedQuestionsToReplay(snack, 'merci: thank you')).toBeNull()
  })

  it('does not call for a list that was saved before the first generate', () => {
    expect(savedQuestionsToReplay({ ...snack, questions: [] }, 'bonjour: hello')).toBeNull()
  })
})
