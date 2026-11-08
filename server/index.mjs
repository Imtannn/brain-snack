import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { newToken, tokenHash } from './db.mjs'
import {
  bootVault,
  claimAccount,
  createSession,
  deleteSession,
  deleteSnack,
  getSettings,
  listSnacks,
  putSettings,
  upsertSnack,
  userFromTokenHash,
  vaultHealth,
} from './vault.mjs'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(rootDir, 'dist')
const COOKIE = 'bs_session'
const SESSION_MS = 1000 * 60 * 60 * 24 * 180
const attempts = new Map()

const app = new Hono()

function jsonError(c, status, message) {
  return c.json({ error: message }, status)
}

function cookieOpts(c) {
  const proto = c.req.header('x-forwarded-proto') || new URL(c.req.url).protocol.replace(':', '')
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    maxAge: SESSION_MS / 1000,
    secure: proto === 'https',
  }
}

function checkRate(email) {
  const now = Date.now()
  const row = attempts.get(email)
  if (!row || row.resetAt < now) {
    attempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return
  }
  row.count += 1
  if (row.count > 8) {
    const err = new Error('Too many attempts. Wait a few minutes and try again.')
    err.status = 429
    throw err
  }
}

function requestToken(c) {
  const header = c.req.header('authorization') || ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  return bearer || getCookie(c, COOKIE) || ''
}

async function userFromRequest(c) {
  const token = requestToken(c)
  if (!token) return null
  return userFromTokenHash(tokenHash(token), Date.now())
}

function publicUser(row) {
  return { uid: row.id, email: row.email }
}

app.get('/api/health', async (c) => c.json(await vaultHealth()))

app.get('/api/auth/me', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return c.json({ user: null })
  return c.json({ user: publicUser(user) })
})

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const pin = String(body.pin || '').trim()
    if (!email || !email.includes('@')) return jsonError(c, 400, 'Enter your email.')
    if (pin.length < 4) return jsonError(c, 400, 'Pick a vault PIN with at least 4 characters.')
    checkRate(email)
    const user = await claimAccount(email, pin)
    const token = newToken()
    await createSession({
      token_hash: tokenHash(token),
      user_id: user.id,
      expires_at: Date.now() + SESSION_MS,
    })
    setCookie(c, COOKIE, token, cookieOpts(c))
    return c.json({ user: publicUser(user), token })
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 500
    return jsonError(c, status || 500, err instanceof Error ? err.message : 'Could not open the vault.')
  }
})

app.post('/api/auth/logout', async (c) => {
  const token = requestToken(c)
  if (token) await deleteSession(tokenHash(token))
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/snacks', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to open your Snack Vault.')
  return c.json({ snacks: (await listSnacks(user)).map(mapSnack) })
})

app.put('/api/snacks/:id', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to save a snack.')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const snack = parseSnack(id, user.id, body)
  if (!snack) return jsonError(c, 400, 'Could not save that snack.')
  await upsertSnack({
    id: snack.id,
    owner_id: user.id,
    title: snack.title,
    raw_text: snack.rawText,
    seconds: snack.seconds,
    created_at: snack.createdAt,
    questions: snack.questions,
    model: snack.model,
    smart_answers: snack.smartAnswers,
    speech_lang: snack.speechLang,
  })
  return c.json({ snack })
})

app.delete('/api/snacks/:id', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to delete a snack.')
  await deleteSnack(user.id, c.req.param('id'))
  return c.json({ ok: true })
})

app.get('/api/settings', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to load Brainy.')
  const row = await getSettings(user.id)
  return c.json({
    geminiKeyEnc: row?.gemini_key_enc || '',
    geminiKeyIv: row?.gemini_key_iv || '',
  })
})

app.put('/api/settings', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to save Brainy.')
  const body = await c.req.json().catch(() => ({}))
  await putSettings({
    owner_id: user.id,
    gemini_key_enc: String(body.geminiKeyEnc || ''),
    gemini_key_iv: String(body.geminiKeyIv || ''),
    updated_at: Date.now(),
  })
  return c.json({ ok: true })
})

function mapSnack(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    rawText: row.raw_text,
    seconds: row.seconds,
    createdAt: Number(row.created_at),
    questions: row.questions || [],
    model: row.model,
    smartAnswers: row.smart_answers === true,
    speechLang: row.speech_lang || undefined,
  }
}

function parseSnack(id, ownerId, body) {
  const title = String(body.title || '').trim()
  const rawText = String(body.rawText || '')
  if (!title) return null
  return {
    id,
    ownerId,
    title,
    rawText,
    seconds: Number(body.seconds) || 15,
    createdAt: Number(body.createdAt) || Date.now(),
    questions: Array.isArray(body.questions) ? body.questions : [],
    model: typeof body.model === 'string' ? body.model : null,
    smartAnswers: body.smartAnswers === true,
    speechLang: parseSpeechLang(body.speechLang),
  }
}

function parseSpeechLang(value) {
  const lang = String(value || '').trim()
  return /^[a-z]{2}-[A-Z]{2}$/.test(lang) ? lang : ''
}

app.all('/api/*', (c) => jsonError(c, 404, 'Not found'))

if (existsSync(distDir)) {
  app.use('/*', (c, next) => {
    if (c.req.path.startsWith('/api/')) return next()
    return serveStatic({ root: './dist' })(c, next)
  })
  app.notFound((c) => {
    if (c.req.path.startsWith('/api/')) return jsonError(c, 404, 'Not found')
    return serveStatic({ path: './dist/index.html' })(c, async () => undefined)
  })
}

const port = Number(process.env.PORT || 8787)
const boot = await bootVault()

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`Brain Snack vault on :${port} (${boot.driver})`)
})
