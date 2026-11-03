import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import { VocabularyPage } from '../VocabularyPage'

const LIST = [
  'bonjour: hello',
  '',
  'merci',
  '',
  'thank you',
  '',
  'devant',
  '',
  "it's in front of you (plural, formal)",
  '',
  'chat: cat',
].join('\n')

describe('VocabularyPage', () => {
  beforeEach(() => localStorage.clear())

  it('turns a pasted word list into a meaning quiz', () => {
    render(
      <ThemeProvider>
        <VocabularyPage />
      </ThemeProvider>,
    )
    fireEvent.change(screen.getByLabelText(/Vocabulary list/), { target: { value: LIST } })
    fireEvent.change(screen.getByLabelText(/Seconds per question/), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }))
    expect(screen.getByText('Choose the English meaning')).toBeTruthy()
    expect(screen.getByText("it's in front of you (plural, formal)")).toBeTruthy()
    expect(screen.queryByText("it's in front of you (plural")).toBeNull()
    expect(screen.queryByText('formal)')).toBeNull()
    const choices = document.querySelectorAll('.vocab-choice')
    expect(choices).toHaveLength(4)
    const choice = choices[0]
    if (!choice) throw new Error('expected a choice')
    fireEvent.click(choice)
    expect(screen.getByText(/The English meaning is/)).toBeTruthy()
    expect(screen.getByText(/means/)).toBeTruthy()
    const revealed = screen.queryByText('Not quite') || screen.queryByText('Correct')
    expect(revealed).toBeTruthy()
  })

  it('stays on the list when there are not enough pairs', () => {
    render(
      <ThemeProvider>
        <VocabularyPage />
      </ThemeProvider>,
    )
    fireEvent.change(screen.getByLabelText(/Vocabulary list/), {
      target: { value: 'bonjour - hello\nmerci - thank you\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }))
    expect(screen.getByText(/Paste at least 4 pairs/)).toBeTruthy()
    expect(screen.queryByText('Choose the English meaning')).toBeNull()
  })
})
