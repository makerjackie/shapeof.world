import { describe, expect, it } from 'vitest'
import { GALACTIC_DIRECTION, GALACTIC_DISPLAY_SPEED, historyPosition, orbitalPeriodDays, orbitalPosition } from './orbital-model'
const earth = { a: 1, e: 0.0167, i: 0, L: 100, lp: 103, node: 0 }
describe('orbital reference frames', () => {
  it('closes after a period, including far positive and negative epochs', () => {
    for (const day of [-1000000, 0, 1000000]) {
      const a = orbitalPosition(earth, day)
      const b = orbitalPosition(earth, day + orbitalPeriodDays(earth))
      a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 8))
      expect(Math.hypot(...a)).toBeGreaterThanOrEqual(1 - earth.e - 1e-10)
      expect(Math.hypot(...a)).toBeLessThanOrEqual(1 + earth.e + 1e-10)
    }
  })
  it('uses a common oblique translation, not a force trailing behind the Sun', () => {
    expect(Math.hypot(...GALACTIC_DIRECTION)).toBeCloseTo(1, 12)
    expect(GALACTIC_DIRECTION[0]).toBeGreaterThan(0.4)
    expect(GALACTIC_DIRECTION[1]).toBeGreaterThan(0.8)
    const now = 500, age = 365.25
    const p = historyPosition(earth, now, age, 1)
    const q = historyPosition(earth, now - age, 0, 1)
    p.forEach((v, i) => expect(v - q[i]).toBeCloseTo(-GALACTIC_DIRECTION[i] * age * GALACTIC_DISPLAY_SPEED, 10))
  })
  it('keeps the present position fixed while changing the history reference frame', () => {
    expect(historyPosition(earth, 800, 0, 0)).toEqual(historyPosition(earth, 800, 0, 1))
    const now = historyPosition(earth, 800, 0, 0)
    const past = historyPosition(earth, 800, orbitalPeriodDays(earth), 0)
    now.forEach((v, i) => expect(v).toBeCloseTo(past[i], 8))
  })
  it('allows a planet both ahead of and behind the Sun in the direction of travel', () => {
    const projections = Array.from({ length: 100 }, (_, i) => historyPosition(earth, i * 3.6525, 0, 1).reduce((sum, v, k) => sum + v * GALACTIC_DIRECTION[k], 0))
    expect(Math.min(...projections)).toBeLessThan(0)
    expect(Math.max(...projections)).toBeGreaterThan(0)
  })
})
