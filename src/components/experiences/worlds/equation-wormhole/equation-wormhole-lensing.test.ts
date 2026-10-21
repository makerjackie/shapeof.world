import { describe, expect, it } from 'vitest'
import { lensSource } from './equation-wormhole-lensing'
import { buildShapeInstances, shapeFrame } from './equation-wormhole-shapes'

describe('black-hole optics and infall', () => {
  it('keeps the shadow unchanged and bends surrounding images continuously', () => {
    const radius = 0.16
    expect(lensSource(0, 0, radius, 0)).toEqual([0, 0])
    expect(lensSource(0.08, 0, radius, 0)).toEqual([0.08, 0])
    const a = lensSource(radius - 1e-7, 0, radius, 0)
    const b = lensSource(radius + 1e-7, 0, radius, 0)
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(1e-6)
    const bent = lensSource(radius * 1.5, 0, radius, 0)
    expect(Math.hypot(...bent)).toBeGreaterThan(radius * 1.7)
    expect(bent[1]).toBeGreaterThan(0)
    expect(lensSource(radius * 1.5, 0, radius, 1)[1]).toBe(0)
    expect(Math.abs(lensSource(2, 0, radius, 0)[0] - 2)).toBeLessThan(1e-5)
  })
  it('never stretches sampled screen edges into streaks, including close mobile views', () => {
    for (const aspect of [390 / 844, 1, 1.6]) for (const radius of [0.1, 0.2, 0.5, 0.8]) {
      for (let ix = 0; ix <= 40; ix++) for (let iy = 0; iy <= 40; iy++) {
        const x = (ix / 40 - 0.5) * aspect, y = iy / 40 - 0.5
        const source = lensSource(x, y, radius, 0.2, aspect)
        expect(Math.abs(source[0])).toBeLessThanOrEqual(aspect / 2 + 1e-10)
        expect(Math.abs(source[1])).toBeLessThanOrEqual(0.5 + 1e-10)
      }
    }
  })
  it('moves material inward and hides its periodic reset instead of flashing', () => {
    const instances = buildShapeInstances('blackhole', [2, 5, 10])
    const p = instances.find(p => p.c === 2 && p.b > 20)!
    const radial = (time: number) => { const f = shapeFrame('blackhole', p, time); return Math.hypot(f.pos[0], f.pos[2]) }
    expect(radial(4)).toBeLessThan(radial(0) - 1)
    const wrapTime = (p.b - 6.6) / 0.48
    for (const offset of [-0.001, 0.001]) {
      expect(shapeFrame('blackhole', p, wrapTime + offset).opacity).toBeLessThan(0.001)
    }
  })
})
