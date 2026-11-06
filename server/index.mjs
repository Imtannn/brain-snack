import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { getPool, hashPin, migrate, newToken, newUserId, pinMatches, requireDb, tokenHash } from './db.mjs'

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

async function userFromRequest(c) {
  const token = getCookie(c, COOKIE)
  if (!token) return null
  const db = getPool()
  if (!db) return null
  const { rows } = await db.query(
    'select u.id, u.email from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > $2',
    [tokenHash(token), Date.now()],
  )
  return rows[0] ? { id: rows[0].id, email: rows[0].email } : null
}

function publicUser(row) {
  return { uid: row.id, email: row.email, displayName: null, photoURL: null }
}

app.get('/api/health', async (c) => {
  const db = getPool()
  if (!db) return c.json({ ok: true, db: false })
  try {
    await db.query('select 1')
    return c.json({ ok: true, db: true })
  } catch {
    return c.json({ ok: true, db: false })
  }
})

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
    const db = requireDb()
    const found = await db.query('select id, email, pin_hash from users where email = $1', [email])
    let user = found.rows[0]
    if (!user) {
      const id = newUserId()
      const pin_hash = await hashPin(pin)
      await db.query('insert into users (id, email, pin_hash, created_at) values ($1, $2, $3, $4)', [
        id,
        email,
        pin_hash,
        Date.now(),
      ])
      user = { id, email }
    } else if (!(await pinMatches(pin, user.pin_hash))) {
      return jsonError(c, 401, 'Wrong PIN for that email.')
    }
    const token = newToken()
    await db.query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [
      tokenHash(token),
      user.id,
      Date.now() + SESSION_MS,
    ])
    setCookie(c, COOKIE, token, cookieOpts(c))
    return c.json({ user: publicUser(user) })
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 500
    return jsonError(c, status || 500, err instanceof Error ? err.message : 'Could not open the vault.')
  }
})

app.post('/api/auth/logout', async (c) => {
  const token = getCookie(c, COOKIE)
  const db = getPool()
  if (token && db) {
    await db.query('delete from sessions where token_hash = $1', [tokenHash(token)])
  }
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/snacks', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to open your Snack Vault.')
  const db = requireDb()
  const { rows } = await db.query(
    'select id, owner_id, title, raw_text, seconds, created_at, questions, model, smart_answers from snacks where owner_id = $1 order by created_at desc',
    [user.id],
  )
  return c.json({ snacks: rows.map(mapSnack) })
})

app.put('/api/snacks/:id', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to save a snack.')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const snack = parseSnack(id, user.id, body)
  if (!snack) return jsonError(c, 400, 'Could not save that snack.')
  const db = requireDb()
  await db.query(
    `insert into snacks (id, owner_id, title, raw_text, seconds, created_at, questions, model, smart_answers)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     on conflict (id) do update set
       title = excluded.title,
       raw_text = excluded.raw_text,
       seconds = excluded.seconds,
       questions = excluded.questions,
       model = excluded.model,
       smart_answers = excluded.smart_answers
     where snacks.owner_id = $2`,
    [
      snack.id,
      user.id,
      snack.title,
      snack.rawText,
      snack.seconds,
      snack.createdAt,
      JSON.stringify(snack.questions),
      snack.model,
      snack.smartAnswers,
    ],
  )
  return c.json({ snack })
})

app.delete('/api/snacks/:id', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to delete a snack.')
  const db = requireDb()
  await db.query('delete from snacks where id = $1 and owner_id = $2', [c.req.param('id'), user.id])
  return c.json({ ok: true })
})

app.get('/api/settings', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to load Brainy.')
  const db = requireDb()
  const { rows } = await db.query('select gemini_key_enc, gemini_key_iv from settings where owner_id = $1', [user.id])
  const row = rows[0]
  return c.json({
    geminiKeyEnc: row?.gemini_key_enc || '',
    geminiKeyIv: row?.gemini_key_iv || '',
  })
})

app.put('/api/settings', async (c) => {
  const user = await userFromRequest(c)
  if (!user) return jsonError(c, 401, 'Log in to save Brainy.')
  const body = await c.req.json().catch(() => ({}))
  const db = requireDb()
  await db.query(
    `insert into settings (owner_id, gemini_key_enc, gemini_key_iv, updated_at)
     values ($1, $2, $3, $4)
     on conflict (owner_id) do update set
       gemini_key_enc = excluded.gemini_key_enc,
       gemini_key_iv = excluded.gemini_key_iv,
       updated_at = excluded.updated_at`,
    [user.id, String(body.geminiKeyEnc || ''), String(body.geminiKeyIv || ''), Date.now()],
  )
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
  }
}

if (existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(process.env.PORT || 8787)

await migrate().catch((err) => {
  console.error('Vault migrate failed:', err)
})

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`Brain Snack vault on :${port}${getPool() ? ' (postgres ready)' : ' (no DATABASE_URL yet)'}`)
})
