import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeLoginCode,
  findAccount,
  hashPassword,
  issueLoginCode,
  readSession,
  sessionFor,
  upsertAccount,
  writeSession,
} from '../localAccounts'

describe('local sign-in', () => {
  beforeEach(() => localStorage.clear())

  it('creates a session for an email code and rejects a reused code', () => {
    const code = issueLoginCode('Ruby@Example.com')
    expect(code).toMatch(/^\d{6}$/)
    expect(consumeLoginCode('ruby@example.com', code)).toBe(true)
    expect(consumeLoginCode('ruby@example.com', code)).toBe(false)
  })

  it('accepts the first password and rejects a different one later', async () => {
    const email = 'ruby@drippy3d.com'
    upsertAccount({ email, passwordHash: await hashPassword('correct-horse'), name: 'Ruby' })
    const saved = findAccount(email)
    expect(saved?.passwordHash).toBe(await hashPassword('correct-horse'))
    expect(saved?.passwordHash).not.toBe(await hashPassword('wrong-horse'))
    writeSession(sessionFor(email, 'Ruby'))
    expect(readSession()?.uid).toBe('user-ruby@drippy3d.com')
  })
})
