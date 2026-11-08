import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiMe, cachedUser, setVaultToken } from '../client'

describe('vault session cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('forgets the cached user when the token is cleared', () => {
    localStorage.setItem('brain-snack.vaultToken', 'abc')
    localStorage.setItem('brain-snack.vaultUser', JSON.stringify({ uid: 'u1', email: 'a@b.c' }))
    expect(cachedUser()?.email).toBe('a@b.c')
    setVaultToken(null)
    expect(cachedUser()).toBeNull()
  })

  it('does not treat an HTML error page as a signed-out response', async () => {
    localStorage.setItem('brain-snack.vaultToken', 'abc')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    )
    await expect(apiMe()).rejects.toThrow(/vault/i)
  })
})
