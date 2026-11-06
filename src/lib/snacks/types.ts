import type { QuizQuestion } from '../vocabulary/types'

export type SnackDraft = {
  title: string
  rawText: string
  seconds: number
  questions: readonly QuizQuestion[]
  model: string | null
  /** When true, Crunch Again of a question-less snack asks Brainy once. */
  smartAnswers?: boolean
}
