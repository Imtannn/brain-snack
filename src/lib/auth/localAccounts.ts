/** Old browser-only account ids, used once to copy snacks and keys into the vault. */

export function accountId(email: string): string {
  return `user-${email.trim().toLowerCase()}`
}
