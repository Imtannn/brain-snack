/** Shared id helper — never duplicate Math.random uid snippets. */
import { nowMs, randomUnit } from './clock'

export function uid(prefix: string): string {
  return `${prefix}-${randomUnit().toString(36).slice(2, 9)}`
}

/** Id that also sorts by creation time: `prefix_<epoch ms>_<random>`. */
export function timestampedId(prefix: string): string {
  return `${prefix}_${nowMs()}_${randomUnit().toString(36).slice(2, 8)}`
}

/** Detects canvas layers mistakenly flagged with an AI prefix. */
export function isRogueLayerId(id: string | null | undefined): boolean {
  if (!id) return false
  return /^ai_layer[-_]/.test(id) || /^layer[-_]/.test(id)
}
