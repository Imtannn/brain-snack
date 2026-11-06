import { randomUnit } from './clock'

export function uid(prefix: string): string {
  return `${prefix}-${randomUnit().toString(36).slice(2, 9)}`
}
