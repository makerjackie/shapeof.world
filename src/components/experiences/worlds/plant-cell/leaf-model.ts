import * as THREE from 'three'

/** All layer geometry is expressed in micrometres, sharing the cell at the origin. */
export const LEAF_DIMENSIONS = { length: 120_000, width: 80_000, thickness: 500 } as const

export function leafHalfWidth(t: number) {
  const shoulder = 1 + 0.15 * Math.exp(-(((t - 0.25) / 0.11) ** 2))
  return 40_000 * Math.sin(Math.PI * t) ** 0.79 * shoulder / 1.04
}

export function leafHeight(x: number, y: number) {
  // The anchor at (0, 0) is on the blade, beside the midrib.
  return 1_200 * Math.sin(y / 19_000) + 5_600 * (x / 40_000) ** 2 * Math.sin(y / 26_000 + 0.7)
    + 680 * Math.sin(x / 3_100 + y / 11_000) * Math.abs(x / 40_000) ** 1.25
    + 550 * (Math.exp(-(((x + 1_000) / 1_600) ** 2)) - Math.exp(-((1_000 / 1_600) ** 2)))
}

export function createLeafGeometry() {
  const columns = 100
  const rows = 160
  const positions: number[] = []
  const uv: number[] = []
  const indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const t = Math.max(0.00005, Math.min(0.99995, row / rows))
    const y = (t - 0.5) * LEAF_DIMENSIONS.length
    const width = leafHalfWidth(t)
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1
      const edgeRipple = 1 + 0.015 * Math.sin(t * 71) * Math.abs(u) ** 7
      const x = width * u * edgeRipple + 950 * Math.sin(t * Math.PI * 2)
      positions.push(x, y, leafHeight(x, y))
      uv.push(x / 80_000 + 0.5, t)
      if (column < columns && row < rows) {
        const a = row * (columns + 1) + column
        const b = a + columns + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function seededLeafRandom(seed = 7281) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
}

/** Open toward +z, with straight palisade walls and rounded end caps. */
export function createOpenCellGeometry() {
  const geometry = new THREE.CapsuleGeometry(1, 8 / 3, 5, 16)
  const index = geometry.index!
  const positions = geometry.getAttribute('position')
  const kept: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
    if (positions.getZ(a) + positions.getZ(b) + positions.getZ(c) <= 0.0001) kept.push(a, b, c)
  }
  geometry.setIndex(kept)
  return geometry
}

export type SectionCell = {
  x: number; y: number; z: number
  rx: number; ry: number; rz: number
  angle: number; kind: 'palisade' | 'sponge' | 'epidermis'
}

export function sectionCells(): SectionCell[] {
  const random = seededLeafRandom()
  const cells: SectionCell[] = []
  // The front row has a single reference cell centred exactly at the layer anchor.
  for (let depth = 0; depth < 3; depth++) {
    for (let column = -17; column <= 17; column++) {
      const central = depth === 0 && column === 0
      cells.push({
        x: column * 31.8 + (depth ? 6 * random() : 0),
        y: central ? 0 : (random() - 0.5) * 4,
        z: -depth * 31,
        rx: central ? 15 : 13.8 + random() * 1.8,
        ry: central ? 15 : 14.3 + random() * 1.3,
        rz: central ? 15 : 13.8 + random() * 1.8,
        angle: central ? 0 : (random() - 0.5) * 0.05,
        kind: 'palisade',
      })
    }
  }
  // Air spaces are genuine gaps between irregular, loosely packed mesophyll cells.
  for (let row = 0; row < 4; row++) {
    for (let column = -7; column <= 7; column++) {
      const x = column * 74 + (random() - 0.5) * 38
      const y = -92 - row * 91 + (random() - 0.5) * 35
      // Reserve a cavity around the small vascular bundle.
      if (Math.hypot((x - 260) / 1.5, y + 190) < 82) continue
      cells.push({x, y, z: -25 - random() * 50, rx: 22 + random() * 15, ry: 15 + random() * 9, rz: 22 + random() * 8,
        angle: (random() - 0.5) * 1.65, kind: 'sponge'})
    }
  }
  for (let column = -15; column <= 15; column++) {
    cells.push({x: column * 36, y: 46, z: -27, rx: 17.8, ry: 4.6, rz: 45,
      angle: 0, kind: 'epidermis'})
    if (Math.abs(column) !== 3) cells.push({x: column * 36, y: -442, z: -27, rx: 17.8, ry: 4.8, rz: 45,
      angle: 0, kind: 'epidermis'})
  }
  return cells
}
