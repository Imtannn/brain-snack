import { accountId } from './localAccounts'
import { decryptSecret, encryptSecret } from './secretBox'
import { apiLoadSettings, apiSaveSettings, vaultToken } from '../api/client'

const STORAGE_PREFIX = 'brain-snack.geminiKey.'

export function geminiKeyStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`
}

export function readGeminiKey(uid: string): string {
  try {
    return localStorage.getItem(geminiKeyStorageKey(uid))?.trim() ?? ''
  } catch {
    return ''
  }
}

export function writeGeminiKey(uid: string, key: string): void {
  localStorage.setItem(geminiKeyStorageKey(uid), key.trim())
}

export function clearGeminiKey(uid: string): void {
  localStorage.removeItem(geminiKeyStorageKey(uid))
}

export async function loadGeminiKey(uid: string): Promise<string> {
  if (!vaultToken()) return readGeminiKey(uid)
  try {
    const remote = await apiLoadSettings()
    const iv = remote.geminiKeyIv
    const ct = remote.geminiKeyEnc
    if (iv && ct) {
      try {
        const plain = (await decryptSecret(uid, { iv, ct })).trim()
        if (plain) writeGeminiKey(uid, plain)
        else clearGeminiKey(uid)
        return plain
      } catch {
        return readGeminiKey(uid)
      }
    }
  } catch {
    return readGeminiKey(uid)
  }
  return readGeminiKey(uid)
}

export async function saveGeminiKey(uid: string, key: string): Promise<void> {
  const trimmed = key.trim()
  if (trimmed) writeGeminiKey(uid, trimmed)
  else clearGeminiKey(uid)
  if (!vaultToken()) return
  try {
    if (!trimmed) {
      await apiSaveSettings({ geminiKeyIv: '', geminiKeyEnc: '' })
      return
    }
    const packed = await encryptSecret(uid, trimmed)
    await apiSaveSettings({ geminiKeyIv: packed.iv, geminiKeyEnc: packed.ct })
  } catch {
    // Local cache still holds the key if the vault is briefly down.
  }
}

export async function migrateLocalGeminiKey(uid: string, email: string): Promise<void> {
  const legacyId = accountId(email)
  if (legacyId === uid) return
  const current = await loadGeminiKey(uid)
  if (current) return
  const legacy = readGeminiKey(legacyId)
  if (!legacy) return
  await saveGeminiKey(uid, legacy)
}
