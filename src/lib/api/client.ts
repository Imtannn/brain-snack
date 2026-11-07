export type ApiUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Vault server is offline. On Railway this is automatic. Locally run npm run dev:server.')
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

export async function apiHealth(): Promise<{ ok: boolean; db: boolean; driver?: string }> {
  try {
    return await api('/api/health')
  } catch {
    return { ok: false, db: false }
  }
}

export async function apiMe(): Promise<ApiUser | null> {
  const data = await api<{ user: ApiUser | null }>('/api/auth/me')
  return data.user
}

export async function apiLogin(email: string, pin: string): Promise<ApiUser> {
  const data = await api<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, pin }),
  })
  return data.user
}

export async function apiLogout(): Promise<void> {
  await api('/api/auth/logout', { method: 'POST' })
}

export async function apiListSnacks(): Promise<CloudSnack[]> {
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
