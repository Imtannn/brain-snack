import type { QuizChoice, QuizQuestion } from '../vocabulary/types'

export type SavedSnack = {
  id: string
  ownerId: string
  title: string
  rawText: string
  seconds: number
  createdAt: number
  questions: QuizQuestion[]
  model: string | null
  smartAnswers: boolean
}

export function snackTitle(rawText: string): string {
  const line = rawText
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.length > 0) ?? ''
  const head = line.split(/[:：]/)[0]?.trim() ?? ''
  const title = head || 'Untitled snack'
  return title.length > 80 ? `${title.slice(0, 77)}…` : title
}

export function toSavedSnack(id: string, data: unknown): SavedSnack | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const questions = questionsFrom(record.questions)
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const rawText = typeof record.rawText === 'string' ? record.rawText : ''
  const ownerId = typeof record.ownerId === 'string' ? record.ownerId : ''
  const seconds = typeof record.seconds === 'number' && Number.isFinite(record.seconds) ? record.seconds : 15
  const createdAt = typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0
  const model = typeof record.model === 'string' ? record.model : null
  const smartAnswers = record.smartAnswers === true
  if (!title || !ownerId) return null
  if (questions.length === 0 && rawText.trim().length === 0) return null
  return { id, ownerId, title, rawText, seconds, createdAt, questions, model, smartAnswers }
}

function questionsFrom(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return []
  return value.filter(isQuestion)
}

function isQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== 'object') return false
  const question = value as Partial<QuizQuestion>
  if (typeof question.id !== 'string' || typeof question.prompt !== 'string') return false
  if (typeof question.correctLabel !== 'string' || !Array.isArray(question.choices)) return false
  if (question.choices.length === 0 || question.choices.some((choice) => !isChoice(choice))) return false
  if (!question.explanation || typeof question.explanation !== 'object') return false
  return typeof question.explanation.summary === 'string'
}

function isChoice(value: unknown): value is QuizChoice {
  if (!value || typeof value !== 'object') return false
  const choice = value as Partial<QuizChoice>
  return typeof choice.id === 'string' && typeof choice.label === 'string' && typeof choice.correct === 'boolean'
}
