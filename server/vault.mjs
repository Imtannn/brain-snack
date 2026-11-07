import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool, hashPin, migrate as migratePostgres, newUserId, pinMatches } from './db.mjs'

const empty = () => ({
  users: [],
  sessions: [],
  snacks: [],
  settings: [],
})

const dataDir =
  process.env.VAULT_DATA_DIR?.trim() ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const dataFile = join(dataDir, 'vault.json')

let fileCache = null
let fileQueue = Promise.resolve()

function usePostgres() {
  return Boolean(getPool())
}

async function withFile(mutator) {
  const run = async () => {
    if (!fileCache) {
      await mkdir(dataDir, { recursive: true })
      try {
        fileCache = JSON.parse(await readFile(dataFile, 'utf8'))
      } catch {
        fileCache = empty()
      }
      fileCache.users ||= []
      fileCache.sessions ||= []
      fileCache.snacks ||= []
      fileCache.settings ||= []
    }
    const result = await mutator(fileCache)
    const tmp = `${dataFile}.tmp`
    await writeFile(tmp, JSON.stringify(fileCache))
    await rename(tmp, dataFile)
    return result
  }
  const next = fileQueue.then(run, run)
  fileQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

export async function bootVault() {
  if (usePostgres()) {
    await migratePostgres()
    return { driver: 'postgres' }
  }
  await withFile(() => null)
  return { driver: 'file' }
}

export async function vaultHealth() {
  if (usePostgres()) {
    try {
      await getPool().query('select 1')
      return { ok: true, db: true, driver: 'postgres' }
    } catch {
      return { ok: true, db: false, driver: 'postgres' }
    }
  }
  try {
    await withFile(() => null)
    return { ok: true, db: true, driver: 'file' }
  } catch {
    return { ok: false, db: false, driver: 'file' }
  }
}

export async function claimAccount(email, pin) {
  if (usePostgres()) {
    const { rows } = await getPool().query('select id, email, pin_hash from users where email = $1', [email])
    let user = rows[0]
    if (!user) {
      const id = newUserId()
      const pin_hash = await hashPin(pin)
      await getPool().query('insert into users (id, email, pin_hash, created_at) values ($1, $2, $3, $4)', [
        id,
        email,
        pin_hash,
        Date.now(),
      ])
      return { id, email }
    }
    if (!(await pinMatches(pin, user.pin_hash))) {
      const err = new Error('Wrong PIN for that email.')
      err.status = 401
      throw err
    }
    return { id: user.id, email: user.email }
  }
  return withFile(async (data) => {
    let user = data.users.find((item) => item.email === email)
    if (!user) {
      user = { id: newUserId(), email, pin_hash: await hashPin(pin), created_at: Date.now() }
      data.users.push(user)
      return { id: user.id, email: user.email }
    }
    if (!(await pinMatches(pin, user.pin_hash))) {
      const err = new Error('Wrong PIN for that email.')
      err.status = 401
      throw err
    }
    return { id: user.id, email: user.email }
  })
}

export async function findUserByEmail(email) {
  if (usePostgres()) {
    const { rows } = await getPool().query('select id, email, pin_hash from users where email = $1', [email])
    return rows[0] || null
  }
  return withFile((data) => data.users.find((user) => user.email === email) || null)
}

export async function createUser(user) {
  if (usePostgres()) {
    await getPool().query('insert into users (id, email, pin_hash, created_at) values ($1, $2, $3, $4)', [
      user.id,
      user.email,
      user.pin_hash,
      user.created_at,
    ])
    return
  }
  await withFile((data) => {
    data.users.push(user)
  })
}

export async function userFromTokenHash(hash, now) {
  if (usePostgres()) {
    const { rows } = await getPool().query(
      'select u.id, u.email from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > $2',
      [hash, now],
    )
    return rows[0] ? { id: rows[0].id, email: rows[0].email } : null
  }
  return withFile((data) => {
    const session = data.sessions.find((item) => item.token_hash === hash && item.expires_at > now)
    if (!session) return null
    const user = data.users.find((item) => item.id === session.user_id)
    return user ? { id: user.id, email: user.email } : null
  })
}

export async function createSession(session) {
  if (usePostgres()) {
    await getPool().query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [
      session.token_hash,
      session.user_id,
      session.expires_at,
    ])
    return
  }
  await withFile((data) => {
    data.sessions.push(session)
  })
}

export async function deleteSession(hash) {
  if (usePostgres()) {
    await getPool().query('delete from sessions where token_hash = $1', [hash])
    return
  }
  await withFile((data) => {
    data.sessions = data.sessions.filter((item) => item.token_hash !== hash)
  })
}

export async function listSnacks(user) {
  const ownerId = user.id
  const email = user.email
  if (usePostgres()) {
    const { rows } = await getPool().query(
      `select s.id, s.owner_id, s.title, s.raw_text, s.seconds, s.created_at, s.questions, s.model, s.smart_answers
       from snacks s
       join users u on u.id = s.owner_id
       where u.email = $1 or s.owner_id = $2
       order by s.created_at desc`,
      [email, ownerId],
    )
    return rows
  }
  return withFile((data) => {
    const ids = new Set(
      data.users.filter((item) => item.id === ownerId || item.email === email).map((item) => item.id),
    )
    ids.add(ownerId)
    return data.snacks
      .filter((snack) => ids.has(snack.owner_id))
      .sort((a, b) => Number(b.created_at) - Number(a.created_at))
  })
}

export async function upsertSnack(snack) {
  if (usePostgres()) {
    await getPool().query(
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
        snack.owner_id,
        snack.title,
        snack.raw_text,
        snack.seconds,
        snack.created_at,
        JSON.stringify(snack.questions),
        snack.model,
        snack.smart_answers,
      ],
    )
    return
  }
  await withFile((data) => {
    const index = data.snacks.findIndex((item) => item.id === snack.id && item.owner_id === snack.owner_id)
    if (index >= 0) data.snacks[index] = snack
    else data.snacks.push(snack)
  })
}

export async function deleteSnack(ownerId, id) {
  if (usePostgres()) {
    await getPool().query('delete from snacks where id = $1 and owner_id = $2', [id, ownerId])
    return
  }
  await withFile((data) => {
    data.snacks = data.snacks.filter((item) => !(item.id === id && item.owner_id === ownerId))
  })
}

export async function getSettings(ownerId) {
  if (usePostgres()) {
    const { rows } = await getPool().query('select gemini_key_enc, gemini_key_iv from settings where owner_id = $1', [
      ownerId,
    ])
    return rows[0] || null
  }
  return withFile((data) => data.settings.find((item) => item.owner_id === ownerId) || null)
}

export async function putSettings(row) {
  if (usePostgres()) {
    await getPool().query(
      `insert into settings (owner_id, gemini_key_enc, gemini_key_iv, updated_at)
       values ($1, $2, $3, $4)
       on conflict (owner_id) do update set
         gemini_key_enc = excluded.gemini_key_enc,
         gemini_key_iv = excluded.gemini_key_iv,
         updated_at = excluded.updated_at`,
      [row.owner_id, row.gemini_key_enc, row.gemini_key_iv, row.updated_at],
    )
    return
  }
  await withFile((data) => {
    const index = data.settings.findIndex((item) => item.owner_id === row.owner_id)
    if (index >= 0) data.settings[index] = row
    else data.settings.push(row)
  })
}
