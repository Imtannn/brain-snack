import { beforeEach, describe, expect, it } from 'vitest'
import { deletePack, deleteSnack, listPacks, listSnacks, savePack, saveSnack, updatePack, updateSnack } from '../store'

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

  it('groups snacks in a pack without deleting them', async () => {
    const aller = await saveSnack('user-a', {
      title: 'ALLER',
      rawText: 'aller: to go',
      seconds: 12,
      questions: [],
      model: null,
    })
    const avoir = await saveSnack('user-a', {
      title: 'AVOIR',
      rawText: 'avoir: to have',
      seconds: 12,
      questions: [],
      model: null,
    })
    const packId = await savePack('user-a', 'French verbs', [aller, avoir])
    const packs = await listPacks('user-a')
    expect(packs).toHaveLength(1)
    expect(packs[0]?.title).toBe('French verbs')
    expect(packs[0]?.snackIds).toEqual([aller, avoir])
    await updatePack('user-a', packId, { title: 'Verbs' })
    expect((await listPacks('user-a'))[0]?.title).toBe('Verbs')
    await deleteSnack('user-a', aller)
    expect((await listPacks('user-a'))[0]?.snackIds).toEqual([avoir])
    expect(await listSnacks('user-a')).toHaveLength(1)
    await deletePack('user-a', packId)
    expect(await listPacks('user-a')).toEqual([])
    expect(await listSnacks('user-a')).toHaveLength(1)
  })
})
