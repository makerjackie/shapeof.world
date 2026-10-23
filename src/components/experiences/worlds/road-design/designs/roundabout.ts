import type { Carriageway, DesignSpec, Lane, Movement, Network, SchematicMovement, Vec3 } from '../sim/types'
import { arc, bezier, lane, line, point, routePoints } from './kit'
import { MOVEMENT_NAMES } from './movement-names'
import { urbanCamera } from './urban'

const ARMS = ['north', 'east', 'south', 'west'] as const
const DIRECTIONS = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }]
export const ROUNDABOUT_OUTER_RADIUS = 21
export const ROUNDABOUT_RING_WIDTH = 5
export const ROUNDABOUT_ISLAND_RADIUS = 15.5
export const ROUNDABOUT_SPLITTER = [{ x: -0.5, z: 30 }, { x: -1, z: 25 }, { x: 0, z: 22 }, { x: 1, z: 25 }, { x: 0.5, z: 30 }]
const RADIUS = ROUNDABOUT_OUTER_RADIUS - ROUNDABOUT_RING_WIDTH / 2
const WIDTH = 3.5, MEDIAN = 3, OFFSET = (WIDTH + MEDIAN) / 2, REACH = 330, APPROACH_END = 32, DELTA = 30 * Math.PI / 180
const armPoint = (arm: number, along: number, lateral: number): Vec3 => {
  const d = DIRECTIONS[arm]
  return point(d.x * along + d.z * lateral, d.z * along - d.x * lateral)
}
const baseAngle = (arm: number) => [-Math.PI / 2, 0, Math.PI / 2, -Math.PI][arm]
const circlePoint = (angle: number) => point(Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS)
const tangent = (angle: number) => ({ x: Math.sin(angle), z: -Math.cos(angle) })

/** 42 m inscribed diameter, with one-way shared circulating lanes. Entering
 * movements join after the previous exit, so no at-grade path crosses another. */
export function buildRoundabout(): Network {
  const lanes: Lane[] = [], carriageways: Carriageway[] = [], movements: Movement[] = [], schematicMovements: SchematicMovement[] = []
  const ringAngles = [Math.PI / 2 + DELTA, Math.PI / 2 - DELTA, DELTA, -DELTA, -Math.PI / 2 + DELTA, -Math.PI / 2 - DELTA, -Math.PI + DELTA, -Math.PI - DELTA]
  const exitIndex = [4, 2, 0, 6], entryIndex = [5, 3, 1, 7]
  for (let index = 0; index < 8; index++) {
    const end = index === 7 ? ringAngles[0] - Math.PI * 2 : ringAngles[index + 1]
    const next = [`round-ring-${(index + 1) % 8}`]
    const destination = exitIndex.indexOf((index + 1) % 8)
    if (destination >= 0) next.push(`round-exit-${destination}`)
    lanes.push(lane(`round-ring-${index}`, arc(point(0, 0), RADIUS, ringAngles[index], end - ringAngles[index], 32), { width: ROUNDABOUT_RING_WIDTH, speedLimit: 25 / 3.6, level: 0, kind: 'connector', next, circulating: true }))
  }
  carriageways.push({ id: 'round-circulatory-road', points: arc(point(0, 0), RADIUS, ringAngles[0], -Math.PI * 2, 256), laneCount: 1, laneWidth: ROUNDABOUT_RING_WIDTH, shoulder: 0, speedLimit: 25 / 3.6, level: 0, bridge: false, kind: 'urban', oneWay: true })
  for (let arm = 0; arm < 4; arm++) {
    const name = ARMS[arm], d = DIRECTIONS[arm]
    const incoming = lane(`${name}-in-0`, line(armPoint(arm, REACH, OFFSET), armPoint(arm, APPROACH_END, OFFSET)), { width: WIDTH, speedLimit: 50 / 3.6, level: 0, kind: 'urban', next: [`round-entry-${arm}`], entry: name })
    incoming.stopLine = incoming.length - 1.5; incoming.solid = [{ start: incoming.length - 40, end: incoming.length }]
    const outgoing = lane(`${name}-out-0`, line(armPoint(arm, APPROACH_END, -OFFSET), armPoint(arm, REACH, -OFFSET)), { width: WIDTH, speedLimit: 50 / 3.6, level: 0, kind: 'urban', next: [], exit: name })
    const entryAngle = baseAngle(arm) - DELTA, exitAngle = baseAngle(arm) + DELTA
    const entryEnd = circlePoint(entryAngle), exitStart = circlePoint(exitAngle), entryTangent = tangent(entryAngle), exitTangent = tangent(exitAngle)
    const entryStart = incoming.points.at(-1)!, exitEnd = outgoing.points[0]
    const entry = bezier(entryStart, point(entryStart.x - d.x * 8, entryStart.z - d.z * 8), point(entryEnd.x - entryTangent.x * 6, entryEnd.z - entryTangent.z * 6), entryEnd, 36)
    const exit = bezier(exitStart, point(exitStart.x + exitTangent.x * 6, exitStart.z + exitTangent.z * 6), point(exitEnd.x - d.x * 8, exitEnd.z - d.z * 8), exitEnd, 36)
    lanes.push(incoming, outgoing)
    lanes.push(lane(`round-entry-${arm}`, entry, { width: WIDTH, speedLimit: 20 / 3.6, level: 0, kind: 'connector', next: [`round-ring-${entryIndex[arm]}`], roundaboutEntry: true, merge: true }))
    lanes.push(lane(`round-exit-${arm}`, exit, { width: WIDTH, speedLimit: 25 / 3.6, level: 0, kind: 'connector', next: [outgoing.id] }))
    carriageways.push({ id: `${name}-road`, points: line(armPoint(arm, APPROACH_END, 0), armPoint(arm, REACH, 0)), laneCount: 2, laneWidth: WIDTH, medianWidth: MEDIAN, shoulder: 0.45, speedLimit: 50 / 3.6, level: 0, bridge: false, kind: 'urban' })
    for (const [id, points] of [[`round-entry-road-${arm}`, entry], [`round-exit-road-${arm}`, exit]] as const) carriageways.push({ id, points, laneCount: 1, laneWidth: WIDTH, shoulder: 0.45, speedLimit: 25 / 3.6, level: 0, bridge: false, kind: 'urban', oneWay: true })
  }
  for (let from = 0; from < 4; from++) for (let to = 0; to < 4; to++) {
    if (from === to) continue
    const difference = (to - from + 4) % 4, turn = difference === 2 ? 'straight' : difference === 1 ? 'left' : 'right'
    const route = [`${ARMS[from]}-in-0`, `round-entry-${from}`]
    for (let segment = entryIndex[from]; segment !== exitIndex[to]; segment = (segment + 1) % 8) route.push(`round-ring-${segment}`)
    route.push(`round-exit-${to}`, `${ARMS[to]}-out-0`)
    const movement = { id: `${ARMS[from]}-${ARMS[to]}`, name: MOVEMENT_NAMES[ARMS[from]][turn], from: ARMS[from], to: ARMS[to], turn, lanes: route, weight: turn === 'straight' ? 0.5 : 0.25, priority: 1 } as Movement
    movements.push(movement)
    schematicMovements.push({ id: movement.id, name: movement.name, from: movement.from, to: movement.to, turn, points: routePoints(lanes, route) })
  }
  // Include the same approach queue area as the other urban junctions, rather
  // than measuring only the circulating roadway and hiding upstream delay.
  return { id: 'roundabout', lanes, carriageways, movements, schematicMovements, weaving: [], control: { kind: 'yield', roundabout: true }, measurementArea: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, urbanJunctions: [{ id: 'roundabout-center', position: point(0, 0), arms: ARMS.map(direction => ({ direction, halfWidth: WIDTH + MEDIAN / 2 + 0.45, reach: REACH })), layout: 'roundabout', islandRadius: ROUNDABOUT_ISLAND_RADIUS, cornerRadius: 12 }] }
}

export const roundabout: DesignSpec = {
  id: 'roundabout', name: '现代环岛', nameEn: 'Modern roundabout', chapter: 1,
  description: '进环的车让环内车先行，把交叉冲突变成四处合流与四处分流。',
  defaultDemand: 300, camera: urbanCamera, build: buildRoundabout,
}
