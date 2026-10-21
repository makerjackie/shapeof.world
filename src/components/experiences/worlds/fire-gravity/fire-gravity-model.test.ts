import { describe, expect, it } from 'vitest'
import { flameShape, relax } from './fire-gravity-model'
describe('qualitative candle limits', () => {
  it('removes buoyancy at the microgravity endpoint and broadens the flame', () => {
    expect(flameShape(0).buoyancy).toBe(0)
    expect(flameShape(0).radius).toBeGreaterThan(flameShape(1).radius)
    expect(flameShape(0).height).toBeLessThan(flameShape(1).height)
  })
  it('uses elapsed time rather than frame count for shape transitions', () => {
    let manyFrames = 1
    for (let frame = 0; frame < 60; frame++) manyFrames = relax(manyFrames, 0, 1 / 60)
    expect(manyFrames).toBeCloseTo(relax(1, 0, 1), 10)
  })
  it('bounds invalid inputs and never overshoots during frame stalls', () => {
    expect(flameShape(-1)).toEqual(flameShape(0))
    expect(flameShape(Infinity)).toEqual(flameShape(1))
    expect(relax(0, 1, 5)).toBeGreaterThan(0)
    expect(relax(0, 1, 5)).toBeLessThan(1)
    expect(relax(1, 0, -1)).toBe(1)
  })
})
