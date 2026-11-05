import { describe, expect, it } from 'vitest'
import type { QuizQuestion } from '../../vocabulary/types'
import { explanationPrompt } from '../tutor'

const question: QuizQuestion = {
  id: 'q1',
  noteId: 'n1',
  promptLabel: 'Word',
  prompt: 'ephemeral',
  correctLabel: 'lasting briefly',
  choices: [
    { id: 'a', label: 'lasting briefly', correct: true },
    { id: 'b', label: 'sensible and realistic', correct: false },
  ],
  explanation: { summary: 'ephemeral means lasting briefly.', usage: '', contrasts: [] },
}

describe('tutor helpers', () => {
  it('asks for a short explanation of a miss', () => {
    const prompt = explanationPrompt(question, 'wrong', 'sensible and realistic')
    expect(prompt).toContain('ephemeral')
    expect(prompt).toContain('lasting briefly')
    expect(prompt).toContain('sensible and realistic')
  })
})
