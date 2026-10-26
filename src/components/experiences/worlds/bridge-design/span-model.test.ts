import { describe, expect, it } from 'vitest'
import { DECK_LOAD, POINT_LOAD, SPAN_KINDS, spanResponse, feasibleKinds, SCHEME_LIMITS } from './span-model'

describe('selected span schemes, not universal bridge limits', () => {
  it('has the intended overlap and does not erase kilometre-scale cable-stayed bridges', () => {
    expect(feasibleKinds(50)).toEqual(SPAN_KINDS)
    expect(feasibleKinds(500)).toEqual(['arch', 'stayed', 'suspension'])
    expect(feasibleKinds(1092)).toEqual(['stayed', 'suspension'])
    expect(feasibleKinds(1500)).toEqual(['suspension'])
    expect(feasibleKinds(2023)).toEqual(['suspension'])
  })
  it('recovers fixed-depth beam bending growth from independent equilibrium', () => {
    const a = spanResponse('beam', 500), b = spanResponse('beam', 1000)
    const distributedA = a.demand - POINT_LOAD * 500 / 4
    const distributedB = b.demand - POINT_LOAD * 1000 / 4
    expect(distributedB / distributedA).toBeCloseTo(4)
    expect(a.capacity).toBeCloseTo(b.capacity)
  })
  it('arch buckling capacity falls by four when effective length doubles', () => {
    const a = spanResponse('arch', 1000), b = spanResponse('arch', 2000)
    expect(a.capacity / b.capacity).toBeCloseTo(4)
    expect(b.demand).toBeGreaterThan(a.demand)
  })
  it('outer stay balances deck share, point load and half cable self weight', () => {
    const L = 1092, h = 240, length = Math.hypot(L / 2, h)
    const response = spanResponse('stayed', L)
    expect(response.demand * h / length).toBeCloseTo(DECK_LOAD * 40 / 2 + POINT_LOAD / 2 + 78.5 * .015 * length / 2)
  })
  it('constant sag ratio keeps cable force growth near linear', () => {
    const a = spanResponse('suspension', 500), b = spanResponse('suspension', 1000)
    expect(b.demand / a.demand).toBeGreaterThan(1.98)
    expect(b.demand / a.demand).toBeLessThan(2)
  })
  it.each(SPAN_KINDS)('%s envelope is monotone, finite and brackets its capacity crossing', kind => {
    let previous = 0
    for (let L = 20; L <= 3000; L += 10) {
      const r = spanResponse(kind, L)
      expect(Number.isFinite(r.utilization)).toBe(true)
      expect(r.utilization).toBeGreaterThanOrEqual(previous)
      previous = r.utilization
    }
    const limit = SCHEME_LIMITS[kind]
    expect(spanResponse(kind, limit).utilization).toBeLessThanOrEqual(1)
    expect(spanResponse(kind, limit + 1).utilization).toBeGreaterThan(1)
  })
})
