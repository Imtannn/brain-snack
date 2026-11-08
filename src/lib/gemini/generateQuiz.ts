import { studyLanguageLine } from '../speech/langContext'
import { parseVocabularyPaste } from '../vocabulary/parseNotes'
import type { ParsedNote, QuizQuestion } from '../vocabulary/types'
import { generateContent, type GeminiReply } from './client'
import {
  asGeneratedItem,
  extractJson,
  questionsFromGeneratedItems,
  questionsFromModelText,
  type GeneratedItem,
} from './schema'

/** Brainy writes distractors in slices so a long list is not truncated. */
export const VOCAB_LIST_CHUNK = 10
const BRAINY_CHUNK_LIMIT = 8
const BRAINY_CALL_LIMIT = 3

const VOCAB_WORD_MAX = 48

export function quizPrompt(rawText: string, lang = 'en-US'): string {
  return `You are Brainy, a flexible study coach. The learner pasted free-form text that may be:
- a clean vocabulary list (word: meaning, or two-line pairs)
- messy study notes or article text
- just a short topic prompt like "French café words"

${studyLanguageLine(lang)} Prefer foreign word → English meaning for this language; otherwise use key terms or facts as question → answer. If they only gave a topic with no list, invent a practical beginner-friendly set in this language.

Figure out what they gave you. Extract every useful learning point. Do not sample or skip items from a list they already wrote.

Source text:
"""
${rawText}
"""

Return only a JSON array. Each item must match this shape exactly:
{"question":"...","correct_answer":"...","distractors":["...","...","..."]}

Rules:
- If they pasted a vocabulary list or notes with distinct items, return one object per item. Keep the full list. Do not cap, merge, or drop entries.
- If they only gave a topic with no list, invent 8–12 practical beginner-friendly items in this language.
- "question" is the prompt shown to the learner: a word, term, or short question.
- "correct_answer" is the right meaning or answer.
- "distractors" are exactly 3 tricky, context-aware wrong answers. They must be plausible given the source or topic, must not equal the correct answer, and must not duplicate each other.
- Do not include markdown fences or any text outside the JSON array.`
}

export function listQuizPrompt(notes: readonly ParsedNote[], lang = 'en-US'): string {
  const pairs = notes.map((note, index) => `${index + 1}. ${note.word} → ${note.definition}`).join('\n')
  return `You are Brainy. The learner already listed these vocabulary pairs. Keep every pair. Do not drop, merge, skip, add, or rewrite the word or the correct meaning. Only write better wrong answers.

${studyLanguageLine(lang)}

Pairs:
"""
${pairs}
"""

Return only a JSON array with exactly ${notes.length} objects, same order:
{"question":"...","correct_answer":"...","distractors":["...","...","..."]}

Rules:
- "question" must be the given word/term, unchanged.
- "correct_answer" must be the given meaning, unchanged.
- "distractors" are exactly 3 tricky, context-aware wrong answers. They must be plausible, must not equal the correct answer, and must not duplicate each other.
- Do not include markdown fences or any text outside the JSON array.`
}

export function isVocabListPaste(text: string, parsed = parseVocabularyPaste(text)): boolean {
  if (parsed.notes.length === 0) return false
  const vocabLike = parsed.notes.filter((note) => note.word.length <= VOCAB_WORD_MAX).length
  if (vocabLike < parsed.notes.length) return false
  const lines = nonemptyLines(text)
  return parsed.notes.length * 2 >= lines.length - parsed.skipped
}

export async function generateQuizFromNotes(
  apiKey: string,
  rawText: string,
  lang = 'en-US',
): Promise<GeminiReply & { questions: QuizQuestion[] }> {
  const parsed = parseVocabularyPaste(rawText)
  if (isVocabListPaste(rawText, parsed)) {
    return generateFromVocabList(apiKey, parsed.notes, lang)
  }
  const reply = await generateContent(
    apiKey,
    [{ role: 'user', parts: [{ text: quizPrompt(rawText, lang) }] }],
    { json: true },
  )
  return { ...reply, questions: questionsFromModelText(reply.text) }
}

async function generateFromVocabList(
  apiKey: string,
  notes: readonly ParsedNote[],
  lang: string,
): Promise<GeminiReply & { questions: QuizQuestion[] }> {
  const aiNotes = notes.slice(0, VOCAB_LIST_CHUNK * BRAINY_CHUNK_LIMIT)
  const leftover = notes.slice(aiNotes.length)
  const chunks = chunkNotes(aiNotes, VOCAB_LIST_CHUNK)
  const settled = await mapSettled(chunks, BRAINY_CALL_LIMIT, (chunk) =>
    generateContent(
      apiKey,
      [{ role: 'user', parts: [{ text: listQuizPrompt(chunk, lang) }] }],
      { json: true },
    ),
  )

  const firstOk = settled.find((result) => result.status === 'fulfilled')
  if (!firstOk || firstOk.status !== 'fulfilled') {
    const failed = settled.find((result) => result.status === 'rejected')
    if (failed && failed.status === 'rejected') throw failed.reason
    throw new Error('Brainy could not build this snack.')
  }

  const items: GeneratedItem[] = []
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index] ?? []
    const result = settled[index]
    const generated = result?.status === 'fulfilled' ? itemsFromModelText(result.value.text) : []
    items.push(...alignChunk(chunk, generated, notes))
  }
  for (const note of leftover) {
    const item = localItem(note, notes)
    if (item) items.push(item)
  }

  if (items.length === 0) {
    throw new Error('Brainy did not return any usable questions. Try clearer notes or a topic.')
  }

  return { ...firstOk.value, questions: questionsFromGeneratedItems(items) }
}

function itemsFromModelText(raw: string): GeneratedItem[] {
  try {
    const parsed = extractJson(raw)
    if (!Array.isArray(parsed)) return []
    const items: GeneratedItem[] = []
    for (const entry of parsed) {
      const item = asGeneratedItem(entry)
      if (item) items.push(item)
    }
    return items
  } catch {
    return []
  }
}

function alignChunk(
  chunk: readonly ParsedNote[],
  generated: readonly GeneratedItem[],
  pool: readonly ParsedNote[],
): GeneratedItem[] {
  const remaining = generated.slice()
  const items: GeneratedItem[] = []
  for (let index = 0; index < chunk.length; index += 1) {
    const note = chunk[index]
    if (!note) continue
    const matchIndex = takeMatch(note, remaining, index, chunk.length)
    const match = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : undefined
    const item = keepNote(note, match, pool)
    if (item) items.push(item)
  }
  return items
}

function takeMatch(
  note: ParsedNote,
  remaining: readonly GeneratedItem[],
  index: number,
  chunkLength: number,
): number {
  const word = normalize(note.word)
  const meaning = normalize(note.definition)
  const exact = remaining.findIndex(
    (item) => normalize(item.question) === word && normalize(item.correct_answer) === meaning,
  )
  if (exact >= 0) return exact
  const byWord = remaining.findIndex((item) => normalize(item.question) === word)
  if (byWord >= 0) return byWord
  if (remaining.length === chunkLength - index) return 0
  return -1
}

function keepNote(
  note: ParsedNote,
  generated: GeneratedItem | undefined,
  pool: readonly ParsedNote[],
): GeneratedItem | null {
  const meaning = normalize(note.definition)
  if (generated && generated.distractors.every((text) => normalize(text) !== meaning)) {
    return {
      question: note.word,
      correct_answer: note.definition,
      distractors: generated.distractors,
    }
  }
  return localItem(note, pool)
}

function localItem(note: ParsedNote, pool: readonly ParsedNote[]): GeneratedItem | null {
  const seen = new Set<string>([normalize(note.definition)])
  const distractors: string[] = []
  for (const other of pool) {
    const text = other.definition.trim()
    if (!text || seen.has(normalize(text))) continue
    seen.add(normalize(text))
    distractors.push(text)
    if (distractors.length === 3) break
  }
  const [first, second, third] = distractors
  if (!first || !second || !third) return null
  return { question: note.word, correct_answer: note.definition, distractors: [first, second, third] }
}

function chunkNotes(notes: readonly ParsedNote[], size: number): ParsedNote[][] {
  const chunks: ParsedNote[][] = []
  for (let index = 0; index < notes.length; index += size) {
    chunks.push(notes.slice(index, index + size))
  }
  return chunks
}

function nonemptyLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function mapSettled<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      const item = items[index]
      if (item === undefined) continue
      try {
        results[index] = { status: 'fulfilled', value: await fn(item) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }
  const workers = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}
