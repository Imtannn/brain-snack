const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client'

type TokenResponse = {
  access_token?: string
  error?: string
}

type TokenClient = {
  requestAccessToken: () => void
}

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string
      scope: string
      callback: (response: TokenResponse) => void
    }) => TokenClient
  }
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

export type GoogleProfile = {
  sub: string
  email: string
  name: string
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google sign-in did not finish.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google sign-in did not finish.'))
    document.head.appendChild(script)
  })
}

/** Browser-only Google sign-in. This does not call the Atelier API. */
export async function requestGoogleProfile(clientId: string): Promise<GoogleProfile> {
  await loadGoogleScript()
  const oauth = window.google?.accounts?.oauth2
  if (!oauth) throw new Error('Google sign-in did not finish.')

  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Google sign-in did not finish.'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })

  const profile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!profile.ok) throw new Error('Google sign-in did not finish.')
  const body = await profile.json() as Partial<GoogleProfile>
  if (!body.email || !body.sub) throw new Error('Google did not share an email address.')
  return { sub: body.sub, email: body.email, name: body.name ?? '' }
}

export function googleClientId(): string {
  const value = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return typeof value === 'string' ? value.trim() : ''
}
