import {describe, expect, it} from 'vitest'

import {MATERIALS, PARTS} from './parts'

describe('museum display part data', () => {
  it('gives each part and independently rendered half a unique identifier', () => {
    const parts = PARTS.filter((part) => part.configuration === 'implosion')
    expect(parts.length).toBeGreaterThan(0)
    expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length)
    const profileIds = parts.flatMap((part) => part.profiles.map((profile) => profile.id))
    expect(new Set(profileIds).size).toBe(profileIds.length)
    for (const part of parts) {
      expect(part.profiles.map((profile) => profile.id)).toEqual([`${part.id}-upper`, `${part.id}-lower`])
      expect(part.profiles[0].points).not.toBe(part.profiles[1].points)
    }
  })

  it('provides both languages and a valid material for every displayed part', () => {
    for (const part of PARTS.filter((item) => item.configuration === 'implosion')) {
      for (const key of ['name', 'nameEn', 'description', 'descriptionEn'] as const) {
        expect(part[key].trim(), `${part.id}.${key}`).not.toBe('')
      }
      expect(MATERIALS[part.material], part.id).toBeDefined()
      expect(part.scale.every((coordinate) => Number.isFinite(coordinate) && coordinate > 0)).toBe(true)
      expect(part.anchor.every(Number.isFinite)).toBe(true)
    }
  })

  it('supplies closed, finite meridians with a nonzero area for solid section faces', () => {
    for (const part of PARTS.filter((item) => item.configuration === 'implosion')) {
      for (const profile of part.profiles) {
        const points = profile.points
        expect(points.length, profile.id).toBeGreaterThan(3)
        expect(points.at(-1), profile.id).toEqual(points[0])
        expect(points.every(([r, z]) => Number.isFinite(r) && r >= 0 && Number.isFinite(z)), profile.id).toBe(true)
        const signedDoubleArea = points.slice(1).reduce((sum, [r, z], index) => {
          const [previousR, previousZ] = points[index]
          return sum + previousR * z - r * previousZ
        }, 0)
        expect(Math.abs(signedDoubleArea), profile.id).toBeGreaterThan(0)
        const upper = profile.id.endsWith('-upper')
        expect(points.every(([, z]) => upper ? z >= 0 : z <= 0), profile.id).toBe(true)
      }
    }
  })

  it('keeps lower halves seated while upper shells rise in layer order', () => {
    const parts = PARTS.filter((part) => part.configuration === 'implosion').sort((a, b) => a.order - b.order)
    let previousRise = Infinity
    for (const part of parts) {
      const upper = part.profiles.find((profile) => profile.id.endsWith('-upper'))!
      const lower = part.profiles.find((profile) => profile.id.endsWith('-lower'))!
      expect(lower.displacement, part.id).toEqual([0, 0, 0])
      expect(upper.displacement[0], part.id).toBe(0)
      expect(upper.displacement[2], part.id).toBe(0)
      expect(upper.displacement[1], part.id).toBeLessThan(previousRise)
      expect(upper.displacement[1], part.id).toBeGreaterThanOrEqual(0)
      if (part.id === 'source') expect(upper.displacement).toEqual([0, 0, 0])
      else expect(upper.displacement[1], part.id).toBeGreaterThan(0)
      previousRise = upper.displacement[1]
    }
  })
})
