import { isSpeechLang, SPEECH_LANGS } from './speechLang'

export function speechLangName(lang: string): string {
  if (!isSpeechLang(lang)) return 'English'
  return SPEECH_LANGS.find((item) => item.id === lang)?.label ?? 'English'
}

/** Line for Brainy so lookalike languages (French que vs Spanish qué) stay distinct. */
export function studyLanguageLine(lang: string): string {
  const name = speechLangName(lang)
  const id = isSpeechLang(lang) ? lang : 'en-US'
  return `The study language is ${name} (${id}). Treat every prompt word as ${name}, not a lookalike language. For example, French “que” is not Spanish “qué”.`
}
