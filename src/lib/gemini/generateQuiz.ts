import { studyLanguageLine } from '../speech/langContext'
import type { QuizQuestion } from '../vocabulary/types'
import { generateContent, type GeminiReply } from './client'
import { questionsFromModelText } from './schema'

export function quizPrompt(rawText: string, lang = 'en-US'): string {
  return `You are Brainy, a flexible study coach. The learner pasted free-form text that may be:
- a clean vocabulary list (word: meaning, or two-line pairs)
- messy study notes or article text
- just a short topic prompt like "French café words"

${studyLanguageLine(lang)} Prefer foreign word → English meaning for this language; otherwise use key terms or facts as question → answer. If they only gave a topic with no list, invent a practical beginner-friendly set in this language.

Figure out what they gave you. Extract the most useful learning points.

Source text:
"""
${rawText}
"""

Return only a JSON array. Each item must match this shape exactly:
{"question":"...","correct_answer":"...","distractors":["...","...","..."]}

Rules:
- Aim for 6–12 items when the source is rich enough; fewer if the source is short; up to 12 for a topic-only prompt.
- "question" is the prompt shown to the learner: a word, term, or short question.
- "correct_answer" is the right meaning or answer.
- "distractors" are exactly 3 tricky, context-aware wrong answers. They must be plausible given the source or topic, must not equal the correct answer, and must not duplicate each other.
- Do not include markdown fences or any text outside the JSON array.`
}

export async function generateQuizFromNotes(
  apiKey: string,
  rawText: string,
  lang = 'en-US',
): Promise<GeminiReply & { questions: QuizQuestion[] }> {
  const reply = await generateContent(
    apiKey,
    [{ role: 'user', parts: [{ text: quizPrompt(rawText, lang) }] }],
    { json: true },
  )
  return { ...reply, questions: questionsFromModelText(reply.text) }
}
