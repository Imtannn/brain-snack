/** Legacy local ids used to migrate snacks and keys after Firebase sign-in. */

export function accountId(email: string): string {
  return `user-${email.trim().toLowerCase()}`
}
