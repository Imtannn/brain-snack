import { uid } from '../core/uid'
import { DEFAULT_SECONDS } from '../vocabulary/constants'
import { parseVocabularyPaste } from '../vocabulary/parseNotes'
import { buildMeaningQuiz, shuffleQuestions } from '../vocabulary/quiz'
import type { QuizQuestion, VocabNote } from '../vocabulary/types'
import type { SavedSnack } from './snackRecord'

export type SavedPack = {
  id: string
  ownerId: string
  title: string
  snackIds: string[]
  createdAt: number
}

export function toSavedPack(id: string, data: unknown): SavedPack | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const ownerId = typeof record.ownerId === 'string' ? record.ownerId : ''
  if (!title || !ownerId) return null
  const createdAt = typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0
  return { id, ownerId, title, snackIds: uniqueIds(record.snackIds), createdAt }
}

export function packMembers(pack: SavedPack, snacks: readonly SavedSnack[]): SavedSnack[] {
  const byId = new Map(snacks.map((snack) => [snack.id, snack]))
  const members: SavedSnack[] = []
  for (const id of pack.snackIds) {
    const snack = byId.get(id)
    if (snack) members.push(snack)
  }
  return members
}

export function unfiledSnacks(snacks: readonly SavedSnack[], packs: readonly SavedPack[]): SavedSnack[] {
  const packed = new Set<string>()
  for (const pack of packs) {
    for (const id of pack.snackIds) packed.add(id)
  }
  return snacks.filter((snack) => !packed.has(snack.id))
}

export function dropSnackFromPacks(packs: readonly SavedPack[], snackId: string): SavedPack[] {
  return packs.map((pack) =>
    pack.snackIds.includes(snackId)
      ? { ...pack, snackIds: pack.snackIds.filter((id) => id !== snackId) }
      : pack,
  )
}

export function questionsForPack(snacks: readonly SavedSnack[]): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const leftoverNotes: VocabNote[] = []
  for (const snack of snacks) {
    if (snack.questions.length > 0) {
      questions.push(...snack.questions.map(freshQuestion))
      continue
    }
    leftoverNotes.push(...notesFromPaste(snack.rawText))
  }
  if (leftoverNotes.length > 0) {
    questions.push(...buildMeaningQuiz(leftoverNotes).map(freshQuestion))
  }
  return questions
}

export function snackFromPack(pack: SavedPack, snacks: readonly SavedSnack[]): SavedSnack | null {
  const members = packMembers(pack, snacks)
  const questions = questionsForPack(members)
  if (questions.length === 0) return null
  const seconds = members.reduce((max, snack) => Math.max(max, snack.seconds), DEFAULT_SECONDS)
  const speechLang = members.find((snack) => snack.speechLang)?.speechLang
  const rawText = members.map((snack) => snack.rawText.trim()).filter(Boolean).join('\n\n')
  return {
    id: `pack-play-${pack.id}`,
    ownerId: pack.ownerId,
    title: pack.title,
    rawText: rawText || pack.title,
    seconds,
    createdAt: pack.createdAt,
    questions: shuffleQuestions(questions),
    model: null,
    smartAnswers: false,
    speechLang,
  }
}

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const ids: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string' || !entry || seen.has(entry)) continue
    seen.add(entry)
    ids.push(entry)
  }
  return ids
}

function notesFromPaste(text: string): VocabNote[] {
  const notes: VocabNote[] = []
  for (const note of parseVocabularyPaste(text).notes) {
    const word = note.word.trim()
    const definition = note.definition.trim()
    if (!word || !definition) continue
    notes.push({ id: uid('note'), word, definition, context: '' })
  }
  return notes
}

function freshQuestion(question: QuizQuestion): QuizQuestion {
  return {
    ...question,
    id: uid('q'),
    choices: question.choices.map((choice) => ({ ...choice, id: uid('c') })),
  }
}
