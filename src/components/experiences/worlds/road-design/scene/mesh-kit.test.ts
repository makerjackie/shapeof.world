import { describe, expect, it } from 'vitest'
import { planarPolygon, strip } from './mesh-kit'

describe('road surface lighting normals', () => {
  it('keeps the upper road surface facing the lamps on every heading and grade', () => {
    for (let heading = 0; heading < Math.PI * 2; heading += Math.PI / 4) {
      const road = strip([{ x: 0, y: 0, z: 0 }, { x: Math.cos(heading) * 30, y: 1.8, z: Math.sin(heading) * 30 }], 7.5, 0, 0.025, 0.06)
      const normal = road.getAttribute('normal')
      for (let i = 0; i < normal.count; i++) expect(normal.getY(i)).toBeGreaterThan(0.98)
      road.dispose()
    }
  })

  it('keeps mirrored junction footprints upward-facing in all four quadrants', () => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pavement = planarPolygon([{ x: 0, y: 0.14, z: 0 }, { x: 20 * sx, y: 0.14, z: 0 }, { x: 20 * sx, y: 0.14, z: 4 * sz }, { x: 4 * sx, y: 0.14, z: 4 * sz }, { x: 4 * sx, y: 0.14, z: 20 * sz }, { x: 0, y: 0.14, z: 20 * sz }])
      const normal = pavement.getAttribute('normal')
      for (let i = 0; i < normal.count; i++) expect(normal.getY(i)).toBeCloseTo(1)
      pavement.dispose()
    }
  })
})
