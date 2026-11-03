import { describe, expect, it } from 'vitest'
import { MAX_NOTES } from '../constants'
import { parseVocabularyPaste } from '../parseNotes'

describe('parseVocabularyPaste', () => {
  it('mixes colon lines and two-line pairs, and ignores blank lines', () => {
    const result = parseVocabularyPaste(
      [
        'bonjour: hello',
        '',
        'merci',
        '',
        'thank you',
        '',
        'devant：it\'s in front of you (plural, formal).',
        'chat',
        '',
        'cat',
      ].join('\n'),
    )
    expect(result.notes).toEqual([
      { word: 'bonjour', definition: 'hello', context: '' },
      { word: 'merci', definition: 'thank you', context: '' },
      { word: 'devant', definition: "it's in front of you (plural, formal).", context: '' },
      { word: 'chat', definition: 'cat', context: '' },
    ])
    expect(result.skipped).toBe(0)
    expect(result.truncated).toBe(false)
  })

  it('splits only at the first colon and leaves other punctuation in the meaning', () => {
    const result = parseVocabularyPaste(
      "voici: here it is / here you are, please (formal: polite).\n",
    )
    expect(result.notes).toEqual([
      {
        word: 'voici',
        definition: 'here it is / here you are, please (formal: polite).',
        context: '',
      },
    ])
  })

  it('pairs non-colon lines around a colon line instead of using the colon line as the answer', () => {
    const result = parseVocabularyPaste('merci\nbonjour: hello\nthank you\n')
    expect(result.notes).toEqual([
      { word: 'bonjour', definition: 'hello', context: '' },
      { word: 'merci', definition: 'thank you', context: '' },
    ])
  })

  it('drops an unpaired last line and empty colon sides', () => {
    expect(parseVocabularyPaste('   \n\t\n')).toEqual({ notes: [], skipped: 0, truncated: false })
    const result = parseVocabularyPaste('bonjour\n\nhello\norphan\n: missing word\nword:\n')
    expect(result.notes).toEqual([{ word: 'bonjour', definition: 'hello', context: '' }])
    expect(result.skipped).toBe(3)
  })

  it('accepts windows newlines', () => {
    const result = parseVocabularyPaste('bonjour: hello\r\n\r\nmerci\r\nthank you\r\n')
    expect(result.notes).toEqual([
      { word: 'bonjour', definition: 'hello', context: '' },
      { word: 'merci', definition: 'thank you', context: '' },
    ])
  })

  it('caps a very large paste', () => {
    const lines = Array.from({ length: MAX_NOTES + 5 }, (_, index) => `word${index}: meaning ${index} (plural)`)
    const result = parseVocabularyPaste(lines.join('\n\n'))
    expect(result.notes).toHaveLength(MAX_NOTES)
    expect(result.truncated).toBe(true)
    expect(result.notes[0]).toEqual({ word: 'word0', definition: 'meaning 0 (plural)', context: '' })
  })
})
