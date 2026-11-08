import { studyLanguageLine } from '../speech/langContext'
import type { QuizQuestion, RevealReason } from '../vocabulary/types'
import { generateContent, type GeminiContent, type GeminiReply } from './client'

export function explanationPrompt(
  question: QuizQuestion,
  reason: Exclude<RevealReason, 'correct'>,
  selectedLabel: string | null,
  lang = 'en-US',
): string {
  const miss = reason === 'timeout'
    ? 'The learner ran out of time before answering.'
    : `The learner chose “${selectedLabel ?? 'a wrong answer'}”.`
  const wrong = question.choices.filter((choice) => !choice.correct).map((choice) => choice.label)
  return `Explain this briefly for a learner.
${studyLanguageLine(lang)}
Prompt: ${question.prompt}
Correct answer: ${question.correctLabel}
Other choices: ${wrong.join('; ') || 'none'}
What happened: ${miss}
Explain it as a tutor for this language: meaning, how speakers actually use it, and a common pitfall or false friend. 2 to 4 sentences. No title and no markdown heading.`
}

export async function explainMiss(
  apiKey: string,
  question: QuizQuestion,
  reason: Exclude<RevealReason, 'correct'>,
  selectedLabel: string | null,
  lang = 'en-US',
  signal?: AbortSignal,
): Promise<GeminiReply> {
  return generateContent(
    apiKey,
    [{ role: 'user', parts: [{ text: explanationPrompt(question, reason, selectedLabel, lang) }] }],
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

export function explainedBy(_model: string, _fallback: boolean): string {
  return 'Explained by Brainy.'
}
