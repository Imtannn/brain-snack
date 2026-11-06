import { describe, expect, it } from 'vitest'
import { accountId } from '../localAccounts'

describe('legacy local account ids', () => {
  it('normalizes email into the old localStorage user id', () => {
    expect(accountId('Ruby@Example.com')).toBe('user-ruby@example.com')
  })
})
