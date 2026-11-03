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
