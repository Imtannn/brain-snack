import type { QuizQuestion, RevealReason } from '../vocabulary/types'
import { generateContent, type GeminiContent, type GeminiReply } from './client'

export const MAX_TUTOR_FILE_BYTES = 4 * 1024 * 1024

export function tutorFileError(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (file.size > MAX_TUTOR_FILE_BYTES) return 'That file is larger than 4 MB.'
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  const allowed = type.startsWith('image/') || type.startsWith('text/') || /\.(txt|md|csv|json)$/.test(name)
  if (!allowed) return 'Attach an image or a text file.'
  return null
}

export function explanationPrompt(
  question: QuizQuestion,
  reason: Exclude<RevealReason, 'correct'>,
  selectedLabel: string | null,
): string {
  const miss = reason === 'timeout'
    ? 'The learner ran out of time before answering.'
    : `The learner chose “${selectedLabel ?? 'a wrong answer'}”.`
  const wrong = question.choices.filter((choice) => !choice.correct).map((choice) => choice.label)
  return `Explain this briefly for a learner.
Prompt: ${question.prompt}
Correct answer: ${question.correctLabel}
Other choices: ${wrong.join('; ') || 'none'}
What happened: ${miss}
Write 2 to 4 sentences about the concept. No title and no markdown heading.`
}

export async function explainMiss(
  apiKey: string,
  question: QuizQuestion,
  reason: Exclude<RevealReason, 'correct'>,
  selectedLabel: string | null,
  signal?: AbortSignal,
): Promise<GeminiReply> {
  return generateContent(
    apiKey,
    [{ role: 'user', parts: [{ text: explanationPrompt(question, reason, selectedLabel) }] }],
    { signal },
  )
}

export async function continueTutorChat(
  apiKey: string,
  contents: readonly GeminiContent[],
  signal?: AbortSignal,
): Promise<GeminiReply> {
  return generateContent(apiKey, contents, { signal })
}

export function explainedBy(model: string, fallback: boolean): string {
  if (fallback) return `gemini-1.5-flash was unavailable, so this explanation used ${model}.`
  return `Explained by ${model}.`
}
