import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SpeechLangProvider } from '../../../lib/speech/SpeechLangProvider'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import { VocabularyPage } from '../VocabularyPage'

function renderPage() {
  return render(
    <ThemeProvider>
      <SpeechLangProvider>
        <VocabularyPage />
      </SpeechLangProvider>
    </ThemeProvider>,
  )
}

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
    renderPage()
    fireEvent.change(screen.getByLabelText(/Paste anything/), { target: { value: LIST } })
    fireEvent.change(screen.getByLabelText('This list is in'), { target: { value: 'fr-FR' } })
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
    renderPage()
    fireEvent.change(screen.getByLabelText(/Paste anything/), {
      target: { value: 'bonjour - hello\nmerci - thank you\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }))
    expect(screen.getByText(/Need at least 4 word: meaning pairs/)).toBeTruthy()
    expect(screen.queryByText('Choose the English meaning')).toBeNull()
  })
})
