import { uid } from '../core/uid'
import { apiDeleteSnack, apiListSnacks, apiPutSnack } from '../api/client'
import { accountId } from '../auth/localAccounts'
import { toSavedSnack, type SavedSnack } from './snackRecord'
import type { SnackDraft } from './types'

const storageKey = (userId: string) => `brain-snack.snacks.${userId}`

function readAllLocal(userId: string): SavedSnack[] {
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

function writeAllLocal(userId: string, snacks: readonly SavedSnack[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(snacks))
}

function cacheLocal(userId: string, snacks: readonly SavedSnack[]) {
  try {
    writeAllLocal(userId, snacks)
  } catch {
    // Private mode can block storage. Cloud is the source of truth.
  }
}

function isVaultOffline(error: unknown): boolean {
  return error instanceof Error && /offline|not configured|Vault database/i.test(error.message)
}

async function upsertCloud(snack: SavedSnack): Promise<void> {
  try {
    await apiPutSnack(snack)
  } catch (err) {
    if (isVaultOffline(err)) return
    throw err
  }
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
    smartAnswers: draft.smartAnswers === true,
    createdAt: Date.now(),
  })
  if (!snack) throw new Error('Could not save that snack.')
  await upsertCloud(snack)
  cacheLocal(userId, [snack, ...readAllLocal(userId).filter((item) => item.id !== id)])
  return id
}

export async function updateSnack(
  userId: string,
  id: string,
  patch: Partial<Pick<SavedSnack, 'questions' | 'model' | 'smartAnswers' | 'rawText' | 'seconds' | 'title'>>,
): Promise<void> {
  const listed = await listSnacks(userId)
  const current = listed.find((snack) => snack.id === id)
  if (!current) return
  const next = toSavedSnack(id, { ...current, ...patch, ownerId: userId })
  if (!next) throw new Error('Could not save that snack.')
  await upsertCloud(next)
  cacheLocal(
    userId,
    listed.map((snack) => (snack.id === id ? next : snack)),
  )
}

export async function listSnacks(userId: string): Promise<SavedSnack[]> {
  try {
    const rows = await apiListSnacks()
    const snacks: SavedSnack[] = []
    for (const row of rows) {
      const snack = toSavedSnack(row.id, row)
      if (snack) snacks.push(snack)
    }
    cacheLocal(userId, snacks)
    return snacks
  } catch {
    return readAllLocal(userId).sort((a, b) => b.createdAt - a.createdAt)
  }
}

export async function deleteSnack(userId: string, id: string): Promise<void> {
  try {
    await apiDeleteSnack(id)
  } catch (err) {
    if (!isVaultOffline(err)) throw err
  }
  cacheLocal(userId, readAllLocal(userId).filter((snack) => snack.id !== id))
}

export async function migrateLocalSnacks(userId: string, email: string): Promise<void> {
  const legacyId = accountId(email)
  if (legacyId === userId) return
  const legacy = readAllLocal(legacyId)
  if (legacy.length === 0) return
  const existing = await listSnacks(userId)
  if (existing.length > 0) return
  for (const snack of legacy) {
    const next = toSavedSnack(snack.id, { ...snack, ownerId: userId })
    if (!next) continue
    try {
      await upsertCloud(next)
    } catch {
      // Keep local copy if the vault is still coming up.
    }
  }
  cacheLocal(
    userId,
    legacy.map((snack) => ({ ...snack, ownerId: userId })),
  )
}

export function snackErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Could not save that snack on this browser.'
}
