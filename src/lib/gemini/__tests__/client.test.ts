import { afterEach, describe, expect, it, vi } from 'vitest'
import { FALLBACK_MODEL, generateContent, isMissingModel, PRIMARY_MODEL, sanitizeGeminiMessage } from '../client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('generateContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns text from the primary model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      candidates: [{ content: { parts: [{ text: '[{"question":"a"}]' }] } }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const reply = await generateContent('test-key', [{ role: 'user', parts: [{ text: 'hi' }] }], { json: true })
    expect(reply.model).toBe(PRIMARY_MODEL)
    expect(reply.fallback).toBe(false)
    expect(reply.text).toContain('question')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain(`/models/${PRIMARY_MODEL}:generateContent`)
    expect(url).toContain('key=test-key')
    expect(String(init.body)).toContain('"responseMimeType":"application/json"')
    expect(String(init.body)).toContain('"maxOutputTokens":16384')
  })

  it('switches to the fallback model when the first model is missing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        error: { message: `models/${PRIMARY_MODEL} is not found`, status: 'NOT_FOUND' },
      }, 404))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'A short explanation.' }] } }],
      }))
    vi.stubGlobal('fetch', fetchMock)
    const reply = await generateContent('secret-key', [{ role: 'user', parts: [{ text: 'explain' }] }])
    expect(reply.model).toBe(FALLBACK_MODEL)
    expect(reply.fallback).toBe(true)
    expect(reply.text).toBe('A short explanation.')
    const secondUrl = fetchMock.mock.calls[1]?.[0] as string
    expect(secondUrl).toContain(FALLBACK_MODEL)
  })

  it('does not try a second model when the key is rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      error: { message: 'API key not valid. Please pass a valid API key. secret-key' },
    }, 400))
    vi.stubGlobal('fetch', fetchMock)
    await expect(generateContent('secret-key', [{ role: 'user', parts: [{ text: 'hi' }] }])).rejects.toThrow(/API key not valid[\s\S]*…/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('gemini helpers', () => {
  it('detects a retired model and hides the key', () => {
    expect(isMissingModel(404, 'not found', 'NOT_FOUND')).toBe(true)
    expect(isMissingModel(400, 'API key not valid')).toBe(false)
    expect(sanitizeGeminiMessage('bad key abc123', 'abc123')).toBe('bad key …')
  })
})
