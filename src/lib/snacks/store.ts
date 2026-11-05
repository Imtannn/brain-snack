import { uid } from '../core/uid'
import { toSavedSnack, type SavedSnack } from './snackRecord'
import type { SnackDraft } from './types'

/** Per-account snack vault: title, timestamp, and the exact quiz JSON. */

const storageKey = (userId: string) => `brain-snack.snacks.${userId}`

function readAll(userId: string): SavedSnack[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const snacks: SavedSnack[] = []
    for (const item of parsed) {
      const id = item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' ? item.id : ''
      const snack = toSavedSnack(id, item)
      if (snack) snacks.push(snack)
    }
    return snacks
  } catch {
    return []
  }
}

function writeAll(userId: string, snacks: readonly SavedSnack[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(snacks))
}

export async function saveSnack(userId: string, draft: SnackDraft): Promise<string> {
  const id = uid('snack')
  const snack = toSavedSnack(id, {
    ownerId: userId,
    title: draft.title,
    rawText: draft.rawText,
    seconds: draft.seconds,
    questions: draft.questions,
    model: draft.model,
    createdAt: Date.now(),
  })
  if (!snack) throw new Error('Could not save that snack.')
  writeAll(userId, [snack, ...readAll(userId)])
  return id
}

export async function listSnacks(userId: string): Promise<SavedSnack[]> {
  return readAll(userId).sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteSnack(userId: string, id: string): Promise<void> {
  writeAll(userId, readAll(userId).filter((snack) => snack.id !== id))
}

export function snackErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Could not save that snack on this browser.'
}
