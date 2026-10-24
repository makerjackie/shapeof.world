import { describe, expect, it } from 'vitest'
import { createLeafGeometry, LEAF_ENTRY, leafHalfWidth, leafSurfaceY } from './leaf-model'
import { createEpidermis, createGuardGeometry, guardCellMatrices } from './leaf-surface-geometry'

describe('leaf surface shares the mesophyll frame', () => {
  it('registers the entry pore exactly on the upper surface with an upward local normal', () => {
    const [x, y, z] = LEAF_ENTRY
    expect(leafSurfaceY(x, z)).toBe(y)
    expect(Math.abs(leafSurfaceY(x + 1, z) - leafSurfaceY(x - 1, z))).toBeLessThan(1e-5)
    expect(Math.abs(leafSurfaceY(x, z + 1) - leafSurfaceY(x, z - 1))).toBeLessThan(1e-5)
  })

  it('has an entire tapered outline and genuinely non-planar geometry', () => {
    expect(leafHalfWidth(0)).toBe(0)
    expect(leafHalfWidth(1)).toBeLessThan(1e-5)
    const geometry = createLeafGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const bladeLength=box.max.z-box.min.z, bladeWidth=box.max.x-box.min.x
    expect(bladeLength/bladeWidth).toBeGreaterThan(1.4)
    expect(bladeLength/bladeWidth).toBeLessThan(1.8)
    expect(box.max.z).toBeGreaterThan(68000) // lobes extend back past the 60 mm insertion
    const positions=geometry.getAttribute('position')
    let left=false,right=false
    for(let i=0;i<positions.count;i++)if(positions.getZ(i)>66000){left ||= positions.getX(i)<-12000;right ||=positions.getX(i)>9000}
    expect(left&&right).toBe(true)
    expect(box.max.y - box.min.y).toBeGreaterThan(4000)
    expect(box.max.x - box.min.x).toBeGreaterThan(70000)
    const normal = geometry.getAttribute('normal')
    expect(normal.getY(Math.floor(normal.count / 2))).toBeGreaterThan(.5)
    geometry.dispose()
  })

  it('builds finite jigsaw domes and preserves the same entry pore in the mobile detail mesh', () => {
    const { geometry, stomata } = createEpidermis(true)
    expect(stomata[0]).toEqual({ x: LEAF_ENTRY[0], z: LEAF_ENTRY[2], angle: 0 })
    for (const attribute of ['position', 'normal']) {
      expect(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true)
    }
    const positions = geometry.getAttribute('position')
    let raised = false
    for (let i = 0; i < positions.count; i++) if (positions.getY(i) - leafSurfaceY(positions.getX(i), positions.getZ(i)) > 3) { raised = true; break }
    expect(raised).toBe(true)
    geometry.dispose()
  })

  it('keeps the guard tips fixed while moving their chloroplasts with the opening body', () => {
    const stomata = [{ x: LEAF_ENTRY[0], z: LEAF_ENTRY[2], angle: 0 }]
    const closed = guardCellMatrices(stomata, 0), open = guardCellMatrices(stomata, 1)
    expect(open.guards.map((m) => m.elements)).toEqual(closed.guards.map((m) => m.elements))
    expect(Math.abs(open.chloroplasts[3].elements[12] - closed.chloroplasts[3].elements[12])).toBeGreaterThan(3)
    const geometry = createGuardGeometry()
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBe(25)
    geometry.dispose()
  })
})
