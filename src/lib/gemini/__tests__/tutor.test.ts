import { describe, expect, it } from 'vitest'
import type { QuizQuestion } from '../../vocabulary/types'
import { explanationPrompt, tutorFileError } from '../tutor'

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

  it('accepts images and text, and rejects oversized or other files', () => {
    expect(tutorFileError({ name: 'note.txt', type: 'text/plain', size: 20 })).toBeNull()
    expect(tutorFileError({ name: 'pic.png', type: 'image/png', size: 20 })).toBeNull()
    expect(tutorFileError({ name: 'sheet.csv', type: '', size: 20 })).toBeNull()
    expect(tutorFileError({ name: 'deck.pdf', type: 'application/pdf', size: 20 })).toMatch(/image or a text/)
    expect(tutorFileError({ name: 'big.png', type: 'image/png', size: 5 * 1024 * 1024 })).toMatch(/4 MB/)
  })
})
