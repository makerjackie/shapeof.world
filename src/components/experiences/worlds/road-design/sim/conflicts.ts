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

interface BranchGroup { position: Vec3; branches: Map<string, SchematicMovement[]> }

/** Shared directed edges identify physical joins/splits, including intermediate
 * ring junctions. A transverse crossing has no shared edge and is not a branch. */
function topologyBranches(network: Network): ConflictPoint[] {
  const paths = network.schematicMovements
  const groups: Record<'merge' | 'diverge', Map<string, BranchGroup>> = { merge: new Map(), diverge: new Map() }
  for (const movement of paths) for (let i = 1; i < movement.points.length - 1; i++) {
    const previous = pointKey(movement.points[i - 1]), here = pointKey(movement.points[i]), next = pointKey(movement.points[i + 1])
    for (const type of ['merge', 'diverge'] as const) {
      const common = type === 'merge' ? next : previous, branch = type === 'merge' ? previous : next
      const key = `${here}|${common}`
      let group = groups[type].get(key)
      if (!group) { group = { position: movement.points[i], branches: new Map() }; groups[type].set(key, group) }
      group.branches.set(branch, [...(group.branches.get(branch) ?? []), movement])
    }
  }
  const result: ConflictPoint[] = []
  for (const type of ['diverge', 'merge'] as const) for (const group of groups[type].values()) {
    const laneEnds = network.lanes.filter(lane => distance(type === 'diverge' ? lane.points[0] : lane.points.at(-1)!, group.position) < 0.05)
    const laneIds = new Set(laneEnds.map(lane => lane.id))
    // A parallel auxiliary-lane taper is the end of a lateral lane change,
    // already represented by weaving; it is not an extra ramp junction.
    if (laneEnds.some(lane => laneIds.has(lane.left ?? '') || laneIds.has(lane.right ?? ''))) continue
    const branches = [...group.branches.values()]
    // k arms of one physical branch contribute k-1 conflicts; route multiplicity
    // on a shared arm contributes none. This also avoids pairwise O-D overcounts.
    for (let i = 1; i < branches.length; i++) {
      const a = branches[i - 1][0], b = branches[i][0]
      result.push({ id: `${type}-${pointKey(group.position)}-${i}`, type, position: { ...group.position }, movements: [a.id, b.id], separatedBySignal: false })
    }
  }
  return result
}

/** Calculate same-height geometric crossings and physical shared-path branches. */
export function calculateConflicts(network: Network): ConflictPoint[] {
  const paths = network.schematicMovements
  const conflicts: ConflictPoint[] = topologyBranches(network)
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
    intersections.forEach((position, index) => {
      const existing = conflicts.find(point => point.type === 'crossing' && distance(point.position, position) < 0.25)
      if (existing) existing.separatedBySignal &&= !sharesPhase(a, b, network)
      else conflicts.push({ id: `crossing-${a.id}-${b.id}-${index}`, type: 'crossing', position, movements: [a.id, b.id], separatedBySignal: !sharesPhase(a, b, network) })
    })
  }
  return conflicts
}

export function summarizeConflicts(conflicts: ConflictPoint[]) {
  return { total: conflicts.length, crossing: conflicts.filter(p => p.type === 'crossing').length, merge: conflicts.filter(p => p.type === 'merge').length, diverge: conflicts.filter(p => p.type === 'diverge').length }
}
