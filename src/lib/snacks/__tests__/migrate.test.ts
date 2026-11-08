import { beforeEach, describe, expect, it, vi } from 'vitest'

const putSnack = vi.fn()
const listSnacks = vi.fn()

vi.mock('../../api/client', () => ({
  vaultToken: () => 'tok',
  apiPutSnack: (...args: unknown[]) => putSnack(...args),
  apiListSnacks: () => listSnacks(),
  apiDeleteSnack: async () => {},
}))

import { migrateLocalSnacks } from '../store'

function snackRow(id: string, title: string, ownerId: string) {
  return {
    id,
    ownerId,
    title,
    rawText: 'bonjour: hello',
    seconds: 12,
    createdAt: 1,
    questions: [],
    model: null,
    smartAnswers: false,
  }
}

describe('migrateLocalSnacks', () => {
  beforeEach(() => {
    localStorage.clear()
    putSnack.mockReset()
    listSnacks.mockReset()
    listSnacks.mockResolvedValue([] as { id: string }[])
  })

  it('does not re-upload when the vault already has snacks', async () => {
    listSnacks.mockResolvedValue([snackRow('already', 'Live', 'uid-1')])
    localStorage.setItem('brain-snack.snacks.user-a@b.c', JSON.stringify([snackRow('snack-legacy', 'Old notes', 'user-a@b.c')]))
    localStorage.setItem('brain-snack.snacks.uid-1', JSON.stringify([snackRow('snack-cloud', 'Vault cache', 'uid-1')]))
    await migrateLocalSnacks('uid-1', 'a@b.c')
    expect(putSnack).not.toHaveBeenCalled()
  })

  it('restores local leftovers only when the vault is empty', async () => {
    localStorage.setItem('brain-snack.snacks.user-a@b.c', JSON.stringify([snackRow('snack-legacy', 'Old notes', 'user-a@b.c')]))
    localStorage.setItem('brain-snack.snacks.uid-1', JSON.stringify([snackRow('snack-cloud', 'Vault cache', 'uid-1')]))
    await migrateLocalSnacks('uid-1', 'a@b.c')
    expect(putSnack.mock.calls.map((call) => call[0]?.id).sort()).toEqual(['snack-cloud', 'snack-legacy'])
    expect(putSnack.mock.calls.every((call) => call[0]?.ownerId === 'uid-1')).toBe(true)
  })
})
