import * as THREE from 'three'

/** Physical frame shared with L1/L2: x = width, +y = adaxial, -z = leaf tip. */
export const LEAF_DIMENSIONS = { length: 120_000, width: 80_000, thickness: 500 } as const
export const LEAF_ENTRY: [number, number, number] = [15.5, 60, -15.5]
export const LEAF_TOP_UM = 60
export const LEAF_BOTTOM_UM = -440
export const LEAF_MIDRIB_X = -1500

/** Entire margin with a broad basal shoulder; no high-frequency serrations. */
export function leafHalfWidth(t: number) {
  const shoulder = 1 + .19 * Math.exp(-(((t - .23) / .14) ** 2))
  return 40_000 * Math.sin(Math.PI * Math.max(0, Math.min(1, t))) ** .78 * shoulder / 1.08
}

function rawRelief(x: number, z: number) {
  const u = x - LEAF_MIDRIB_X, v = -z
  const macro = 1600 * Math.sin(v / 22000) + 6500 * (u / 40000) ** 2 * Math.sin(v / 31000 + .6)
  const folded = 580 * Math.sin(u / 4500 + v / 15000) * Math.abs(u / 40000) ** .6
  // Rounded interveinal pillows, not fine serrations at the margin.
  const a = Math.sin((u + .35 * v) / 1050), b = Math.sin((v - .21 * u) / 1420)
  const pillows = 95 * (a * a) * (b * b) + 32 * Math.sin(u / 360 + Math.sin(v / 700))
  return macro + folded + pillows
}
const entryHeight = rawRelief(LEAF_ENTRY[0], LEAF_ENTRY[2])
const entryDx = (rawRelief(LEAF_ENTRY[0] + 1, LEAF_ENTRY[2]) - rawRelief(LEAF_ENTRY[0] - 1, LEAF_ENTRY[2])) / 2
const entryDz = (rawRelief(LEAF_ENTRY[0], LEAF_ENTRY[2] + 1) - rawRelief(LEAF_ENTRY[0], LEAF_ENTRY[2] - 1)) / 2

/** Exactly y=60 and horizontal at the anchor pore. Nearby relief is reduced to
 * let the epidermal patch and the cell beneath share one physical surface. */
export function leafSurfaceY(x: number, z: number) {
  const dx = x - LEAF_ENTRY[0], dz = z - LEAF_ENTRY[2]
  const radius = Math.hypot(dx, dz)
  const localFlatten = Math.exp(-((radius / 950) ** 2))
  return LEAF_TOP_UM + rawRelief(x, z) - entryHeight - (entryDx * dx + entryDz * dz) * localFlatten
}

export function createLeafGeometry() {
  // Resolve the same analytic relief below the microscopic domes. Coarse blade
  // triangles must not pass above the epidermis when the camera dives toward it.
  const horizontal = Array.from({length: 161}, (_, i) => -1 + i / 80)
  for (let u = -.02; u <= .105; u += .0005) horizontal.push(u)
  const us = [...new Set(horizontal.map((value) => Number(value.toFixed(7))))].sort((a, b) => a - b)
  const longitudinal = Array.from({length: 241}, (_, i) => -60000 + i * 500)
  for (let v = -1900; v <= 1900; v += 25) longitudinal.push(v)
  const vs = [...new Set(longitudinal)].sort((a, b) => a - b)
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  for (let row = 0; row < vs.length; row++) {
    const v = Math.max(-59994, Math.min(59994, vs[row]))
    const t = v / LEAF_DIMENSIONS.length + .5, width = leafHalfWidth(t)
    for (let column = 0; column < us.length; column++) {
      const u = us[column]
      const ripple = 1 + .008 * Math.sin(t * Math.PI * 5.2) * Math.abs(u) ** 8
      const x = LEAF_MIDRIB_X + width * u * ripple + 700 * Math.sin(t * Math.PI * 2)
      const z = -v
      positions.push(x, leafSurfaceY(x, z), z)
      uv.push((x - LEAF_MIDRIB_X) / 80000 + .5, t)
      if (column < us.length - 1 && row < vs.length - 1) {
        const a = row * us.length + column, b = a + us.length
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

export function seededLeafRandom(seed = 7281) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
}
