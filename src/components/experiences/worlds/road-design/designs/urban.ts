import type { Carriageway, Lane, Movement, Network, SchematicMovement, Turn, Vec3 } from '../sim/types'
import { bezier, GROUND, joinPaths, lane, line, point } from './kit'
import { MOVEMENT_NAMES } from './movement-names'

const ARMS = ['north', 'east', 'south', 'west']
const DIRECTIONS = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }]
const HALF_JUNCTION = 20
const REACH = 330
const WIDTH = 3.5

function armPoint(arm: number, longitudinal: number, lateral: number): Vec3 {
  const d = DIRECTIONS[arm]
  return point(d.x * longitudinal + d.z * lateral, d.z * longitudinal - d.x * lateral)
}

function connector(from: number, to: number, incomingOffset: number, outgoingOffset: number, extent = HALF_JUNCTION): Vec3[] {
  const a = armPoint(from, extent, incomingOffset)
  const d = armPoint(to, extent, -outgoingOffset)
  const fi = DIRECTIONS[from], ti = DIRECTIONS[to]
  const turn = turnOf(from, to)
  const handle = turn === 'right' ? 11 : 22
  if (turn === 'straight') return line(a, d, 1)
  return bezier(a, point(a.x - fi.x * handle, a.z - fi.z * handle), point(d.x - ti.x * handle, d.z - ti.z * handle), d, 48)
}

function turnOf(from: number, to: number): Turn {
  const delta = (to - from + 4) % 4
  return delta === 2 ? 'straight' : delta === 1 ? 'left' : 'right'
}

/** The physical graph may have several lanes; the separate conflict diagram has one lane per approach. */
export function buildUrban(id: string, isT: boolean, signal: boolean): Network {
  const arms = isT ? [1, 2, 3] : [0, 1, 2, 3]
  const lanes: Lane[] = [], carriageways: Carriageway[] = [], movements: Movement[] = [], schematicMovements: SchematicMovement[] = []
  const laneCounts = (arm: number) => isT && (arm === 1 || arm === 3) ? 2 : 1
  for (const arm of arms) {
    const count = laneCounts(arm)
    carriageways.push({ id: `${ARMS[arm]}-road`, points: line(armPoint(arm, HALF_JUNCTION, 0), armPoint(arm, REACH, 0)), laneCount: count * 2, laneWidth: WIDTH, shoulder: 0.45, speedLimit: 50 / 3.6, level: 0, bridge: false, kind: 'urban' })
    for (let i = 0; i < count; i++) {
      const offset = WIDTH * (i + 0.5)
      const incoming = lane(`${ARMS[arm]}-in-${i}`, line(armPoint(arm, REACH, offset), armPoint(arm, HALF_JUNCTION, offset)), { speedLimit: 50 / 3.6, level: 0, width: WIDTH, kind: 'urban', next: [], entry: ARMS[arm] })
      incoming.stopLine = incoming.length - 1.5
      incoming.solid = [{ start: incoming.length - 40, end: incoming.length }]
      if (i > 0) incoming.left = `${ARMS[arm]}-in-${i - 1}`
      if (i + 1 < count) incoming.right = `${ARMS[arm]}-in-${i + 1}`
      lanes.push(incoming)
      lanes.push(lane(`${ARMS[arm]}-out-${i}`, line(armPoint(arm, HALF_JUNCTION, -offset), armPoint(arm, REACH, -offset)), { speedLimit: 50 / 3.6, level: 0, width: WIDTH, kind: 'urban', next: [], exit: ARMS[arm] }))
    }
  }
  for (const from of arms) for (const to of arms) {
    if (from === to) continue
    const turn = turnOf(from, to)
    const movementId = `${ARMS[from]}-${ARMS[to]}`
    const signalGroup = from % 2 === 0 ? 'ns' : 'ew'
    const name = MOVEMENT_NAMES[ARMS[from]][turn]
    // Staggered branching positions keep k−1 merge/diverge markers distinct.
    // All paths share the same one-lane approach before their actual branch.
    const extent = turn === 'right' ? 14 : HALF_JUNCTION
    const schematic = joinPaths(line(armPoint(from, 32, WIDTH / 2), armPoint(from, extent, WIDTH / 2), 1), connector(from, to, WIDTH / 2, WIDTH / 2, extent), line(armPoint(to, extent, -WIDTH / 2), armPoint(to, 32, -WIDTH / 2), 1))
    schematicMovements.push({ id: movementId, name, from: ARMS[from], to: ARMS[to], turn, points: schematic, level: 0, signalGroup })
    const routes = turn === 'straight' ? Math.min(laneCounts(from), laneCounts(to)) : 1
    for (let route = 0; route < routes; route++) {
      const inLane = turn === 'right' ? laneCounts(from) - 1 : route
      const outLane = turn === 'right' ? laneCounts(to) - 1 : route
      const connectionId = `${movementId}-connector-${route}`
      const points = connector(from, to, WIDTH * (inLane + 0.5), WIDTH * (outLane + 0.5))
      const inId = `${ARMS[from]}-in-${inLane}`, outId = `${ARMS[to]}-out-${outLane}`
      lanes.find(l => l.id === inId)!.next.push(connectionId)
      lanes.push(lane(connectionId, points, { speedLimit: turn === 'straight' ? 50 / 3.6 : turn === 'right' ? Math.sqrt(2.5 * 13) : Math.sqrt(2.5 * 22), level: 0, width: WIDTH, kind: 'connector', next: [outId] }))
      movements.push({ id: route === 0 ? movementId : `${movementId}-${route}`, name, from: ARMS[from], to: ARMS[to], turn, lanes: [inId, connectionId, outId], weight: (turn === 'straight' ? 0.65 : turn === 'left' ? 0.2 : 0.15) / routes, priority: isT && (from === 1 || from === 3) ? (turn === 'straight' ? 3 : 2) : turn === 'straight' ? 1 : 0, signalGroup })
    }
  }
  return { id, lanes, movements, carriageways, schematicMovements, weaving: [], control: signal ? { kind: 'signal', phases: [{ id: 'ns', groups: ['ns'], green: 32, yellow: 3, allRed: 2 }, { id: 'ew', groups: ['ew'], green: 32, yellow: 3, allRed: 2 }] } : { kind: 'yield', majorApproaches: isT ? ['east', 'west'] : [] } }
}

export const urbanCamera = { position: { x: 145, y: 140, z: 180 }, target: { x: 0, y: GROUND, z: 0 }, fov: 35 }
