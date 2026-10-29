import { BufferGeometry, Float32BufferAttribute } from 'three'

/** Illustrative routing around the standard cell. Procedural, not extracted from the GDS.
 * The cell sits in a row of neighbouring cells; the VPWR/VGND rails run unbroken along each row boundary.
 * Signal wiring follows the SKY130 routing grid: M1 horizontal on a 0.34 μm pitch, M2 vertical on 0.46 μm,
 * 0.14 μm wide, as long runs with a few jogs through V1 plugs. Signal wiring never crosses the cell.
 * Lengths are in micrometres from the cell centre; the cell's mask bounds are `halfWidth` × `halfHeight`.
 */
export type RoutingSegment = { x0: number; x1: number; z0: number; z1: number }
export type Routing = { m1: RoutingSegment[]; m2: RoutingSegment[]; v1: RoutingSegment[]; cells: RoutingSegment[]; rails: number[]; occupancy: { m1: number; m2: number } }

export const M1_PITCH = .34, M2_PITCH = .46, WIRE = .14, VIA = .15, RAIL = .48, SITE = .46
const GAP = .14, END = WIRE / 2
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
function random(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}

export function routingSpan(halfWidth: number, halfHeight: number) {
  return { spanX: halfWidth + 2.1, spanZ: halfHeight + 2 }
}

export function cellRouting(halfWidth: number, halfHeight: number, railZ: number[], seed = 11): Routing {
  const rand = random(seed), margin = .12
  const keepX = halfWidth + margin, keepZ = halfHeight + margin
  const { spanX, spanZ } = routingSpan(halfWidth, halfHeight)
  const row = Math.abs(railZ[1] - railZ[0]), base = Math.min(...railZ)
  const rails: number[] = []
  for (let n = -3; n <= 3; n++) { const z = base + n * row; if (Math.abs(z) <= spanZ - RAIL / 2) rails.push(z) }
  const m1: RoutingSegment[] = [], m2: RoutingSegment[] = [], v1: RoutingSegment[] = [], cells: RoutingSegment[] = []

  // Neighbouring cells, a whole number of placement sites wide, abutting along each row.
  const place = (bottom: number, top: number, from: number, to: number, dir: 1 | -1) => {
    for (let at = from; dir > 0 ? at < to : at > to;) {
      const end = dir > 0 ? Math.min(to, at + SITE * (2 + Math.floor(rand() * 6))) : Math.max(to, at - SITE * (2 + Math.floor(rand() * 6)))
      if (Math.abs(end - at) > SITE) cells.push({ x0: Math.min(at, end) + .02, x1: Math.max(at, end) - .02, z0: bottom + .02, z1: top - .02 })
      at = end
    }
  }
  const edges = [-spanZ, ...rails, spanZ]
  for (let r = 0; r < edges.length - 1; r++) {
    const bottom = edges[r], top = edges[r + 1]
    if (top - bottom < SITE) continue
    if (bottom < 0 && top > 0) { place(bottom, top, keepX, spanX, 1); place(bottom, top, -keepX, -spanX, -1) }
    else place(bottom, top, -spanX + rand() * SITE * 2, spanX, 1)
  }

  // The routing grid. M1 tracks share the rails' phase; tracks next to a rail are left to the rail.
  const tracksZ: number[] = []
  for (let z = base - row * 3; z <= spanZ - END; z += M1_PITCH) if (z >= -spanZ + END) tracksZ.push(z)
  const signalZ = tracksZ.map(z => !rails.some(r => Math.abs(z - r) < RAIL / 2 + WIRE / 2 + GAP))
  const tracksX: number[] = []
  for (let x = M2_PITCH / 2 - Math.ceil(spanX / M2_PITCH) * M2_PITCH; x <= spanX - END; x += M2_PITCH) if (x >= -spanX + END) tracksX.push(x)
  const usedM1 = tracksZ.map(() => [] as [number, number][]), usedM2 = tracksX.map(() => [] as [number, number][])
  const free = (used: [number, number][], a: number, b: number) => used.every(([p, q]) => b + GAP <= p || a >= q + GAP)
  const okH = (k: number, a: number, b: number) => signalZ[k] && free(usedM1[k], a, b) && !(Math.abs(tracksZ[k]) < keepZ + WIRE / 2 && b > -keepX && a < keepX)
  const okV = (j: number, a: number, b: number) => free(usedM2[j], a, b) && !(Math.abs(tracksX[j]) < keepX + WIRE / 2 && b > -keepZ && a < keepZ)
  const lengthOf = (list: RoutingSegment[], horizontal: boolean) => list.reduce((sum, s) => sum + (horizontal ? s.x1 - s.x0 : s.z1 - s.z0), 0)
  const capacityM1 = signalZ.filter(Boolean).length * 2 * spanX, capacityM2 = tracksX.length * 2 * spanZ
  const target = .4

  for (let attempt = 0; attempt < 900; attempt++) {
    const needM1 = lengthOf(m1, true) < target * capacityM1, needM2 = lengthOf(m2, false) < target * capacityM2
    if (!needM1 && !needM2) break
    let horizontal = needM1 && (!needM2 || rand() < .5)
    let j = Math.floor(rand() * tracksX.length), k = Math.floor(rand() * tracksZ.length)
    if (!signalZ[k]) continue
    const legs = 1 + (rand() < .55 ? 1 : 0) + (rand() < .3 ? 1 : 0)
    for (let leg = 0; leg < legs; leg++) {
      const dir = rand() < .5 ? -1 : 1
      // Long runs: 1.5–4.5 μm, stopped early by the cell, the edge of the field, or another wire.
      const want = 1.5 + rand() * 3
      let end = horizontal ? j : k
      const at = (i: number) => horizontal ? tracksX[i] : tracksZ[i]
      const count = horizontal ? tracksX.length : tracksZ.length
      while (end + dir >= 0 && end + dir < count && Math.abs(at(end + dir) - at(horizontal ? j : k)) <= want) {
        const a = Math.min(at(horizontal ? j : k), at(end + dir)) - END, b = Math.max(at(horizontal ? j : k), at(end + dir)) + END
        if (!(horizontal ? okH(k, a, b) : okV(j, a, b))) break
        end += dir
      }
      if (!horizontal) while (end !== k && !signalZ[end]) end -= dir
      const a = Math.min(at(horizontal ? j : k), at(end)) - END, b = Math.max(at(horizontal ? j : k), at(end)) + END
      if (b - a < (leg === 0 ? 1.2 : .6)) break
      if (horizontal) { m1.push({ x0: a, x1: b, z0: tracksZ[k] - WIRE / 2, z1: tracksZ[k] + WIRE / 2 }); usedM1[k].push([a, b]) }
      else { m2.push({ x0: tracksX[j] - WIRE / 2, x1: tracksX[j] + WIRE / 2, z0: a, z1: b }); usedM2[j].push([a, b]) }
      if (leg > 0) { const x = tracksX[j], z = tracksZ[k]; v1.push({ x0: x - VIA / 2, x1: x + VIA / 2, z0: z - VIA / 2, z1: z + VIA / 2 }) }
      if (horizontal) j = end; else k = end
      horizontal = !horizontal
    }
  }
  const occupancy = { m1: lengthOf(m1, true) / capacityM1, m2: lengthOf(m2, false) / capacityM2 }
  // The power rails run unbroken along each row; over the cell they are its own real M1 rails.
  for (const z of rails) m1.push({ x0: -spanX, x1: spanX, z0: z - RAIL / 2, z1: z + RAIL / 2 })
  return { m1, m2, v1, cells, rails, occupancy }
}

/** Strength by distance from the cell: full beside it, gone by the edge of the field, so there is no box. */
export function routingFade(x: number, z: number, halfWidth: number, halfHeight: number) {
  const dx = Math.max(0, Math.abs(x) - halfWidth), dz = Math.max(0, Math.abs(z) - halfHeight)
  // Only the rails cross the cell; there they stay faint, so the cell remains the subject.
  const inside = Math.abs(z) < halfHeight + .3 ? 1 - .7 * smooth(-.05, -.25, Math.abs(x) - halfWidth) : 1
  return inside * (1 - smooth(.3, 1.9, Math.hypot(dx, dz)))
}

/** Flat ribbons with per-vertex brightness and alpha, so a faded wire vanishes instead of turning into a dark bar.
 * Long wires are cut into short pieces so the fade follows the distance. */
export function routingGeometry(segments: RoutingSegment[], scale: number, fade: (x: number, z: number) => number) {
  const positions: number[] = [], colors: number[] = []
  const quad = (x0: number, x1: number, z0: number, z1: number) => {
    const corners: [number, number][] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
    for (const c of [0, 1, 2, 0, 2, 3]) {
      const [x, z] = corners[c], f = fade(x, z)
      positions.push(x * scale, 0, -z * scale); colors.push(f, f, f, f)
    }
  }
  for (const s of segments) {
    const alongX = s.x1 - s.x0 >= s.z1 - s.z0, length = alongX ? s.x1 - s.x0 : s.z1 - s.z0
    const pieces = Math.max(1, Math.ceil(length / .25))
    for (let i = 0; i < pieces; i++) {
      const a = i / pieces, b = (i + 1) / pieces
      if (alongX) quad(s.x0 + (s.x1 - s.x0) * a, s.x0 + (s.x1 - s.x0) * b, s.z0, s.z1)
      else quad(s.x0, s.x1, s.z0 + (s.z1 - s.z0) * a, s.z0 + (s.z1 - s.z0) * b)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  geometry.setAttribute('normal', new Float32BufferAttribute(positions.map((_, i) => i % 3 === 1 ? 1 : 0), 3))
  geometry.computeBoundingSphere()
  return geometry
}
