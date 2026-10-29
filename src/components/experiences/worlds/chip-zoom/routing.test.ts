import { describe, expect, it } from 'vitest'
import { cellRouting, routingFade } from './routing'

describe('illustrative cell routing', () => {
  const halfWidth = .88, halfHeight = 1.6, routing = cellRouting(halfWidth, halfHeight, [-1.36, 1.36])
  it('has M1 across, M2 up, and plugs between them', () => {
    expect(routing.m1.length).toBeGreaterThan(10)
    expect(routing.m2.length).toBeGreaterThan(10)
    expect(routing.v1.length).toBeGreaterThan(3)
    expect(routing.m1.every(s => s.x1 - s.x0 >= s.z1 - s.z0)).toBe(true)
    expect(routing.m2.every(s => s.z1 - s.z0 >= s.x1 - s.x0)).toBe(true)
  })
  it('never covers the cell itself', () => {
    const over = (s: { x0: number; x1: number; z0: number; z1: number }) => s.x0 < halfWidth && s.x1 > -halfWidth && s.z0 < halfHeight && s.z1 > -halfHeight
    expect([...routing.m1, ...routing.m2, ...routing.v1].some(over)).toBe(false)
  })
  it('fades out before the edge of the generated field', () => {
    expect(routingFade(halfWidth + .2, 0, halfWidth, halfHeight)).toBe(1)
    expect(routingFade(halfWidth + 1.6, 0, halfWidth, halfHeight)).toBe(0)
    expect(routingFade(0, halfHeight + 1.6, halfWidth, halfHeight)).toBe(0)
  })
})
