import { beforeEach, describe, expect, it, vi } from 'vitest'

const putSnack = vi.fn()

vi.mock('../../api/client', () => ({
  vaultToken: () => 'tok',
  apiPutSnack: (...args: unknown[]) => putSnack(...args),
  apiListSnacks: async () => [],
  apiDeleteSnack: async () => {},
}))

import { migrateLocalSnacks } from '../store'

describe('migrateLocalSnacks', () => {
  beforeEach(() => {
    localStorage.clear()
    putSnack.mockReset()
  })

  it('uploads leftovers from the old email bag only', async () => {
    localStorage.setItem(
      'brain-snack.snacks.user-a@b.c',
      JSON.stringify([
        {
          id: 'snack-legacy',
          ownerId: 'user-a@b.c',
          title: 'Old notes',
          rawText: 'bonjour: hello',
          seconds: 12,
          createdAt: 1,
          questions: [],
          model: null,
          smartAnswers: false,
        },
      ]),
    )
    localStorage.setItem(
      'brain-snack.snacks.uid-1',
      JSON.stringify([
        {
          id: 'snack-cloud',
          ownerId: 'uid-1',
          title: 'Huge FR review',
          rawText: 'x',
          seconds: 12,
          createdAt: 2,
          questions: Array.from({ length: 20 }, (_, i) => ({ prompt: `q${i}`, answer: `a${i}` })),
          model: 'gemini',
          smartAnswers: false,
        },
      ]),
    )

    await migrateLocalSnacks('uid-1', 'a@b.c')

    expect(putSnack).toHaveBeenCalledTimes(1)
    expect(putSnack.mock.calls[0]?.[0]?.id).toBe('snack-legacy')
    expect(putSnack.mock.calls[0]?.[0]?.ownerId).toBe('uid-1')
  })

  it('skips when there is no leftover email bag', async () => {
    localStorage.setItem(
      'brain-snack.snacks.uid-1',
      JSON.stringify([
        {
          id: 'snack-cloud',
          ownerId: 'uid-1',
          title: 'Vault cache',
          rawText: 'x',
          seconds: 12,
          createdAt: 2,
          questions: [],
          model: null,
          smartAnswers: false,
        },
      ]),
    )
    await migrateLocalSnacks('uid-1', 'a@b.c')
    expect(putSnack).not.toHaveBeenCalled()
  })
})
