import { beforeEach, describe, expect, it } from 'vitest'
import { clearGeminiKey, geminiKeyStorageKey, readGeminiKey, writeGeminiKey } from '../geminiKey'

describe('gemini key storage', () => {
  beforeEach(() => localStorage.clear())

  it('keeps a trimmed key in a slot for that account', () => {
    writeGeminiKey('user-a', '  key-a  ')
    writeGeminiKey('user-b', 'key-b')
    expect(readGeminiKey('user-a')).toBe('key-a')
    expect(readGeminiKey('user-b')).toBe('key-b')
    expect(localStorage.getItem(geminiKeyStorageKey('user-a'))).toBe('key-a')
    clearGeminiKey('user-a')
    expect(readGeminiKey('user-a')).toBe('')
    expect(readGeminiKey('user-b')).toBe('key-b')
  })
})
