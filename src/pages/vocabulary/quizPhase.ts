import type { AnswerRecord, QuizQuestion } from '../../lib/vocabulary/types'

export type QuizRun = {
  runId: string
  questions: QuizQuestion[]
  seconds: number
  rawText: string
  pro: boolean
  model: string | null
}

export type VocabPhase =
  | { kind: 'input' }
  | ({ kind: 'quiz' } & QuizRun)
  | ({ kind: 'done'; answers: AnswerRecord[] } & Omit<QuizRun, 'runId'>)
