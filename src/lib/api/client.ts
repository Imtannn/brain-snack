export type ApiUser = {
  uid: string
  email: string | null
}

const TOKEN_KEY = 'brain-snack.vaultToken'

export function vaultToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setVaultToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode can still use the cookie when it is available.
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = vaultToken()
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Could not reach the vault. Try again in a moment.')
  }
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Request failed'
    throw new Error(message)
  }
  return data as T
}

export async function apiMe(): Promise<ApiUser | null> {
  const data = await api<{ user: ApiUser | null }>('/api/auth/me')
  return data.user
}

export async function apiLogin(email: string, pin: string): Promise<ApiUser> {
  const data = await api<{ user: ApiUser; token?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, pin }),
  })
  if (data.token) setVaultToken(data.token)
  return data.user
}

export async function apiLogout(): Promise<void> {
  try {
    await api('/api/auth/logout', { method: 'POST' })
  } finally {
    setVaultToken(null)
  }
}

export async function apiListSnacks() {
  const data = await api<{ snacks: CloudSnack[] }>('/api/snacks')
  return data.snacks
}

export async function apiPutSnack(snack: CloudSnack): Promise<void> {
  await api(`/api/snacks/${encodeURIComponent(snack.id)}`, {
    method: 'PUT',
    body: JSON.stringify(snack),
  })
}

export async function apiDeleteSnack(id: string): Promise<void> {
  await api(`/api/snacks/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function apiLoadSettings(): Promise<{ geminiKeyEnc: string; geminiKeyIv: string }> {
  return api('/api/settings')
}

export async function apiSaveSettings(packed: { geminiKeyEnc: string; geminiKeyIv: string }): Promise<void> {
  await api('/api/settings', { method: 'PUT', body: JSON.stringify(packed) })
}

export type CloudSnack = {
  id: string
  ownerId: string
  title: string
  rawText: string
  seconds: number
  createdAt: number
  questions: unknown
  model: string | null
  smartAnswers: boolean
}
