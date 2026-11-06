export const PRIMARY_MODEL = 'gemini-2.5-flash'
export const FALLBACK_MODEL = 'gemini-3.8-flash'

export type GeminiPart = { text: string }

export type GeminiContent = {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export type GeminiReply = {
  text: string
  model: string
  fallback: boolean
}

type GeminiApiBody = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string; code?: number }
}

export function isMissingModel(status: number, message: string, errorStatus?: string): boolean {
  if (status === 404 || errorStatus === 'NOT_FOUND') return true
  const lower = message.toLowerCase()
  return (
    lower.includes('not found') ||
    lower.includes('no longer available') ||
    lower.includes('not supported for generatecontent') ||
    lower.includes('unknown model') ||
    lower.includes('invalid model')
  )
}

export function sanitizeGeminiMessage(message: string, apiKey: string): string {
  const trimmed = message.trim()
  const hidden = apiKey ? trimmed.split(apiKey).join('…') : trimmed
  return hidden.slice(0, 400)
}

function endpoint(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

function textFrom(body: GeminiApiBody): string {
  const parts = body.candidates?.[0]?.content?.parts ?? []
  return parts.map((part) => part.text ?? '').join('').trim()
}

async function readBody(response: Response): Promise<{ body: GeminiApiBody; raw: string }> {
  const raw = await response.text()
  if (!raw) return { body: {}, raw: '' }
  try {
    return { body: JSON.parse(raw) as GeminiApiBody, raw }
  } catch {
    return { body: { error: { message: raw.slice(0, 300) } }, raw }
  }
}

export async function generateContent(
  apiKey: string,
  contents: readonly GeminiContent[],
  options?: { json?: boolean; signal?: AbortSignal },
): Promise<GeminiReply> {
  const key = apiKey.trim()
  if (!key) throw new Error('Add a Brainy key in Settings.')
  const models = [PRIMARY_MODEL, FALLBACK_MODEL]
  let lastError = 'Brainy could not answer.'

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index] ?? PRIMARY_MODEL
    const response = await fetch(endpoint(model, key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options?.signal,
      body: JSON.stringify({
        contents,
        generationConfig: options?.json
          ? { responseMimeType: 'application/json', temperature: 0.4 }
          : { temperature: 0.5 },
      }),
    })
    const { body } = await readBody(response)
    if (response.ok) {
      if (body.promptFeedback?.blockReason && !textFrom(body)) {
        throw new Error(`Brainy blocked that request (${body.promptFeedback.blockReason}).`)
      }
      const text = textFrom(body)
      if (!text) throw new Error('Brainy returned an empty response.')
      return { text, model, fallback: model !== PRIMARY_MODEL }
    }
    const message = body.error?.message || `Brainy request failed (${response.status}).`
    lastError = sanitizeGeminiMessage(message, key)
    const missing = index === 0 && isMissingModel(response.status, message, body.error?.status)
    if (missing) continue
    throw new Error(lastError)
  }

  throw new Error(lastError)
}

export function modelNotice(): string {
  return 'Built with Brainy.'
}
