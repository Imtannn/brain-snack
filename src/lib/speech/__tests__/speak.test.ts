import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  hasPremiumVoices,
  loadVoices,
  pickDeviceVoice,
  resetSpeechEngineForTests,
  sanitizeSpeechText,
} from '../speak'
import { isSpeechLang, readSpeechLang, SPEECH_LANGS, writeSpeechLang } from '../speechLang'

describe('speech voices', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetSpeechEngineForTests()
  })

  it('strips markdown and punctuation before speaking', () => {
    expect(sanitizeSpeechText('**Entschuldigung** (excuse / me)')).toBe('Entschuldigung excuse me')
    expect(sanitizeSpeechText("l'éclair")).toBe("l'éclair")
  })

  it('ranks Google, premium, and cloud voices above the first local voice', () => {
    const french = pickDeviceVoice(
      [
        { name: 'Thomas', lang: 'fr-FR', localService: true, voiceURI: 'thomas' },
        { name: 'Amélie', lang: 'fr-CA', localService: true, voiceURI: 'amelie' },
        { name: 'Google français', lang: 'fr-FR', localService: false, voiceURI: 'google-fr' },
      ] as SpeechSynthesisVoice[],
      'fr-FR',
    )
    const german = pickDeviceVoice(
      [
        { name: 'Anna', lang: 'de-DE', localService: true, voiceURI: 'anna' },
        { name: 'Microsoft Hedda', lang: 'de-DE', localService: false, voiceURI: 'hedda' },
      ] as SpeechSynthesisVoice[],
      'de-DE',
    )
    const premium = pickDeviceVoice(
      [
        { name: 'Thomas', lang: 'fr-FR', localService: true, voiceURI: 'com.apple.voice.compact.fr-FR.Thomas' },
        { name: 'Thomas Premium', lang: 'fr-FR', localService: true, voiceURI: 'com.apple.voice.premium.fr-FR.Thomas' },
      ] as SpeechSynthesisVoice[],
      'fr-FR',
    )
    const japanese = pickDeviceVoice(
      [
        { name: 'Kyoko', lang: 'ja-JP', localService: true, voiceURI: 'kyoko' },
        { name: 'Google 日本語', lang: 'ja-JP', localService: false, voiceURI: 'google-ja' },
      ] as SpeechSynthesisVoice[],
      'ja-JP',
    )
    const localGerman = pickDeviceVoice(
      [
        { name: 'Anna', lang: 'de-DE', localService: true, voiceURI: 'Anna' },
        { name: 'Eddy (German (Germany))', lang: 'de-DE', localService: true, voiceURI: 'Eddy (German (Germany))' },
      ] as SpeechSynthesisVoice[],
      'de-DE',
    )
    expect(french?.name).toBe('Google français')
    expect(german?.name).toBe('Microsoft Hedda')
    expect(localGerman?.name).toBe('Eddy (German (Germany))')
    expect(premium?.name).toBe('Thomas Premium')
    expect(japanese?.name).toBe('Google 日本語')
  })

  it('waits for voiceschanged instead of locking the first local list', async () => {
    resetSpeechEngineForTests()
    const listeners = new Set<() => void>()
    let voices: SpeechSynthesisVoice[] = [
      { name: 'Thomas', lang: 'fr-FR', localService: true, voiceURI: 'thomas' } as SpeechSynthesisVoice,
    ]
    vi.stubGlobal('speechSynthesis', {
      speaking: false,
      pending: false,
      getVoices: () => voices,
      addEventListener: (_type: string, fn: () => void) => {
        listeners.add(fn)
      },
      removeEventListener: (_type: string, fn: () => void) => {
        listeners.delete(fn)
      },
      cancel: () => {},
      speak: () => {},
      set onvoiceschanged(_fn: (() => void) | null) {},
    })
    const pending = loadVoices()
    voices = [
      ...voices,
      { name: 'Google français', lang: 'fr-FR', localService: false, voiceURI: 'google-fr' } as SpeechSynthesisVoice,
    ]
    listeners.forEach((fn) => fn())
    const loaded = await pending
    expect(hasPremiumVoices(loaded)).toBe(true)
    expect(pickDeviceVoice(loaded, 'fr-FR')?.name).toBe('Google français')
  })

  it('remembers the header language and defaults to English', () => {
    localStorage.clear()
    expect(readSpeechLang()).toBe('en-US')
    writeSpeechLang('ja-JP')
    expect(readSpeechLang()).toBe('ja-JP')
    writeSpeechLang('pt-BR')
    expect(readSpeechLang()).toBe('pt-BR')
    localStorage.setItem('brain-snack.speechLang', 'xx-XX')
    expect(readSpeechLang()).toBe('en-US')
    expect(isSpeechLang('es-MX')).toBe(true)
    expect(isSpeechLang('ar-SA')).toBe(true)
    expect(SPEECH_LANGS.find((item) => item.id === 'el-GR')?.label).toBe('Greek')
    expect(SPEECH_LANGS.find((item) => item.id === 'pt-BR')?.label).toBe('Portuguese (Brazil)')
  })
})
