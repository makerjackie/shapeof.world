import { describe, expect, it } from 'vitest'
import * as T from 'three'
import { LEAF_ENTRY } from './leaf-model'
import { createSectionCells, createTissueGeometry, createXylemGeometry, SECTION_BOUNDS, SECTION_STOMATA } from './leaf-section-model'

describe('leaf section has one registered 500 µm tissue stack', () => {
  it('keeps the hero at the origin, the 25 µm epidermis above it, and the same entry pore', () => {
    const cells = createSectionCells()
    const palisade = cells.filter((cell) => cell.kind === 'palisade')
    expect(palisade.every((cell) => cell.center.y === 0 && cell.radii.y === 35)).toBe(true)
    const hero = palisade.find((cell) => cell.center.lengthSq() === 0)!
    expect(hero.radii.toArray()).toEqual([15, 35, 15])
    const upper = cells.filter((cell) => cell.kind === 'epidermis' && cell.center.y > 0)
    expect(upper.every((cell) => cell.center.y - cell.radii.y === 35 && cell.center.y + cell.radii.y === 60)).toBe(true)
    expect(SECTION_STOMATA[0]).toEqual({ x: LEAF_ENTRY[0], z: LEAF_ENTRY[2], angle: 0 })
    expect(SECTION_BOUNDS.max[1] - SECTION_BOUNDS.min[1]).toBe(500)
  })

  it('uses small spongy bodies and a finite slab inside the declared bounds', () => {
    const cells = createSectionCells()
    for (const cell of cells.filter((candidate) => candidate.kind === 'sponge')) {
      expect(Math.max(...cell.radii.toArray()) * 2).toBeLessThanOrEqual(40)
      expect(Math.min(...cell.radii.toArray()) * 2).toBeGreaterThanOrEqual(20)
    }
    for (const cell of cells.filter((candidate) => candidate.kind === 'sponge').sort((a, b) => a.radii.lengthSq() - b.radii.lengthSq()).slice(0, 12)) {
      const shape = createTissueGeometry([cell]); shape.computeBoundingBox()
      const size = shape.boundingBox!.getSize(new T.Vector3()).toArray()
      expect(Math.min(...size)).toBeGreaterThanOrEqual(20)
      expect(Math.max(...size)).toBeLessThanOrEqual(40)
      shape.dispose()
    }
    const geometry = createTissueGeometry(cells)
    geometry.computeBoundingBox()
    const bounds = new T.Box3(new T.Vector3(...SECTION_BOUNDS.min), new T.Vector3(...SECTION_BOUNDS.max))
    expect(bounds.containsBox(geometry.boundingBox!), JSON.stringify(geometry.boundingBox)).toBe(true)
    expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true)
    geometry.dispose()
  })

  it('makes separate closed hollow vessel walls and inner helical ridges', () => {
    const { wall, spiral } = createXylemGeometry()
    const vertices = wall.getAttribute('position')
    for (let i = 0; i < vertices.count; i++) {
      const vessel = Math.floor(i / (vertices.count / 8)), x = 260 + (vessel % 4 - 1.5) * 20, y = -188 + Math.floor(vessel / 4) * 20
      const radius = Math.hypot(vertices.getX(i) - x, vertices.getY(i) - y)
      expect(radius).toBeGreaterThanOrEqual(7.3 + vessel % 3 * .6 - 1.251)
    }
    for (const geometry of [wall, spiral]) {
      expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true)
      geometry.dispose()
    }
  })
})
