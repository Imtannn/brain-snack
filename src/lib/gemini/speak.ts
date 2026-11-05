import { sanitizeGeminiMessage } from './client'

export const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
/** One fixed Brainy voice — never rotate. */
export const BRAINY_VOICE = 'Kore'
/** Preferred device voices, first match wins for the whole session. */
const DEVICE_VOICE_PREFS = ['Samantha', 'Google US English', 'Microsoft Aria', 'Alex', 'Karen']

type AudioPart = {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
}

type TtsBody = {
  candidates?: Array<{ content?: { parts?: AudioPart[] } }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string; code?: number }
}

export type SpeakResult = {
  source: 'brainy' | 'device'
  model?: string
}

function endpoint(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

function parseMimeRate(mimeType: string): number {
  const match = mimeType.match(/rate=(\d+)/i)
  return match ? Number(match[1]) : 24000
}

/** Build a WAV blob from raw little-endian 16-bit PCM. */
export function pcmToWav(pcm: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const channels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize = pcm.byteLength

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const wav = new Uint8Array(44 + dataSize)
  wav.set(new Uint8Array(header), 0)
  wav.set(pcm, 44)
  return new Blob([bytesForBlob(wav)], { type: 'audio/wav' })
}

function bytesForBlob(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
}

export function decodeBase64(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function audioBlobFromInline(mimeType: string, data: string): Blob {
  const bytes = decodeBase64(data)
  const mime = mimeType.trim() || 'audio/wav'
  if (/L16|pcm/i.test(mime)) return pcmToWav(bytes, parseMimeRate(mime))
  return new Blob([bytesForBlob(bytes)], { type: mime.split(';')[0] || 'audio/wav' })
}

function firstAudioPart(body: TtsBody): { mimeType: string; data: string } | null {
  const parts = body.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    const data = part.inlineData?.data?.trim()
    const mimeType = part.inlineData?.mimeType?.trim() ?? ''
    if (data) return { mimeType, data }
  }
  return null
}

async function fetchTtsAudio(
  apiKey: string,
  text: string,
  model: string,
  signal?: AbortSignal,
): Promise<{ blob: Blob; model: string }> {
  const response = await fetch(endpoint(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Say exactly this word or short phrase once, clearly:\n${text}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: BRAINY_VOICE },
          },
        },
      },
    }),
  })
  const raw = await response.text()
  let body: TtsBody = {}
  try {
    body = raw ? (JSON.parse(raw) as TtsBody) : {}
  } catch {
    body = { error: { message: raw.slice(0, 300) } }
  }
  if (!response.ok) {
    const message = body.error?.message || `Brainy speech failed (${response.status}).`
    throw Object.assign(new Error(sanitizeGeminiMessage(message, apiKey)), {
      status: response.status,
      errorStatus: body.error?.status,
    })
  }
  if (body.promptFeedback?.blockReason) {
    throw new Error(`Brainy blocked that pronunciation (${body.promptFeedback.blockReason}).`)
  }
  const audio = firstAudioPart(body)
  if (!audio) throw new Error('Brainy returned no audio.')
  return { blob: audioBlobFromInline(audio.mimeType, audio.data), model }
}

export function guessSpeechLang(_text: string): string {
  // One language tag so the browser does not hop voices between words.
  return 'en-US'
}

let lockedDeviceVoice: SpeechSynthesisVoice | null | undefined

export function pickDeviceVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (lockedDeviceVoice) return lockedDeviceVoice
  for (const name of DEVICE_VOICE_PREFS) {
    const hit = voices.find((voice) => voice.name === name)
    if (hit) {
      lockedDeviceVoice = hit
      return hit
    }
  }
  const en = voices.find((voice) => /^en(-|_)/i.test(voice.lang)) ?? voices[0] ?? null
  lockedDeviceVoice = en
  return en
}

export function speakWithDevice(text: string): SpeakResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    throw new Error('This browser cannot speak yet.')
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.92
  const voice = pickDeviceVoice(window.speechSynthesis.getVoices())
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang || 'en-US'
  }
  window.speechSynthesis.speak(utterance)
  return { source: 'device' }
}

let activeAudio: HTMLAudioElement | null = null

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    activeAudio = null
  }
}

export async function speakWord(
  text: string,
  options?: { apiKey?: string | null; signal?: AbortSignal },
): Promise<SpeakResult> {
  const word = text.trim()
  if (!word) throw new Error('Nothing to pronounce.')
  stopSpeaking()

  const key = options?.apiKey?.trim()
  if (key) {
    // Stay on Brainy’s single voice — do not silently swap to the device voice.
    const { blob, model: used } = await fetchTtsAudio(key, word, TTS_MODEL, options?.signal)
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    activeAudio = audio
    audio.onended = () => {
      URL.revokeObjectURL(url)
      if (activeAudio === audio) activeAudio = null
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      if (activeAudio === audio) activeAudio = null
    }
    await audio.play()
    return { source: 'brainy', model: used }
  }

  return speakWithDevice(word)
}
