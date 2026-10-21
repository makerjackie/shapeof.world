export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
export const easeInOut = (x: number) => {
  const t = clamp01(x)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
export const easeIn = (x: number) => Math.pow(clamp01(x), 3)
/** Progress of a window [start, start + duration] at time t. */
export const window01 = (t: number, start: number, duration: number) => clamp01((t - start) / Math.max(1e-6, duration))

/**
 * A scalar that moves to targets over time. `now` is the scene clock in
 * seconds, so the same schedule replays identically under a paused clock.
 */
export class Tween {
  private from: number
  private to: number
  private start = 0
  private duration = 0
  private ease: (x: number) => number = easeInOut

  constructor(value: number) {
    this.from = value
    this.to = value
  }

  set(value: number) {
    this.from = value
    this.to = value
    this.duration = 0
  }

  go(now: number, to: number, duration: number, ease: (x: number) => number = easeInOut, delay = 0) {
    this.from = this.value(now)
    this.to = to
    this.start = now + delay
    this.duration = duration
    this.ease = ease
  }

  value(now: number): number {
    if (this.duration <= 0) return now >= this.start ? this.to : this.from
    return lerp(this.from, this.to, this.ease((now - this.start) / this.duration))
  }

  target(): number {
    return this.to
  }

  done(now: number): boolean {
    return now >= this.start + this.duration
  }
}

/** Deterministic hash noise in [0, 1). */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
