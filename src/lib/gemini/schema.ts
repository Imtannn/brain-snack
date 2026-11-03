import { randomUnit } from '../core/clock'
import { uid } from '../core/uid'
import { shuffle, type QuizIds } from '../vocabulary/quiz'
import type { QuizChoice, QuizQuestion } from '../vocabulary/types'

export type GeneratedItem = {
  question: string
  correct_answer: string
  distractors: [string, string, string]
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const body = (fenced?.[1] ?? trimmed).trim()
  try {
    return JSON.parse(body)
  } catch {
    const start = body.indexOf('[')
    const end = body.lastIndexOf(']')
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1))
    throw new Error('Gemini returned text that was not a JSON array.')
  }
}

export function asGeneratedItem(value: unknown): GeneratedItem | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const question = stringField(record.question)
  const correct = stringField(record.correct_answer)
  if (!question || !correct || !Array.isArray(record.distractors)) return null
  const seen = new Set<string>([correct.toLowerCase()])
  const distractors: string[] = []
  for (const entry of record.distractors) {
    const text = stringField(entry)
    if (!text || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    distractors.push(text)
    if (distractors.length === 3) break
  }
  const [first, second, third] = distractors
  if (!first || !second || !third) return null
  return { question, correct_answer: correct, distractors: [first, second, third] }
}

function withPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

export function questionsFromModelText(
  raw: string,
  random: () => number = randomUnit,
  ids?: QuizIds,
): QuizQuestion[] {
  const parsed = extractJson(raw)
  if (!Array.isArray(parsed)) throw new Error('Gemini returned text that was not a JSON array.')
  const idSource: QuizIds = ids ?? { question: () => uid('q'), choice: () => uid('c') }
  const questions: QuizQuestion[] = []
  for (const entry of parsed) {
    const item = asGeneratedItem(entry)
    if (!item) continue
    questions.push(toQuizQuestion(item, random, idSource))
  }
  return questions
}

function toQuizQuestion(item: GeneratedItem, random: () => number, ids: QuizIds): QuizQuestion {
  const choices: QuizChoice[] = shuffle(
    [
      { id: ids.choice(), label: item.correct_answer, correct: true },
      ...item.distractors.map((label) => ({ id: ids.choice(), label, correct: false })),
    ],
    random,
  )
  return {
    id: ids.question(),
    noteId: uid('note'),
    promptLabel: 'Word',
    prompt: item.question,
    correctLabel: item.correct_answer,
    choices,
    explanation: {
      summary: `${item.question} means ${withPeriod(item.correct_answer)}`,
      usage: '',
      contrasts: [],
    },
  }
}
