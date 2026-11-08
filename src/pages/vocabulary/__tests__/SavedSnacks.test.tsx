import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import { SavedSnacks } from '../SavedSnacks'

const listSnacks = vi.fn()
const listPacks = vi.fn()
const savePack = vi.fn()
const updatePack = vi.fn()
const deletePack = vi.fn()
const deleteSnack = vi.fn()
const updateSnack = vi.fn()

vi.mock('../../../lib/snacks/store', () => ({
  listSnacks: () => listSnacks(),
  listPacks: () => listPacks(),
  savePack: (...args: unknown[]) => savePack(...args),
  updatePack: (...args: unknown[]) => updatePack(...args),
  deletePack: (...args: unknown[]) => deletePack(...args),
  deleteSnack: (...args: unknown[]) => deleteSnack(...args),
  updateSnack: (...args: unknown[]) => updateSnack(...args),
  snackErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'error'),
}))

function snack(id: string, title: string) {
  return {
    id,
    ownerId: 'user-a',
    title,
    rawText: `${id}: ${title}`,
    seconds: 12,
    createdAt: 1,
    questions: [
      {
        id: `q-${id}`,
        noteId: `n-${id}`,
        promptLabel: 'Word',
        prompt: id,
        correctLabel: title,
        choices: [{ id: `c-${id}`, label: title, correct: true }],
        explanation: { summary: `${id} means ${title}.`, usage: '', contrasts: [] },
      },
    ],
    model: null,
    smartAnswers: false,
  }
}

describe('SavedSnacks packs', () => {
  beforeEach(() => {
    listSnacks.mockReset()
    listPacks.mockReset()
    savePack.mockReset()
    listSnacks.mockResolvedValue([snack('aller', 'ALLER'), snack('avoir', 'AVOIR')])
    listPacks.mockResolvedValue([])
    savePack.mockResolvedValue('pack-1')
  })

  it('creates a pack from checked snacks', async () => {
    const onRestudy = vi.fn()
    render(
      <ThemeProvider>
        <SavedSnacks uid="user-a" onRestudy={onRestudy} />
      </ThemeProvider>,
    )
    await screen.findByText('ALLER')
    fireEvent.click(screen.getByRole('button', { name: 'New pack' }))
    fireEvent.change(screen.getByLabelText('Pack name'), { target: { value: 'French verbs' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /ALLER/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /AVOIR/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create pack' }))
    await waitFor(() => expect(savePack).toHaveBeenCalledWith('user-a', 'French verbs', ['aller', 'avoir']))
    expect(await screen.findByText('French verbs')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Crunch pack' }))
    expect(onRestudy).toHaveBeenCalled()
    expect(onRestudy.mock.calls[0]?.[0]?.title).toBe('French verbs')
    expect(onRestudy.mock.calls[0]?.[0]?.questions).toHaveLength(2)
  })
})
