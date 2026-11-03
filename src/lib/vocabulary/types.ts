export type VocabNote = {
  id: string
  word: string
  definition: string
  context: string
}

export type ParsedNote = {
  word: string
  definition: string
  context: string
}

export type QuizDirection = 'word-to-definition' | 'definition-to-word'

export type QuizContrast = {
  word: string
  definition: string
}

export type QuizExplanation = {
  summary: string
  usage: string
  contrasts: QuizContrast[]
}

export type QuizChoice = {
  id: string
  label: string
  correct: boolean
}

export type QuizQuestion = {
  id: string
  noteId: string
  promptLabel: string
  prompt: string
  correctLabel: string
  choices: QuizChoice[]
  explanation: QuizExplanation
}

export type RevealReason = 'correct' | 'wrong' | 'timeout'

export type AnswerRecord = {
  questionId: string
  correct: boolean
  reason: RevealReason
  selectedLabel: string | null
}

export type QuizPhase = 'question' | 'revealed'

export type QuizSessionState = {
  questions: readonly QuizQuestion[]
  index: number
  phase: QuizPhase
  revealReason: RevealReason | null
  selectedChoiceId: string | null
  remainingAtRevealMs: number | null
  answers: AnswerRecord[]
  startedAtPerf: number
  limitMs: number
}
