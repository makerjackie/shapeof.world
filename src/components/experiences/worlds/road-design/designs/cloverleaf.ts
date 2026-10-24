import { addAccelerationLanes } from './acceleration-lanes'
import { DESIGN_BASIS, rightRampPath } from './design-basis'
import type { Carriageway, DesignSpec, Lane, Movement, Network, SchematicMovement, Vec3, WeavingSection } from '../sim/types'
import { arc, GROUND, lane, line, point, rotate, routePoints, smoothstep } from './kit'
import { MOVEMENT_NAMES } from './movement-names'

export const CLOVERLEAF_RADIUS = 60
const LANE_WIDTH = 3.75
const CENTER = 10.125
const OUTER = CENTER + LANE_WIDTH
const AUX = OUTER + LANE_WIDTH
const LOOP_CENTER = AUX + CLOVERLEAF_RADIUS
const LIMITS = [-1500, -330, -180, -LOOP_CENTER, LOOP_CENTER, 180, 330, 1500]
const FROM = ['west', 'north', 'east', 'south']
const TO = ['east', 'south', 'west', 'north']

/** Two metres of structure below an eight metre deck leaves six metres clear. */
function elevation(direction: number, longitudinal: number): number {
  return GROUND + (direction % 2 === 0 ? 8 * (1 - smoothstep((Math.abs(longitudinal) - 180) / 300)) : 0)
}

function highwayPath(direction: number, start: number, end: number, lateral: number): Vec3[] {
  return line(point(start, lateral), point(end, lateral), 8).map(p => rotate({ ...p, y: elevation(direction, p.x) }, direction * Math.PI / 2))
}

const mainId = (direction: number, laneIndex: number, segment: number) => `main-${direction}-${laneIndex}-${segment}`
const auxId = (direction: number, segment: number) => `aux-${direction}-${segment}`

export function buildCloverleaf(): Network {
  const lanes: Lane[] = [], carriageways: Carriageway[] = [], movements: Movement[] = [], schematicMovements: SchematicMovement[] = [], weaving: WeavingSection[] = []
  for (let direction = 0; direction < 4; direction++) {
    carriageways.push({ id: `highway-${direction}`, points: highwayPath(direction, -1500, 1500, CENTER), laneCount: 3, laneWidth: LANE_WIDTH, shoulder: 3, speedLimit: DESIGN_BASIS.mainKmh / 3.6, level: direction % 2 === 0 ? 1 : 0, bridge: direction % 2 === 0, kind: 'main' })
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) for (let segment = 0; segment < LIMITS.length - 1; segment++) {
      const next = segment < LIMITS.length - 2 ? [mainId(direction, laneIndex, segment + 1)] : []
      const l = lane(mainId(direction, laneIndex, segment), highwayPath(direction, LIMITS[segment], LIMITS[segment + 1], CENTER + (laneIndex - 1) * LANE_WIDTH), { speedLimit: DESIGN_BASIS.mainKmh / 3.6, level: direction % 2 === 0 ? 1 : 0, width: LANE_WIDTH, kind: 'main', next })
      if (segment === 0) l.entry = FROM[direction]
      if (segment === LIMITS.length - 2) l.exit = TO[direction]
      if (laneIndex > 0) l.left = mainId(direction, laneIndex - 1, segment)
      if (laneIndex < 2) l.right = mainId(direction, laneIndex + 1, segment)
      if (laneIndex === 2 && segment >= 2 && segment <= 4) l.right = auxId(direction, segment)
      if (laneIndex === 2 && segment === 0) l.next.push(`right-${direction}`)
      if (laneIndex === 2 && segment === 1) l.next.push(auxId(direction, 2))
      lanes.push(l)
    }
    const auxPoints: Vec3[][] = []
    for (let segment = 2; segment <= 4; segment++) {
      const points = line(point(LIMITS[segment], AUX), point(LIMITS[segment + 1], AUX), 4).map((p, index, arr) => {
        const t = index / (arr.length - 1)
        const z = segment === 2 ? OUTER + LANE_WIDTH * smoothstep(t) : segment === 4 ? AUX - LANE_WIDTH * smoothstep(t) : AUX
        return rotate(point(p.x, z, elevation(direction, p.x)), direction * Math.PI / 2)
      })
      // The loop and upstream auxiliary taper share the same receiving lane.
      // Mark both sides of that merge so the existing congested zipper guard
      // alternates them; otherwise the taper can continuously starve the loop.
      const l = lane(auxId(direction, segment), points, { speedLimit: 70 / 3.6, level: direction % 2 === 0 ? 1 : 0, width: LANE_WIDTH, kind: 'ramp', next: segment < 4 ? [auxId(direction, segment + 1)] : [mainId(direction, 2, 5)], left: mainId(direction, 2, segment), merge: segment === 2 || segment === 4 })
      if (segment === 3) l.next.push(`loop-${direction}`)
      lanes.push(l)
      auxPoints.push(points)
    }
    carriageways.push({ id: `aux-road-${direction}`, points: auxPoints.flatMap((p, i) => i ? p.slice(1) : p), laneCount: 1, laneWidth: LANE_WIDTH, shoulder: 0.8, speedLimit: 70 / 3.6, level: direction % 2 === 0 ? 1 : 0, bridge: direction % 2 === 0, kind: 'ramp' })
    weaving.push({ id: `weave-${direction}`, points: highwayPath(direction, -LOOP_CENTER, LOOP_CENTER, (AUX + OUTER) / 2), width: LANE_WIDTH * 2, lanes: [mainId(direction, 2, 3), auxId(direction, 3)] })
  }

  for (let direction = 0; direction < 4; direction++) {
    const leftTarget = (direction + 3) % 4
    const startHeight = elevation(direction, LOOP_CENTER), endHeight = elevation(leftTarget, -LOOP_CENTER)
    const loop = arc(point(LOOP_CENTER, LOOP_CENTER), CLOVERLEAF_RADIUS, -Math.PI / 2, 3 * Math.PI / 2, 144).map((p, i, arr) => rotate({ ...p, y: startHeight + (endHeight - startHeight) * smoothstep(i / (arr.length - 1)) }, direction * Math.PI / 2))
    lanes.push(lane(`loop-${direction}`, loop, { speedLimit: 40 / 3.6, level: 0, width: LANE_WIDTH, kind: 'ramp', next: [auxId(leftTarget, 3)], merge: true }))
    // The renderer's positive lateral axis points right, into these clockwise
    // loops. The inside edge is lower, so inward 6% banking has a negative sign.
    carriageways.push({ id: `loop-road-${direction}`, points: loop, laneCount: 1, laneWidth: LANE_WIDTH, shoulder: 1.2, speedLimit: 40 / 3.6, level: 0, bridge: true, kind: 'ramp', superelevation: -0.06 })

    const rightTarget = (direction + 1) % 4
    const rightStartHeight = elevation(direction, -330), rightEndHeight = elevation(rightTarget, 330)
    const right = rightRampPath(OUTER).map((p, i, arr) => rotate({ ...p, y: rightStartHeight + (rightEndHeight - rightStartHeight) * smoothstep(i / (arr.length - 1)) }, direction * Math.PI / 2))
    lanes.push(lane(`right-${direction}`, right, { speedLimit: 60 / 3.6, level: 0, width: LANE_WIDTH, kind: 'ramp', next: [mainId(rightTarget, 2, 6)], merge: true }))
    carriageways.push({ id: `right-road-${direction}`, points: right, laneCount: 1, laneWidth: LANE_WIDTH, shoulder: 1.2, speedLimit: 60 / 3.6, level: 0, bridge: true, kind: 'ramp' })

    for (let laneIndex = 0; laneIndex < 3; laneIndex++) movements.push({ id: `${FROM[direction]}-straight-${laneIndex}`, name: MOVEMENT_NAMES[FROM[direction]].straight, from: FROM[direction], to: TO[direction], turn: 'straight', lanes: LIMITS.slice(0, -1).map((_, s) => mainId(direction, laneIndex, s)), weight: 0.65 / 3, priority: 3 })
    // Adjacent entries in a route are mandatory MOBIL transfers, not end nodes.
    // The exiting stream must move right in the central weaving section; the
    // stream arriving from a loop must move left in the destination section.
    movements.push({ id: `${FROM[direction]}-left`, name: MOVEMENT_NAMES[FROM[direction]].left, from: FROM[direction], to: TO[leftTarget], turn: 'left', lanes: [mainId(direction, 2, 0), mainId(direction, 2, 1), mainId(direction, 2, 2), mainId(direction, 2, 3), auxId(direction, 3), `loop-${direction}`, auxId(leftTarget, 3), mainId(leftTarget, 2, 3), mainId(leftTarget, 2, 4), mainId(leftTarget, 2, 5), mainId(leftTarget, 2, 6)], weight: 0.2, priority: 1 })
    movements.push({ id: `${FROM[direction]}-right`, name: MOVEMENT_NAMES[FROM[direction]].right, from: FROM[direction], to: TO[rightTarget], turn: 'right', lanes: [mainId(direction, 2, 0), `right-${direction}`, mainId(rightTarget, 2, 6)], weight: 0.15, priority: 1 })
  }
  // The static one-lane movement diagram collapses the weaving pair into one
  // collector path. Lateral exchange is shown separately by network.weaving;
  // it is not classified as an at-grade crossing in the FHWA conflict count.
  for (const movement of movements.filter(m => m.turn !== 'straight' || m.id.endsWith('-2'))) {
    const direction = FROM.indexOf(movement.from), target = (direction + 3) % 4
    const schematicRoute = movement.turn === 'left' ? [mainId(direction, 2, 0), mainId(direction, 2, 1), auxId(direction, 2), auxId(direction, 3), `loop-${direction}`, auxId(target, 3), auxId(target, 4), mainId(target, 2, 5), mainId(target, 2, 6)] : movement.lanes
    schematicMovements.push({ id: movement.id, name: movement.name, from: movement.from, to: movement.to, turn: movement.turn, points: routePoints(lanes, schematicRoute) })
  }
  const network: Network = { id: 'cloverleaf', lanes, movements, carriageways, schematicMovements, weaving, control: { kind: 'free' } }
  addAccelerationLanes(network)
  return network
}

export const cloverleaf: DesignSpec = {
  id: 'cloverleaf', name: '全苜蓿叶立交', nameEn: 'Full cloverleaf', chapter: 3,
  description: '左转不再等红灯。上环和下环的车却要在同一小段路上交叉换道，车一多，先堵在这里。',
  defaultDemand: 2600,
  camera: { position: { x: 335, y: 250, z: 350 }, target: { x: 0, y: 0, z: 0 }, fov: 35 },
  build: buildCloverleaf,
}
