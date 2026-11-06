const enc = new TextEncoder()
const dec = new TextDecoder()

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

async function wrapKey(uid: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(`bs:${uid}`), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('brain-snack.gemini.v1'), iterations: 120_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptSecret(uid: string, plain: string): Promise<{ iv: string; ct: string }> {
  const key = await wrapKey(uid)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain))
  return { iv: bytesToB64(iv), ct: bytesToB64(ct) }
}

export async function decryptSecret(uid: string, packed: { iv: string; ct: string }): Promise<string> {
  const key = await wrapKey(uid)
  const iv = b64ToBytes(packed.iv)
  const ct = b64ToBytes(packed.ct)
  const ivCopy = new Uint8Array(iv)
  const ctCopy = new Uint8Array(ct)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivCopy }, key, ctCopy)
  return dec.decode(plain)
}
