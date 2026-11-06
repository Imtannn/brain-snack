const NOVELTY =
  /albert|bahh|bad news|bells|boing|bubbles|cellos|deranged|good news|jester|junior|kathy|pipe organ|trinoids|whisper|zarvox|wobble|superstar|fred|ralph/i

const PREMIUM = /google|\bnatural\b|\bonline\b|premium|enhanced/i

const VOICE_WAIT_MS = 2500

export function sanitizeSpeechText(text: string): string {
  return text
    .replace(/\*\*|[*_~`#>]+/g, ' ')
    .replace(/[/\\()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeLang(lang: string): string {
  return lang.trim().replace('_', '-').toLowerCase()
}

export function isPremiumVoice(voice: SpeechSynthesisVoice): boolean {
  const blob = `${voice.name} ${voice.voiceURI ?? ''}`
  return PREMIUM.test(blob) || voice.localService === false
}

export function hasPremiumVoices(voices: readonly SpeechSynthesisVoice[]): boolean {
  return voices.some(isPremiumVoice)
}

export function pickDeviceVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const wanted = normalizeLang(lang || 'en-US')
  const prefix = wanted.split('-')[0] ?? ''
  const exact = voices.filter((voice) => normalizeLang(voice.lang) === wanted)
  const pool = exact.length > 0
    ? exact
    : voices.filter((voice) => normalizeLang(voice.lang).split('-')[0] === prefix)
  if (pool.length === 0) return null
  return pool.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const blob = `${voice.name} ${voice.voiceURI ?? ''}`.toLowerCase()
  let score = 0
  if (blob.includes('google')) score += 100
  if (/\bnatural\b|\bonline\b/.test(blob)) score += 80
  if (/premium|enhanced/.test(blob)) score += 70
  if (voice.localService === false) score += 25
  if (/\b(eddy|flo|reed|rocko|sandy|shelley)\b/.test(blob)) score += 8
  if (NOVELTY.test(blob)) score -= 100
  return score
}

let cachedVoices: SpeechSynthesisVoice[] = []
let voicesSettled = false
let loading: Promise<SpeechSynthesisVoice[]> | null = null
let watching = false

function snapshotVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return cachedVoices
  const live = window.speechSynthesis.getVoices()
  if (live.length === 0) return cachedVoices
  const livePremium = hasPremiumVoices(live)
  const cachedPremium = hasPremiumVoices(cachedVoices)
  if (livePremium && !cachedPremium) cachedVoices = live
  else if (live.length >= cachedVoices.length) cachedVoices = live
  return cachedVoices
}

function watchVoices(): void {
  if (watching || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  watching = true
  const onChange = () => {
    snapshotVoices()
  }
  window.speechSynthesis.addEventListener('voiceschanged', onChange)
  window.speechSynthesis.onvoiceschanged = onChange
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve(cachedVoices)
  }
  if (voicesSettled && hasPremiumVoices(cachedVoices)) {
    return Promise.resolve(snapshotVoices())
  }
  if (loading) return loading

  loading = new Promise((resolve) => {
    const synth = window.speechSynthesis
    watchVoices()
    snapshotVoices()
    if (hasPremiumVoices(cachedVoices)) {
      voicesSettled = true
      resolve(cachedVoices)
      return
    }

    const finish = () => {
      snapshotVoices()
      voicesSettled = true
      resolve(cachedVoices)
    }

    const onChange = () => {
      snapshotVoices()
      if (hasPremiumVoices(cachedVoices)) {
        window.clearTimeout(timer)
        synth.removeEventListener('voiceschanged', onChange)
        finish()
      }
    }

    const timer = window.setTimeout(() => {
      synth.removeEventListener('voiceschanged', onChange)
      finish()
    }, VOICE_WAIT_MS)

    synth.addEventListener('voiceschanged', onChange)
    synth.onvoiceschanged = onChange
    synth.getVoices()
  })

  return loading
}

export function primeSpeech(): void {
  void loadVoices()
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  void loadVoices()
}

export function resetSpeechEngineForTests(): void {
  cachedVoices = []
  voicesSettled = false
  loading = null
  watching = false
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  if (synth.speaking || synth.pending) synth.cancel()
}

function speakNow(
  word: string,
  lang: string,
  voices: SpeechSynthesisVoice[],
  options?: { onEnd?: () => void; onError?: (message: string) => void },
): void {
  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = lang
  utterance.rate = 0.92
  const voice = pickDeviceVoice(voices, lang)
  if (voice) {
    console.log('🗣️ Voice loaded:', voice.name, 'Local:', voice.localService)
    utterance.voice = voice
    utterance.lang = voice.lang || lang
  }
  utterance.onend = () => options?.onEnd?.()
  utterance.onerror = () => options?.onError?.('Could not play that word.')
  synth.speak(utterance)
}

export function speakWord(
  text: string,
  options?: { lang?: string; onEnd?: () => void; onError?: (message: string) => void },
): void {
  const word = sanitizeSpeechText(text)
  if (!word) throw new Error('Nothing to pronounce.')
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    throw new Error('This browser cannot speak yet.')
  }
  const lang = options?.lang?.trim() || 'en-US'
  const synth = window.speechSynthesis
  const restarting = synth.speaking || synth.pending
  if (restarting) synth.cancel()

  const play = (voices: SpeechSynthesisVoice[]) => {
    const start = () => speakNow(word, lang, voices.length > 0 ? voices : snapshotVoices(), options)
    if (restarting) window.setTimeout(start, 60)
    else start()
  }

  const current = snapshotVoices()
  if (hasPremiumVoices(current) || voicesSettled) {
    play(current)
    return
  }

  void loadVoices()
    .then(play)
    .catch((err: unknown) => {
      options?.onError?.(err instanceof Error ? err.message : 'Could not play that word.')
    })
}
