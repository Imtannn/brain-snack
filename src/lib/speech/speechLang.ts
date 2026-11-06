export const SPEECH_LANGS = [
  { id: 'ar-SA', label: 'Arabic' },
  { id: 'zh-HK', label: 'Cantonese' },
  { id: 'zh-CN', label: 'Chinese (Mandarin)' },
  { id: 'da-DK', label: 'Danish' },
  { id: 'nl-NL', label: 'Dutch' },
  { id: 'en-US', label: 'English' },
  { id: 'fi-FI', label: 'Finnish' },
  { id: 'fr-FR', label: 'French' },
  { id: 'de-DE', label: 'German' },
  { id: 'el-GR', label: 'Greek' },
  { id: 'it-IT', label: 'Italian' },
  { id: 'ja-JP', label: 'Japanese' },
  { id: 'ko-KR', label: 'Korean' },
  { id: 'pl-PL', label: 'Polish' },
  { id: 'pt-BR', label: 'Portuguese (Brazil)' },
  { id: 'pt-PT', label: 'Portuguese (Portugal)' },
  { id: 'ru-RU', label: 'Russian' },
  { id: 'es-MX', label: 'Spanish (Mexico)' },
  { id: 'es-ES', label: 'Spanish (Spain)' },
  { id: 'sv-SE', label: 'Swedish' },
] as const

export type SpeechLang = (typeof SPEECH_LANGS)[number]['id']

const STORAGE_KEY = 'brain-snack.speechLang'

export function isSpeechLang(value: string): value is SpeechLang {
  return SPEECH_LANGS.some((item) => item.id === value)
}

export function readSpeechLang(): SpeechLang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ''
    if (isSpeechLang(stored)) return stored
  } catch {
    // Private mode can block storage. English is the default.
  }
  return 'en-US'
}

export function writeSpeechLang(lang: SpeechLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // The in-memory selection still applies for this visit.
  }
}
