const ACCOUNTS_KEY = 'brain-snack.accounts'
const CODES_KEY = 'brain-snack.loginCodes'
const SESSION_KEY = 'brain-snack.session'
const CODE_TTL_MS = 10 * 60 * 1000

export type LocalAccount = {
  email: string
  passwordHash: string | null
  name: string
}

export type LocalSession = {
  uid: string
  email: string
  displayName: string | null
}

type PendingCode = {
  email: string
  code: string
  expiresAt: number
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function accountId(email: string): string {
  return `user-${email.trim().toLowerCase()}`
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function accounts(): LocalAccount[] {
  return readJson<LocalAccount[]>(ACCOUNTS_KEY, [])
}

function saveAccounts(next: LocalAccount[]) {
  writeJson(ACCOUNTS_KEY, next)
}

export function findAccount(email: string): LocalAccount | null {
  const key = email.trim().toLowerCase()
  return accounts().find((account) => account.email === key) ?? null
}

export function upsertAccount(account: LocalAccount) {
  const rest = accounts().filter((item) => item.email !== account.email)
  saveAccounts([account, ...rest])
}

export function readSession(): LocalSession | null {
  const session = readJson<LocalSession | null>(SESSION_KEY, null)
  if (!session || typeof session.email !== 'string' || typeof session.uid !== 'string') return null
  return session
}

export function writeSession(session: LocalSession | null) {
  if (!session) localStorage.removeItem(SESSION_KEY)
  else writeJson(SESSION_KEY, session)
}

export function sessionFor(email: string, name = ''): LocalSession {
  const normalized = email.trim().toLowerCase()
  const displayName = name.trim()
  return {
    uid: accountId(normalized),
    email: normalized,
    displayName: displayName || null,
  }
}

function pendingCodes(): PendingCode[] {
  const now = Date.now()
  return readJson<PendingCode[]>(CODES_KEY, []).filter((item) => item.expiresAt > now)
}

export function issueLoginCode(email: string): string {
  const normalized = email.trim().toLowerCase()
  const sample = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  const code = String(sample % 1_000_000).padStart(6, '0')
  const next = pendingCodes().filter((item) => item.email !== normalized)
  next.push({ email: normalized, code, expiresAt: Date.now() + CODE_TTL_MS })
  writeJson(CODES_KEY, next)
  return code
}

export function consumeLoginCode(email: string, code: string): boolean {
  const normalized = email.trim().toLowerCase()
  const match = pendingCodes().find((item) => item.email === normalized && item.code === code.trim())
  const rest = pendingCodes().filter((item) => item.email !== normalized)
  writeJson(CODES_KEY, rest)
  return Boolean(match)
}
