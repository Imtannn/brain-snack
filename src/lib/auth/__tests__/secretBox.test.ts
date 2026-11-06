import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from '../secretBox'

describe('secret box', () => {
  it('round-trips a Gemini key for a uid', async () => {
    const packed = await encryptSecret('uid-ruby', 'AIza-test-key')
    expect(packed.iv).toBeTruthy()
    expect(packed.ct).toBeTruthy()
    expect(await decryptSecret('uid-ruby', packed)).toBe('AIza-test-key')
    await expect(decryptSecret('uid-other', packed)).rejects.toBeTruthy()
  })
})
