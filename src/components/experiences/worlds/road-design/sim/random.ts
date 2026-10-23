/** Mulberry32: reproducible arrival, vehicle and route choices, without global Math.random. */
export class SeededRandom {
  private state: number
  constructor(seed = 20261023) { this.state = seed >>> 0 }
  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  exponential(ratePerSecond: number): number {
    return ratePerSecond > 0 ? -Math.log(Math.max(1e-12, 1 - this.next())) / ratePerSecond : Infinity
  }
}
