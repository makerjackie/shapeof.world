import { BufferGeometry, Float32BufferAttribute } from 'three'

/** Illustrative M1/M2 routing around the standard cell. Procedural, not extracted from the GDS:
 * M1 runs horizontally (with the two power rails continuing along the row), M2 vertically,
 * and a few V1 plugs join them where they cross. Nothing is drawn over the cell itself.
 * Lengths are in micrometres from the cell centre; the cell is `halfWidth` × `halfHeight`.
 */
export type RoutingSegment = { x0: number; x1: number; z0: number; z1: number }
export type Routing = { m1: RoutingSegment[]; m2: RoutingSegment[]; v1: RoutingSegment[] }

const M1_PITCH = .34, M2_PITCH = .46, WIRE = .14, VIA = .15, RAIL = .48
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
function random(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}

export function cellRouting(halfWidth: number, halfHeight: number, railZ: number[], seed = 7): Routing {
  const rand = random(seed), margin = .12
  const keepX = halfWidth + margin, keepZ = halfHeight + margin
  const spanX = halfWidth + 2.6, spanZ = halfHeight + 2.4
  const m1: RoutingSegment[] = [], m2: RoutingSegment[] = [], v1: RoutingSegment[] = []
  // A run along one axis, broken where it would cross the cell.
  const clip = (a: number, b: number, blocked: boolean, keep: number) => !blocked ? [[a, b]] : [[a, Math.min(b, -keep)], [Math.max(a, keep), b]].filter(([p, q]) => q - p > .12)
  const runs = (span: number) => {
    const out: [number, number][] = []
    let at = -span + rand() * .8
    while (at < span) {
      const length = .5 + rand() * 2.2
      if (rand() < .62) out.push([at, Math.min(span, at + length)])
      at += length + .25 + rand() * .9
    }
    return out
  }
  for (const z of railZ) for (const [a, b] of clip(-spanX, spanX, Math.abs(z) < keepZ + RAIL / 2, keepX)) m1.push({ x0: a, x1: b, z0: z - RAIL / 2, z1: z + RAIL / 2 })
  for (let z = -spanZ + M1_PITCH / 2; z < spanZ; z += M1_PITCH) {
    if (railZ.some(r => Math.abs(z - r) < RAIL / 2 + WIRE / 2 + .14)) continue
    for (const [a, b] of runs(spanX)) for (const [p, q] of clip(a, b, Math.abs(z) < keepZ + WIRE / 2, keepX)) m1.push({ x0: p, x1: q, z0: z - WIRE / 2, z1: z + WIRE / 2 })
  }
  for (let x = -spanX + M2_PITCH / 2; x < spanX; x += M2_PITCH) {
    for (const [a, b] of runs(spanZ)) for (const [p, q] of clip(a, b, Math.abs(x) < keepX + WIRE / 2, keepZ)) m2.push({ x0: x - WIRE / 2, x1: x + WIRE / 2, z0: p, z1: q })
  }
  // A plug wherever an M2 wire ends on an M1 wire, plus a few mid-run crossings.
  for (const wire of m2) {
    const x = (wire.x0 + wire.x1) / 2
    for (const track of m1) {
      if (x - VIA / 2 < track.x0 || x + VIA / 2 > track.x1) continue
      const z = (track.z0 + track.z1) / 2
      if (z < wire.z0 + .05 || z > wire.z1 - .05) continue
      const end = Math.min(z - wire.z0, wire.z1 - z) < M1_PITCH
      if (end || rand() < .08) v1.push({ x0: x - VIA / 2, x1: x + VIA / 2, z0: z - VIA / 2, z1: z + VIA / 2 })
    }
  }
  return { m1, m2, v1 }
}

/** Brightness by distance from the cell: full beside it, gone by the edge of the field, so there is no box. */
export function routingFade(x: number, z: number, halfWidth: number, halfHeight: number) {
  const dx = Math.max(0, Math.abs(x) - halfWidth), dz = Math.max(0, Math.abs(z) - halfHeight)
  return 1 - smooth(.2, 1.5, Math.hypot(dx, dz))
}

/** Boxes with per-vertex brightness and alpha, so a faded wire vanishes instead of turning into a black bar. Long wires are cut into short pieces so the fade follows the distance. */
export function routingGeometry(segments: RoutingSegment[], scale: number, height: number, fade: (x: number, z: number) => number) {
  const positions: number[] = [], colors: number[] = []
  const quad = (corners: [number, number, number][]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z] = corners[k], f = fade(x, z)
      positions.push(x * scale, y, -z * scale); colors.push(f, f, f, f)
    }
  }
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const y0 = 0, y1 = height
    quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])
    quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]])
    quad([[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]])
    quad([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]])
    quad([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]])
  }
  for (const s of segments) {
    const alongX = s.x1 - s.x0 >= s.z1 - s.z0, length = alongX ? s.x1 - s.x0 : s.z1 - s.z0
    const pieces = Math.max(1, Math.ceil(length / .3))
    for (let i = 0; i < pieces; i++) {
      const a = i / pieces, b = (i + 1) / pieces
      if (alongX) box(s.x0 + (s.x1 - s.x0) * a, s.x0 + (s.x1 - s.x0) * b, s.z0, s.z1)
      else box(s.x0, s.x1, s.z0 + (s.z1 - s.z0) * a, s.z0 + (s.z1 - s.z0) * b)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
