import { describe, expect, it } from 'vitest'
import { M1_PITCH, M2_PITCH, RAIL, cellRouting, routingFade, routingSpan } from './routing'

describe('illustrative cell routing', () => {
  const halfWidth = .88, halfHeight = 1.6, routing = cellRouting(halfWidth, halfHeight, [-1.36, 1.36])
  const { spanX } = routingSpan(halfWidth, halfHeight)
  const signal = routing.m1.filter(s => s.z1 - s.z0 < RAIL - .01)
  const onGrid = (value: number, pitch: number) => Math.abs(value / pitch - Math.round(value / pitch)) < 1e-6
  it('puts M1 across and M2 up on the SKY130 track grid', () => {
    expect(signal.every(s => s.x1 - s.x0 > s.z1 - s.z0 && onGrid((s.z0 + s.z1) / 2 + 1.36, M1_PITCH))).toBe(true)
    expect(routing.m2.every(s => s.z1 - s.z0 > s.x1 - s.x0 && onGrid((s.x0 + s.x1) / 2 - M2_PITCH / 2, M2_PITCH))).toBe(true)
  })
  it('uses mostly long runs, a few jogs through V1, and about 30–50% of the tracks', () => {
    const lengths = [...signal.map(s => s.x1 - s.x0), ...routing.m2.map(s => s.z1 - s.z0)].sort((a, b) => a - b)
    expect(lengths[Math.floor(lengths.length / 2)]).toBeGreaterThan(1.2)
    expect(routing.v1.length).toBeGreaterThan(4)
    expect(routing.occupancy.m1).toBeGreaterThan(.3); expect(routing.occupancy.m1).toBeLessThan(.5)
    expect(routing.occupancy.m2).toBeGreaterThan(.3); expect(routing.occupancy.m2).toBeLessThan(.5)
  })
  it('runs the power rails unbroken along the row, beside neighbouring cells', () => {
    for (const z of [-1.36, 1.36]) expect(routing.m1.some(s => s.x0 <= -spanX && s.x1 >= spanX && Math.abs((s.z0 + s.z1) / 2 - z) < 1e-9)).toBe(true)
    expect(routing.cells.filter(c => c.z0 < 0 && c.z1 > 0 && c.x1 < -halfWidth).length).toBeGreaterThan(0)
    expect(routing.cells.filter(c => c.z0 < 0 && c.z1 > 0 && c.x0 > halfWidth).length).toBeGreaterThan(0)
  })
  it('never puts signal wiring, plugs or neighbours over the cell itself', () => {
    const over = (s: { x0: number; x1: number; z0: number; z1: number }) => s.x0 < halfWidth && s.x1 > -halfWidth && s.z0 < halfHeight && s.z1 > -halfHeight
    expect([...signal, ...routing.m2, ...routing.v1].some(over)).toBe(false)
    expect(routing.cells.filter(c => c.z0 < 0 && c.z1 > 0).some(over)).toBe(false)
  })
  it('fades out before the edge of the generated field', () => {
    const { spanZ } = routingSpan(halfWidth, halfHeight)
    expect(routingFade(halfWidth + .2, 0, halfWidth, halfHeight)).toBe(1)
    expect(routingFade(0, 1.36, halfWidth, halfHeight)).toBeCloseTo(.3)
    expect(routingFade(0, 1.6, halfWidth, halfHeight)).toBeCloseTo(.3)
    expect(routingFade(spanX, 0, halfWidth, halfHeight)).toBe(0)
    expect(routingFade(0, spanZ, halfWidth, halfHeight)).toBe(0)
  })
})
