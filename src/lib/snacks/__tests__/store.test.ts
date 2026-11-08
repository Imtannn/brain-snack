import { beforeEach, describe, expect, it } from 'vitest'
import { deleteSnack, listSnacks, saveSnack, updateSnack } from '../store'

describe('snack store without cloud config', () => {
  beforeEach(() => localStorage.clear())

  it('saves and lists snacks for that account', async () => {
    const id = await saveSnack('user-a', {
      title: 'FR - Review',
      rawText: 'bonjour: hello',
      seconds: 12,
      questions: [],
      model: null,
    })
    const snacks = await listSnacks('user-a')
    expect(snacks).toHaveLength(1)
    expect(snacks[0]?.id).toBe(id)
    expect(snacks[0]?.title).toBe('FR - Review')
    expect(await listSnacks('user-b')).toEqual([])
    await updateSnack('user-a', id, { title: 'FR — Café' })
    expect((await listSnacks('user-a'))[0]?.title).toBe('FR — Café')
    await deleteSnack('user-a', id)
    expect(await listSnacks('user-a')).toEqual([])
  })
})
