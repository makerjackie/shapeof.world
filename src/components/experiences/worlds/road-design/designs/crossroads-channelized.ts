import type { Carriageway, DesignSpec, Lane, Movement, Network, Turn, Vec3 } from '../sim/types'
import { bezier, GROUND, lane, line, point } from './kit'
import { MOVEMENT_NAMES } from './movement-names'
import { buildUrban } from './urban'

const ARMS = ['north', 'east', 'south', 'west'] as const
const D = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }]
const W = 3.5, EDGE = 28, POCKET = 120, REACH = 360
const at = (arm: number, longitudinal: number, lateral: number): Vec3 => point(D[arm].x * longitudinal + D[arm].z * lateral, D[arm].z * longitudinal - D[arm].x * lateral)
const turnOf = (from: number, to: number): Turn => (to - from + 4) % 4 === 2 ? 'straight' : (to - from + 4) % 4 === 1 ? 'left' : 'right'

/** Three running lanes per direction, with an additional 92 m left-turn pocket. */
export function buildChannelizedCrossroads(): Network {
  const lanes: Lane[] = [], carriageways: Carriageway[] = [], movements: Movement[] = []
  for (let arm = 0; arm < 4; arm++) {
    const name = ARMS[arm], axis = arm % 2 ? 'ew' : 'ns'
    carriageways.push({ id: `${name}-main-road`, points: line(at(arm, POCKET, 0), at(arm, REACH, 0)), laneCount: 6, laneWidth: W, shoulder: 0.45, speedLimit: 50 / 3.6, level: 0, bridge: false, kind: 'urban' })
    // The widened approach is biased toward the incoming side. The driveway
    // centres and the road surface use the same smooth lateral expansion.
    const widenedCenter = bezier(at(arm, EDGE, W / 2), at(arm, 65, W / 2), at(arm, 95, 0), at(arm, POCKET, 0))
    carriageways.push({ id: `${name}-widened-road`, points: widenedCenter, laneCount: 7, laneWidth: W, shoulder: 0.45, speedLimit: 50 / 3.6, level: 0, bridge: false, kind: 'urban' })
    for (let i = 0; i < 3; i++) {
      const offset = W * (i + 0.5), entryId = `${name}-in-${i}`, approachId = `${name}-approach-${i}`
      const entry = lane(entryId, line(at(arm, REACH, offset), at(arm, POCKET, offset)), { speedLimit: 50 / 3.6, level: 0, width: W, kind: 'urban', next: [approachId, ...(i === 0 ? [`${name}-left-pocket`] : [])], entry: name })
      if (i > 0) entry.left = `${name}-in-${i - 1}`
      if (i < 2) entry.right = `${name}-in-${i + 1}`
      lanes.push(entry)
      const approach = lane(approachId, bezier(at(arm, POCKET, offset), at(arm, 95, offset), at(arm, 65, offset + W), at(arm, EDGE, offset + W)), { speedLimit: 50 / 3.6, level: 0, width: W, kind: 'urban', next: [], signalGroups: [`${axis}-through`], controlPoint: 'center', protectedTurn: true })
      approach.stopLine = approach.length - 1.3
      approach.solid = [{ start: approach.length - 40, end: approach.length }]
      lanes.push(approach)
      lanes.push(lane(`${name}-out-${i}`, line(at(arm, EDGE, -offset), at(arm, REACH, -offset)), { speedLimit: 50 / 3.6, level: 0, width: W, kind: 'urban', next: [], exit: name }))
    }
    const pocket = lane(`${name}-left-pocket`, line(at(arm, POCKET, W / 2), at(arm, EDGE, W / 2)), { speedLimit: 40 / 3.6, level: 0, width: W, kind: 'urban', next: [`${name}-left-wait`], signalGroups: [`${axis}-through`, `${axis}-left`], controlPoint: `${name}-waiting-entry`, protectedTurn: true })
    pocket.stopLine = pocket.length - 1.3
    pocket.solid = [{ start: pocket.length - 40, end: pocket.length }]
    lanes.push(pocket)
    const waiting = lane(`${name}-left-wait`, line(at(arm, EDGE, W / 2), at(arm, 10, W / 2), 1), { speedLimit: 25 / 3.6, level: 0, width: W, kind: 'urban', next: [], waitingArea: true, signalGroups: [`${axis}-left`], controlPoint: 'center', protectedTurn: true })
    waiting.stopLine = waiting.length - 1
    lanes.push(waiting)
  }
  for (let from = 0; from < 4; from++) for (let to = 0; to < 4; to++) {
    if (from === to) continue
    const turn = turnOf(from, to), name = ARMS[from], axis = from % 2 ? 'ew' : 'ns', movementName = MOVEMENT_NAMES[name][turn]
    const count = turn === 'straight' ? 3 : 1
    for (let i = 0; i < count; i++) {
      const index = turn === 'right' ? 2 : i, outIndex = turn === 'right' ? 2 : i
      const connectorId = `${name}-${ARMS[to]}-connector-${i}`
      const a = at(from, turn === 'left' ? 10 : EDGE, turn === 'left' ? W / 2 : W * (index + 1.5)), b = at(to, EDGE, -W * (outIndex + 0.5))
      const handle = turn === 'right' ? 13 : turn === 'left' ? 15 : 20
      const points = bezier(a, point(a.x - D[from].x * handle, a.z - D[from].z * handle), point(b.x - D[to].x * handle, b.z - D[to].z * handle), b, 64)
      const fromId = turn === 'left' ? `${name}-left-wait` : `${name}-approach-${index}`, outId = `${ARMS[to]}-out-${outIndex}`
      lanes.find(item => item.id === fromId)!.next.push(connectorId)
      lanes.push(lane(connectorId, points, { speedLimit: turn === 'straight' ? 50 / 3.6 : 25 / 3.6, level: 0, width: W, kind: 'connector', turn, next: [outId], controlPoint: 'center', protectedTurn: true }))
      const route = turn === 'left' ? [`${name}-in-0`, `${name}-left-pocket`, fromId, connectorId, outId] : [`${name}-in-${index}`, fromId, connectorId, outId]
      const id = `${name}-${ARMS[to]}${i ? `-${i}` : ''}`
      movements.push({ id, name: movementName, from: name, to: ARMS[to], turn, lanes: route, signalGroup: `${axis}-${turn === 'left' ? 'left' : 'through'}`, weight: 1 / count })
    }
  }
  // FHWA conflict counts collapse the physical lane fan into one lane per
  // direction. Keep that diagram separate from the driven pocket / bay graph;
  // protected phases alter simultaneous conflicts, not the static 32 locations.
  const schematicMovements = buildUrban('channelized-diagram', false, true).schematicMovements.map(movement => ({
    ...movement,
    points: movement.points.map(p => ({ ...p, x: p.x * EDGE / 20, z: p.z * EDGE / 20 })),
    signalGroup: `${movement.from === 'north' || movement.from === 'south' ? 'ns' : 'ew'}-${movement.turn === 'left' ? 'left' : 'through'}`,
  }))
  return { id: 'crossroads-channelized', lanes, movements, carriageways, schematicMovements, weaving: [], measurementArea: { minX: -150, maxX: 150, minZ: -150, maxZ: 150 }, urbanJunctions: [{ id: 'center', position: point(0, 0), arms: ARMS.map(direction => ({ direction, halfWidth: 14.45, reach: REACH })), cornerRadius: 12 }], control: { kind: 'signal', phases: [
    { id: 'ns-through', groups: ['ns-through'], green: 28, yellow: 3, allRed: 2 },
    { id: 'ns-left', groups: ['ns-left'], green: 14, yellow: 3, allRed: 2 },
    { id: 'ew-through', groups: ['ew-through'], green: 28, yellow: 3, allRed: 2 },
    { id: 'ew-left', groups: ['ew-left'], green: 14, yellow: 3, allRed: 2 },
  ] } }
}

export const crossroadsChannelized: DesignSpec = {
  id: 'crossroads-channelized', name: '十字 · 渠化与待转区', nameEn: 'Channelized crossroads', chapter: 1,
  description: '左转先进入待转区，等专用绿灯一起出发。用进口展宽和额外相位，换取互不交叉的放行。',
  defaultDemand: 700,
  camera: { position: { x: 92, y: 78, z: 108 }, target: { x: 0, y: GROUND, z: 0 }, fov: 40 },
  build: buildChannelizedCrossroads,
}
