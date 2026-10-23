import type { ConflictPoint, Network, SchematicMovement, Vec3 } from './types'

const EPSILON = 1e-7
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

function intersection(a: Vec3, b: Vec3, c: Vec3, d: Vec3): Vec3 | undefined {
  const rx = b.x - a.x, rz = b.z - a.z, sx = d.x - c.x, sz = d.z - c.z
  const denominator = rx * sz - rz * sx
  // Coincident sections describe shared traffic, not crossing conflicts.
  if (Math.abs(denominator) < EPSILON) return
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / denominator
  const u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / denominator
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) return
  const y = a.y + (b.y - a.y) * t, otherY = c.y + (d.y - c.y) * u
  // Deck height, rather than a route-level label, handles a ramp changing levels.
  if (Math.abs(y - otherY) > 2.5) return
  return { x: a.x + rx * t, y: (y + otherY) / 2, z: a.z + rz * t }
}

function sharesPhase(a: SchematicMovement, b: SchematicMovement, network: Network): boolean {
  if (network.control.kind !== 'signal') return true
  return Boolean(network.control.phases?.some(phase => phase.groups.includes(a.signalGroup ?? '') && phase.groups.includes(b.signalGroup ?? '')))
}

function sharedSectionVertices(a: Vec3[], b: Vec3[]): Set<string> {
  const edges = new Set(b.slice(1).map((p, i) => edgeKey(b[i], p)))
  const shared = new Set<string>()
  for (let i = 1; i < a.length; i++) if (edges.has(edgeKey(a[i - 1], a[i]))) {
    shared.add(pointKey(a[i - 1]))
    shared.add(pointKey(a[i]))
  }
  return shared
}
const pointKey = (p: Vec3) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)},${Math.round(p.z * 1000)}`
const edgeKey = (a: Vec3, b: Vec3) => [pointKey(a), pointKey(b)].sort().join('|')

/** Locate the branch in the actual path, including shared highway approach segments. */
function branchPosition(a: Vec3[], b: Vec3[], reverse: boolean): Vec3 {
  const aa = reverse ? [...a].reverse() : a, bb = reverse ? [...b].reverse() : b
  let last = aa[0]
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
    if (distance(aa[i], bb[i]) > 0.05) break
    last = aa[i]
  }
  return { ...last }
}

/**
 * Movement-level FHWA convention: k branches contribute k−1 merge/diverge
 * events, and every distinct interior same-height path intersection is a crossing.
 * No design identifiers or expected reference counts enter this calculation.
 */
export function calculateConflicts(network: Network): ConflictPoint[] {
  const paths = network.schematicMovements
  const conflicts: ConflictPoint[] = []
  for (const [property, type] of [['from', 'diverge'], ['to', 'merge']] as const) {
    const groups = new Map<string, SchematicMovement[]>()
    for (const movement of paths) groups.set(movement[property], [...(groups.get(movement[property]) ?? []), movement])
    for (const group of groups.values()) {
      const turnOrder = { left: 0, straight: 1, right: 2 }
      group.sort((a, b) => turnOrder[a.turn] - turnOrder[b.turn])
      // A spanning tree counts a three-way branch twice, not three pairwise times.
      for (let i = 1; i < group.length; i++) {
        const a = group[i - 1], b = group[i]
        conflicts.push({ id: `${type}-${a.id}-${b.id}`, type, position: branchPosition(a.points, b.points, type === 'merge'), movements: [a.id, b.id], separatedBySignal: false })
      }
    }
  }
  for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
    const a = paths[i], b = paths[j]
    if (a.from === b.from || a.to === b.to) continue
    const shared = sharedSectionVertices(a.points, b.points)
    const intersections: Vec3[] = []
    for (let ai = 1; ai < a.points.length; ai++) for (let bi = 1; bi < b.points.length; bi++) {
      const p = intersection(a.points[ai - 1], a.points[ai], b.points[bi - 1], b.points[bi])
      if (!p) continue
      // Joining or leaving a shared section is a merge/diverge or weaving event.
      // The first tiny chord of a tangent curve must not become a false crossing.
      if (shared.has(pointKey(p))) continue
      // A connection endpoint belongs to the merge/diverge accounting above.
      if ([a.points[0], a.points[a.points.length - 1], b.points[0], b.points[b.points.length - 1]].some(endpoint => distance(endpoint, p) < 0.1)) continue
      if (intersections.some(existing => distance(existing, p) < 0.25)) continue
      intersections.push(p)
    }
    intersections.forEach((position, index) => conflicts.push({ id: `crossing-${a.id}-${b.id}-${index}`, type: 'crossing', position, movements: [a.id, b.id], separatedBySignal: !sharesPhase(a, b, network) }))
  }
  return conflicts
}

export function summarizeConflicts(conflicts: ConflictPoint[]) {
  return { total: conflicts.length, crossing: conflicts.filter(p => p.type === 'crossing').length, merge: conflicts.filter(p => p.type === 'merge').length, diverge: conflicts.filter(p => p.type === 'diverge').length }
}
