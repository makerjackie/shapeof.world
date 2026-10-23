import { projectToLane } from './geometry'
import type { ControlSpec, Movement, Network, SignalPhase, Vec3 } from './types'

export type SignalColor = 'green' | 'yellow' | 'red'
export interface SignalClock { phase: SignalPhase | undefined; state: SignalColor; remaining: number }
export function signalClock(control: ControlSpec, time: number): SignalClock {
  const phases = control.phases ?? []
  const cycle = phases.reduce((sum, phase) => sum + phase.green + (phase.yellow ?? 3) + (phase.allRed ?? 2), 0)
  if (cycle <= 0) return { phase: undefined, state: 'green', remaining: Infinity }
  let t = ((time % cycle) + cycle) % cycle
  for (const phase of phases) {
    const yellow = phase.yellow ?? 3, red = phase.allRed ?? 2
    if (t < phase.green) return { phase, state: 'green', remaining: phase.green - t }
    t -= phase.green
    if (t < yellow) return { phase, state: 'yellow', remaining: yellow - t }
    t -= yellow
    if (t < red) return { phase, state: 'red', remaining: red - t }
    t -= red
  }
  return { phase: phases[0], state: 'red', remaining: 0 }
}
export function signalState(control: ControlSpec, time: number, group: string): SignalColor {
  if (control.kind !== 'signal') return 'green'
  const clock = signalClock(control, time)
  return clock.phase?.groups.includes(group) ? clock.state : 'red'
}
export function mayPassSignal(control: ControlSpec, time: number, movement: Movement, speed: number, distance: number, comfortableBrake = 2): boolean {
  const color = signalState(control, time, movement.signalGroup ?? movement.from)
  return color === 'green' || (color === 'yellow' && distance < speed * speed / (2 * comfortableBrake) + 1)
}
/** Lane-level gate used by staged left turns and serial signal junctions. */
export function mayPassSignalGroups(control: ControlSpec, time: number, groups: string[], speed: number, distance: number, comfortableBrake = 2): boolean {
  return groups.some(group => {
    const color = signalState(control, time, group)
    return color === 'green' || color === 'yellow' && distance < speed * speed / (2 * comfortableBrake) + 1
  })
}
/** FHWA HPMS Appendix N (HCM 2000) minor-road base gaps; no local calibration.
 * Roundabout 5.2/3.2 s are DESIGN assumptions, not an empirical HCM calibration.
 * Major-left 4.1/2.2 s remains a provisional assumption pending original-table verification. */
export function criticalGap(movement: Movement, control: ControlSpec): number {
  if (control.roundabout) return 5.2
  if (control.majorApproaches?.includes(movement.from)) return movement.turn === 'left' ? 4.1 : 0
  if (control.kind === 'signal') return movement.turn === 'left' ? 4.1 : 0
  return movement.turn === 'right' ? 6.2 : movement.turn === 'straight' ? 6.5 : 7.1
}
export function followUpTime(movement: Movement, control: ControlSpec): number {
  if (control.roundabout) return 3.2
  if (control.majorApproaches?.includes(movement.from)) return 2.2
  return movement.turn === 'right' ? 3.3 : movement.turn === 'straight' ? 4 : 3.5
}

export interface ConflictRange { laneId: string; start: number; end: number }
export interface MovementConflict { a: string; b: string; position: Vec3; kind: 'crossing' | 'merge'; aRange: ConflictRange; bRange: ConflictRange }
function cross(a: Vec3, b: Vec3, c: Vec3, d: Vec3): Vec3 | undefined {
  const ax = b.x - a.x, az = b.z - a.z, bx = d.x - c.x, bz = d.z - c.z
  const determinant = ax * bz - az * bx
  if (Math.abs(determinant) < 1e-7) return undefined
  const t = ((c.x - a.x) * bz - (c.z - a.z) * bx) / determinant
  const u = ((c.x - a.x) * az - (c.z - a.z) * ax) / determinant
  if (t < 0 || t > 1 || u < 0 || u > 1) return undefined
  const ya = a.y + t * (b.y - a.y), yb = c.y + u * (d.y - c.y)
  if (Math.abs(ya - yb) > 2.5) return undefined
  return { x: a.x + ax * t, y: (ya + yb) / 2, z: a.z + az * t }
}
/** Runtime conflict graph uses driven connector geometry, independent of diagram counts. */
export function buildMovementConflicts(network: Network): MovementConflict[] {
  if (network.control.kind === 'free' || network.control.roundabout) return []
  const laneMap = new Map(network.lanes.map(lane => [lane.id, lane]))
  const result: MovementConflict[] = []
  for (let i = 0; i < network.movements.length; i++) for (let j = i + 1; j < network.movements.length; j++) {
    const a = network.movements[i], b = network.movements[j]
    if (a.from === b.from) continue
    if (a.lanes.at(-1) === b.lanes.at(-1)) {
      const lane = laneMap.get(a.lanes.at(-1)!)!
      result.push({ a: a.id, b: b.id, position: lane.points[0], kind: 'merge', aRange: { laneId: lane.id, start: -6, end: 8 }, bRange: { laneId: lane.id, start: -6, end: 8 } })
      continue
    }
    const connectorsA = a.lanes.map(id => laneMap.get(id)!).filter(lane => lane.kind === 'connector')
    const connectorsB = b.lanes.map(id => laneMap.get(id)!).filter(lane => lane.kind === 'connector')
    const found: Vec3[] = []
    for (const laneA of connectorsA) for (const laneB of connectorsB) {
      // Shared circulating / receiving lanes use car-following and merge guards.
      // Never draw a fictitious chord between two separate control points.
      if (laneA.id === laneB.id || laneA.controlPoint && laneB.controlPoint && laneA.controlPoint !== laneB.controlPoint) continue
      let position: Vec3 | undefined
      for (let p = 0; p < laneA.points.length - 1 && !position; p++) for (let q = 0; q < laneB.points.length - 1 && !position; q++) position = cross(laneA.points[p], laneA.points[p + 1], laneB.points[q], laneB.points[q + 1])
      if (!position || found.some(other => Math.hypot(other.x - position!.x, other.z - position!.z) < 4)) continue
      found.push(position)
      const aAt = projectToLane(laneA, position), bAt = projectToLane(laneB, position)
      result.push({ a: a.id, b: b.id, position, kind: 'crossing', aRange: { laneId: laneA.id, start: aAt - 4, end: aAt + 4 }, bRange: { laneId: laneB.id, start: bAt - 4, end: bAt + 4 } })
    }
  }
  return result
}

/** Article 52: right-side priority, turning yields straight, opposite right yields left. */
export function mustYieldTo(subject: Movement, other: Movement, control: ControlSpec, direction: Vec3, otherDirection: Vec3): boolean {
  const major = control.majorApproaches ?? []
  if (major.includes(subject.from) !== major.includes(other.from)) return !major.includes(subject.from)
  if (subject.turn !== 'straight' && other.turn === 'straight') return true
  if (subject.turn === 'straight' && other.turn !== 'straight') return false
  const opposite = direction.x * otherDirection.x + direction.z * otherDirection.z < -0.7
  if (opposite) return subject.turn === 'right' && other.turn === 'left' || subject.turn === 'left' && other.turn === 'straight'
  // Right of forward (dx,dz) is (-dz,dx) in XZ. Other approach sits opposite its heading.
  return direction.z * otherDirection.x - direction.x * otherDirection.z > 0.1
}
