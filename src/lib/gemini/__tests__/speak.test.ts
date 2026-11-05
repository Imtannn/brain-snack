import { describe, expect, it } from 'vitest'
import { audioBlobFromInline, decodeBase64, guessSpeechLang, pcmToWav, pickDeviceVoice } from '../speak'

describe('speak helpers', () => {
  it('keeps one speech language so the voice stays stable', () => {
    expect(guessSpeechLang('café')).toBe('en-US')
    expect(guessSpeechLang('niño')).toBe('en-US')
    expect(guessSpeechLang('hello')).toBe('en-US')
  })

  it('locks the same preferred device voice', () => {
    const voices = [
      { name: 'Google UK English Female', lang: 'en-GB' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Thomas', lang: 'fr-FR' },
    ] as SpeechSynthesisVoice[]
    const first = pickDeviceVoice(voices)
    const second = pickDeviceVoice([
      { name: 'Thomas', lang: 'fr-FR' },
      { name: 'Google UK English Female', lang: 'en-GB' },
    ] as SpeechSynthesisVoice[])
    expect(first?.name).toBe('Samantha')
    expect(second?.name).toBe('Samantha')
  })

  it('builds a wav blob sized for the pcm payload', () => {
    const pcm = new Uint8Array([0, 0, 1, 0, 2, 0, 3, 0])
    const wav = pcmToWav(pcm, 24000)
    expect(wav.type).toBe('audio/wav')
    expect(wav.size).toBe(44 + pcm.length)
  })

  it('wraps pcm inline audio as wav', async () => {
    const pcm = new Uint8Array([0, 0, 1, 0])
    let binary = ''
    for (const byte of pcm) binary += String.fromCharCode(byte)
    const data = btoa(binary)
    const blob = audioBlobFromInline('audio/L16;codec=pcm;rate=24000', data)
    expect(blob.type).toBe('audio/wav')
    expect(decodeBase64(data)).toEqual(pcm)
  })
})
