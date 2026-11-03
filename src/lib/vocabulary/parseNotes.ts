import { MAX_NOTES } from './constants'
import type { ParsedNote } from './types'

export type ParseResult = {
  notes: ParsedNote[]
  skipped: number
  truncated: boolean
}

const EMPTY: ParseResult = { notes: [], skipped: 0, truncated: false }

/** Standard colon or full-width colon. The first one on a line splits that line. */
const COLON = /[:：]/

/**
 * Blank lines are removed. A line with a colon is one pair, split at the first colon.
 * A line without a colon is paired with the next line that also has no colon.
 * A leftover line is ignored. Parentheses, slashes, commas, and periods stay as pasted.
 */
export function parseVocabularyPaste(text: string): ParseResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) return EMPTY

  const notes: ParsedNote[] = []
  let skipped = 0
  let pending = ''
  for (const line of lines) {
    const colon = colonPair(line)
    if (colon) {
      if (colon.word && colon.definition) notes.push(colon)
      else skipped += 1
      continue
    }
    if (!pending) {
      pending = line
      continue
    }
    notes.push({ word: pending, definition: line, context: '' })
    pending = ''
  }
  if (pending) skipped += 1

  return {
    notes: notes.slice(0, MAX_NOTES),
    skipped,
    truncated: notes.length > MAX_NOTES,
  }
}

function colonPair(line: string): ParsedNote | null {
  const index = line.search(COLON)
  if (index === -1) return null
  return {
    word: line.slice(0, index).trim(),
    definition: line.slice(index + 1).trim(),
    context: '',
  }
}
