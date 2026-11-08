import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuizQuestion } from '../../../lib/vocabulary/types'
import { VocabularyQuiz } from '../VocabularyQuiz'

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    noteId: 'a',
    promptLabel: 'Word',
    prompt: 'ephemeral',
    correctLabel: 'lasting briefly',
    choices: [
      { id: 'wrong', label: 'sensible and realistic', correct: false },
      { id: 'right', label: 'lasting briefly', correct: true },
    ],
    explanation: {
      summary: 'ephemeral means lasting briefly.',
      usage: 'In context: The joy was ephemeral.',
      contrasts: [
        {
          word: 'pragmatic',
          definition: 'pragmatic means sensible and realistic. That is different from ephemeral.',
        },
      ],
    },
  },
  {
    id: 'q2',
    noteId: 'b',
    promptLabel: 'Word',
    prompt: 'pragmatic',
    correctLabel: 'sensible and realistic',
    choices: [
      { id: 'wrong2', label: 'lasting briefly', correct: false },
      { id: 'right2', label: 'sensible and realistic', correct: true },
    ],
    explanation: {
      summary: 'pragmatic means sensible and realistic.',
      usage: 'In context: A pragmatic fix.',
      contrasts: [],
    },
  },
]

describe('VocabularyQuiz', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the correct answer and a detailed explanation when the choice is wrong', () => {
    render(<VocabularyQuiz questions={questions} seconds={30} lang="en-US" onFinish={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /sensible and realistic/i }))
    expect(screen.getByText('Not quite')).toBeTruthy()
    expect(screen.getByText(/The English meaning is “lasting briefly”/)).toBeTruthy()
    expect(screen.getByText('ephemeral means lasting briefly.')).toBeTruthy()
    expect(screen.queryByText('Next question')).toBeTruthy()
  })

  it('continues with Enter or Space once the next button is visible', () => {
    const onFinish = vi.fn()
    render(<VocabularyQuiz questions={questions} seconds={30} lang="en-US" onFinish={onFinish} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByText('ephemeral')).toBeTruthy()
    expect(screen.queryByText('pragmatic')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /sensible and realistic/i }))
    expect(screen.getByRole('button', { name: 'Next question' })).toBeTruthy()
    const space = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true, repeat: true })
    act(() => {
      window.dispatchEvent(space)
    })
    expect(space.defaultPrevented).toBe(true)
    expect(screen.queryByText('pragmatic')).toBeNull()

    const next = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
    act(() => {
      window.dispatchEvent(next)
    })
    expect(next.defaultPrevented).toBe(true)
    expect(screen.getByText('pragmatic')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /lasting briefly/i }))
    expect(screen.getByRole('button', { name: 'See results' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('shows the explanation when the timer reaches zero', () => {
    vi.useFakeTimers()
    render(<VocabularyQuiz questions={questions} seconds={3} lang="en-US" onFinish={() => {}} />)
    act(() => {
      vi.advanceTimersByTime(3100)
    })
    expect(screen.getByText('Time is up')).toBeTruthy()
    expect(screen.getByText(/The timer ran out/)).toBeTruthy()
    expect(screen.getByText(/The English meaning is “lasting briefly”/)).toBeTruthy()
    expect(screen.getByText('ephemeral means lasting briefly.')).toBeTruthy()
  })
})
