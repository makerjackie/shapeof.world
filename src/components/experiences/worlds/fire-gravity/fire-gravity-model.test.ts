import { describe, expect, it } from 'vitest'
import { flameShape, relax, sceneFrame, sceneToScreen } from './fire-gravity-model'
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

describe('scene framing', () => {
  it('places the candle top inside the lower third of a phone and keeps the flame tip on screen', () => {
    const frame = sceneFrame(390 / 844)
    const candle = sceneToScreen(0, 0, 390, 844, frame)
    const tip = sceneToScreen(0, .055 + flameShape(1).height, 390, 844, frame)
    expect(candle.x).toBe(195)
    expect(candle.y).toBeGreaterThan(844 * .66)
    expect(candle.y).toBeLessThan(844 * .82)
    expect(tip.y).toBeGreaterThan(220)
  })
  it('lowers and shrinks the flame on phones in the chemistry views, never on desktop', () => {
    const a = sceneFrame(.46, 0), b = sceneFrame(.46, 1)
    expect(sceneToScreen(0, 1.75, 390, 844, b).y).toBeGreaterThan(sceneToScreen(0, 1.75, 390, 844, a).y)
    expect(sceneFrame(1.6, 1)).toEqual(sceneFrame(1.6, 0))
    expect(sceneFrame(.46, NaN)).toEqual(a)
  })
})
