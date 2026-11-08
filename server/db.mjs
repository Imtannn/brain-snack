import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import pg from 'pg'

const scrypt = promisify(scryptCb)
const { Pool } = pg

/** @type {import('pg').Pool | null} */
let pool = null

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || ''
}

export function getPool() {
  const url = databaseUrl()
  if (!url) return null
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    })
  }
  return pool
}

export async function migrate() {
  const db = getPool()
  if (!db) return
  await db.query(`
    create table if not exists users (
      id uuid primary key,
      email text not null unique,
      pin_hash text not null,
      created_at bigint not null
    );

    create table if not exists sessions (
      token_hash text primary key,
      user_id uuid not null references users (id) on delete cascade,
      expires_at bigint not null
    );

    create table if not exists snacks (
      id text primary key,
      owner_id uuid not null references users (id) on delete cascade,
      title text not null,
      raw_text text not null default '',
      seconds integer not null default 15,
      created_at bigint not null,
      questions jsonb not null default '[]'::jsonb,
      model text,
      smart_answers boolean not null default false
    );

    create index if not exists snacks_owner_created_idx on snacks (owner_id, created_at desc);

    create table if not exists settings (
      owner_id uuid primary key references users (id) on delete cascade,
      gemini_key_enc text not null default '',
      gemini_key_iv text not null default '',
      updated_at bigint not null
    );
  `)
}

export async function hashPin(pin) {
  const salt = randomBytes(16)
  const key = await scrypt(pin, salt, 32)
  return `${salt.toString('hex')}:${Buffer.from(key).toString('hex')}`
}

export async function pinMatches(pin, stored) {
  const [saltHex, keyHex] = String(stored).split(':')
  if (!saltHex || !keyHex) return false
  const key = await scrypt(pin, Buffer.from(saltHex, 'hex'), 32)
  const left = Buffer.from(key)
  const right = Buffer.from(keyHex, 'hex')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken() {
  return randomBytes(32).toString('hex')
}

export function newUserId() {
  return randomUUID()
}
