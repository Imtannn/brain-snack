import { randomUnit } from '../core/clock'
import { uid } from '../core/uid'
import { DEFAULT_SECONDS, MAX_SECONDS, MIN_SECONDS, QUIZ_CHOICE_COUNT } from './constants'
import type { QuizChoice, QuizDirection, QuizExplanation, QuizQuestion, VocabNote } from './types'

export type QuizIds = {
  question: () => string
  choice: () => string
}

export function clampQuizSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SECONDS
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(value)))
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = items.slice()
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

/** Fresh question and choice order for Crunch Again, without changing the saved snack. */
export function shuffleQuestions(
  questions: readonly QuizQuestion[],
  random: () => number = randomUnit,
): QuizQuestion[] {
  return shuffle(questions, random).map((question) => ({
    ...question,
    choices: shuffle(question.choices, random),
  }))
}

/** Word prompt, four English meanings, distractors taken only from the pasted list. */
export function buildMeaningQuiz(
  prompts: readonly VocabNote[],
  random: () => number = randomUnit,
  ids?: QuizIds,
): QuizQuestion[] {
  return buildQuiz(prompts, 'word-to-definition', random, undefined, ids).filter(
    (question) => question.choices.length === QUIZ_CHOICE_COUNT,
  )
}

export function buildQuiz(
  prompts: readonly VocabNote[],
  direction: QuizDirection,
  random: () => number = randomUnit,
  pool?: readonly VocabNote[],
  ids?: QuizIds,
): QuizQuestion[] {
  const source = prompts.filter(hasMeaning)
  const bank = (pool && pool.length > 0 ? pool : source).filter(hasMeaning)
  const idSource: QuizIds = ids ?? { question: () => uid('q'), choice: () => uid('c') }
  const questions: QuizQuestion[] = []
  for (const note of shuffle(source, random)) {
    const question = buildQuestion(note, bank, direction, random, idSource)
    if (question) questions.push(question)
  }
  return questions
}

export function buildExplanation(note: VocabNote, distractors: readonly VocabNote[]): QuizExplanation {
  const summary = `${note.word} means ${asClause(note.definition)}`
  const context = note.context.trim()
  const usage = context
    ? `In context: ${withPeriod(context)}`
    : 'No context sentence was saved for this word.'
  return {
    summary,
    usage,
    contrasts: distractors.map((other) => ({
      word: other.word,
      definition: `${other.word} means ${asClause(other.definition)} That is different from ${note.word}.`,
    })),
  }
}

function buildQuestion(
  note: VocabNote,
  pool: readonly VocabNote[],
  direction: QuizDirection,
  random: () => number,
  ids: QuizIds,
): QuizQuestion | null {
  const correctLabel = choiceText(note, direction).trim()
  if (!correctLabel) return null
  const seen = new Set<string>([correctLabel.toLowerCase()])
  const distractors: VocabNote[] = []
  for (const other of shuffle(pool.filter((item) => item.id !== note.id), random)) {
    const label = choiceText(other, direction).trim()
    if (!label || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    distractors.push(other)
    if (distractors.length === QUIZ_CHOICE_COUNT - 1) break
  }
  if (distractors.length === 0) return null
  const choices: QuizChoice[] = shuffle(
    [
      { id: ids.choice(), label: correctLabel, correct: true },
      ...distractors.map((item) => ({
        id: ids.choice(),
        label: choiceText(item, direction).trim(),
        correct: false,
      })),
    ],
    random,
  )
  return {
    id: ids.question(),
    noteId: note.id,
    promptLabel: direction === 'word-to-definition' ? 'Word' : 'Definition',
    prompt: direction === 'word-to-definition' ? note.word : note.definition,
    correctLabel,
    choices,
    explanation: buildExplanation(note, distractors),
  }
}

function choiceText(note: VocabNote, direction: QuizDirection): string {
  return direction === 'word-to-definition' ? note.definition : note.word
}

function hasMeaning(note: VocabNote): boolean {
  return note.word.trim().length > 0 && note.definition.trim().length > 0
}

function asClause(text: string): string {
  return lowerFirst(withPeriod(text))
}

function withPeriod(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function lowerFirst(text: string): string {
  if (text.length < 2) return text
  const second = text[1]
  if (second === second.toLowerCase() && text[0] !== text[0].toLowerCase()) {
    return text[0].toLowerCase() + text.slice(1)
  }
  return text
}
