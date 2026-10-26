import { describe, expect, it } from 'vitest'
import { CHLOROPLAST_RADII, ENTRY_GRANUM, GRANUM_SECTION_ANCHOR_LOCAL, GRANUM_SECTION_Y, createChloroplastMorphology, getThylakoidDimensions } from './chloro-model'

describe('thylakoid ultrastructure', () => {
  it('preserves the measured dark and light repeat distances and cavity identity', () => {
    const dark = getThylakoidDimensions(0), light = getThylakoidDimensions(500)
    expect(dark.repeat * 1000).toBeCloseTo(16.3, 8)
    expect(light.repeat * 1000).toBeCloseTo(19.1, 8)
    expect(dark.lumen * 1000).toBeCloseTo(4.7, 8)
    expect(light.lumen * 1000).toBeCloseTo(9.2, 8)
    for (const irradiance of [-1, 0, 100, 400, 500, 2000, NaN]) {
      const d = getThylakoidDimensions(irradiance)
      expect(d.repeat).toBeCloseTo(2 * d.membrane + d.lumen + d.partition, 12)
      expect(d.membrane).toBeGreaterThanOrEqual(0.0033)
      expect(d.repeat).toBeLessThanOrEqual(0.0191 + Number.EPSILON)
    }
    // Expansion comes from the lumen; the bilayer itself becomes slightly thinner.
    expect(light.membrane).toBeLessThan(dark.membrane)
    expect(light.lumen).toBeGreaterThan(dark.lumen)
  })

  it('keeps 32 non-overlapping parallel stacks inside the lens', () => {
    const { grana, connections } = createChloroplastMorphology()
    expect(grana).toHaveLength(32)
    expect(grana[0]).toEqual(ENTRY_GRANUM)
    for (const [i, granum] of grana.entries()) {
      expect(granum.layers).toBeGreaterThanOrEqual(5)
      expect(granum.layers).toBeLessThanOrEqual(25)
      const maximumHeight = granum.layers * getThylakoidDimensions(500).repeat / 2
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const x = granum.center[0] + sx * granum.radius * Math.SQRT1_2
        const y = granum.center[1] + sy * granum.radius * Math.SQRT1_2
        const z = Math.abs(granum.center[2]) + maximumHeight
        expect((x / CHLOROPLAST_RADII[0]) ** 2 + (y / CHLOROPLAST_RADII[1]) ** 2 + (z / CHLOROPLAST_RADII[2]) ** 2).toBeLessThan(1)
      }
      for (const other of grana.slice(i + 1)) expect(Math.hypot(granum.center[0] - other.center[0], granum.center[1] - other.center[1])).toBeGreaterThan(granum.radius + other.radius)
    }
    for (const [a, b] of connections) { expect(grana[a]).toBeDefined(); expect(grana[b]).toBeDefined(); expect(a).not.toBe(b) }
  })

  it('aims the deepest frame through a real section with at least ten repeats', () => {
    expect(GRANUM_SECTION_ANCHOR_LOCAL).toEqual([ENTRY_GRANUM.center[0], GRANUM_SECTION_Y, ENTRY_GRANUM.center[2]])
    expect(Math.abs(GRANUM_SECTION_Y - ENTRY_GRANUM.center[1])).toBeLessThan(ENTRY_GRANUM.radius)
    // 316 nm width / 1.6 desktop aspect = 198 nm high, just over ten illuminated repeats.
    expect(0.316 / 1.6 / getThylakoidDimensions(500).repeat).toBeGreaterThan(10)
    expect(ENTRY_GRANUM.layers).toBeGreaterThan(20)
    expect(createChloroplastMorphology().grana.slice(1).some((g) => g.center[1] < ENTRY_GRANUM.center[1] && Math.abs(g.center[0] - ENTRY_GRANUM.center[0]) < 0.43)).toBe(false)
  })
})
