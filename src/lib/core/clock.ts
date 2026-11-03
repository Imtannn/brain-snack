/** Time and randomness for app code. Replays swap the source so a session runs the same way twice. */

export interface TimeSource {
  /** Wall-clock milliseconds since the epoch (like `Date.now`). */
  now(): number
  /** High-resolution milliseconds since page start (like `performance.now`). */
  perf(): number
  /** A number in [0, 1) (like `Math.random`). */
  random(): number
}

/** The browser's own clocks and `Math.random`, for code that wraps them. */
export const realTimeSource: TimeSource = {
  now: () => Date.now(),
  perf: () => performance.now(),
  random: () => Math.random(),
}

let source: TimeSource = realTimeSource

export const nowMs = (): number => source.now()
export const nowIso = (): string => new Date(source.now()).toISOString()
export const perfNow = (): number => source.perf()
export const randomUnit = (): number => source.random()

/** Replace the time source. Returns a function that restores the previous one. */
export function installTimeSource(next: TimeSource): () => void {
  const previous = source
  source = next
  return () => {
    source = previous
  }
}

/** Small deterministic generator (mulberry32): the same seed always gives the same sequence. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface ManualTimeSource {
  source: TimeSource
  /** Move both clocks forward by `ms`. */
  advance(ms: number): void
}

/** A source that only moves when told to, with seeded randomness. */
export function createManualTimeSource(options: { startEpochMs: number; seed: number }): ManualTimeSource {
  let elapsed = 0
  return {
    source: {
      now: () => options.startEpochMs + elapsed,
      perf: () => elapsed,
      random: createSeededRandom(options.seed),
    },
    advance(ms) {
      elapsed += ms
    },
  }
}
