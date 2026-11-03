import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import type { QuizQuestion } from '../vocabulary/types'
import { getFirestoreDb } from '../firebase/config'
import { toSavedSnack, type SavedSnack } from './snackRecord'

export type SnackDraft = {
  title: string
  rawText: string
  seconds: number
  questions: readonly QuizQuestion[]
  model: string | null
}

function snacksCollection(uid: string) {
  return collection(getFirestoreDb(), 'users', uid, 'snacks')
}

export async function saveSnack(uid: string, draft: SnackDraft): Promise<string> {
  const ref = await addDoc(snacksCollection(uid), {
    ownerId: uid,
    title: draft.title,
    rawText: draft.rawText,
    seconds: draft.seconds,
    questions: JSON.parse(JSON.stringify(draft.questions)) as QuizQuestion[],
    model: draft.model,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function listSnacks(uid: string): Promise<SavedSnack[]> {
  const snap = await getDocs(query(snacksCollection(uid), orderBy('createdAt', 'desc')))
  const snacks: SavedSnack[] = []
  for (const item of snap.docs) {
    const snack = toSavedSnack(item.id, item.data())
    if (snack) snacks.push(snack)
  }
  return snacks
}

export async function deleteSnack(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), 'users', uid, 'snacks', id))
}

export function snackErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === 'permission-denied') return 'Firestore blocked that. Publish the snack rules so this account can read and write its own snacks.'
  if (error instanceof Error && error.message) return error.message
  return 'Could not reach Firestore.'
}
