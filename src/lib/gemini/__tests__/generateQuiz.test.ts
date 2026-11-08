import { describe, expect, it } from 'vitest'
import { quizPrompt } from '../generateQuiz'

describe('quizPrompt', () => {
  it('tells Brainy the study language so lookalikes stay distinct', () => {
    const prompt = quizPrompt('que: that / what', 'fr-FR')
    expect(prompt).toContain('French (fr-FR)')
    expect(prompt).toContain('que: that / what')
    expect(prompt).not.toContain('Spanish (Mexico)')
  })
})
