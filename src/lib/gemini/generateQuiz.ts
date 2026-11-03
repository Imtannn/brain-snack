import type { QuizQuestion } from '../vocabulary/types'
import { generateContent, type GeminiReply } from './client'
import { questionsFromModelText } from './schema'

export function quizPrompt(rawText: string): string {
  return `You extract study material and write a multiple-choice quiz.

Source text:
"""
${rawText}
"""

Return only a JSON array. Each item must match this shape exactly:
{"question":"...","correct_answer":"...","distractors":["...","...","..."]}

Rules:
- Extract the knowledge or vocabulary actually present in the source.
- "question" is the prompt shown to the learner: a word, term, or short question.
- "correct_answer" is the right meaning or answer.
- "distractors" are exactly 3 tricky, context-aware wrong answers. They must be plausible given the source, must not equal the correct answer, and must not duplicate each other.
- Do not include markdown fences or any text outside the JSON array.`
}

export async function generateQuizFromNotes(
  apiKey: string,
  rawText: string,
): Promise<GeminiReply & { questions: QuizQuestion[] }> {
  const reply = await generateContent(
    apiKey,
    [{ role: 'user', parts: [{ text: quizPrompt(rawText) }] }],
    { json: true },
  )
  return { ...reply, questions: questionsFromModelText(reply.text) }
}
