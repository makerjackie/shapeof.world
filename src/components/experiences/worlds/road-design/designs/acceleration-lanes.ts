import { cumulativeLengths, sampleLane } from '../sim/geometry'
import type { Network, Vec3 } from '../sim/types'
import { lane, smoothstep } from './kit'

/** Engineering cross-section for schematic motorway entries: an arriving ramp
 * continues beside the receiving lane and uses MOBIL to merge over 320 m (JTG table 10.2.5: 230 m + 90 m taper).
 * Static conflict diagrams retain their representative movement centre lines. */
export function addAccelerationLanes(network: Network): void {
  for (const ramp of [...network.lanes]) {
    if (ramp.kind !== 'ramp' || !ramp.merge || ramp.next.length !== 1) continue
    const target = network.lanes.find(item => item.id === ramp.next[0])
    if (!target || target.kind !== 'main' || target.length < 100 || !network.lanes.some(item => item.kind === 'main' && item.next.includes(target.id))) continue
    const road = network.carriageways.find(item => item.points === ramp.points || (
      item.kind === 'ramp' && separation(item.points[0], ramp.points[0]) < .01 && separation(item.points.at(-1)!, ramp.points.at(-1)!) < .01
    ))
    if (!road) continue
    const id = `aux-road-${target.id}`, length = Math.min(network.id === 'cloverleaf' || network.id === 'stack' || network.id === 'turbine' || network.id === 'trumpet' ? 320 : 240, target.length - 20)
    const points: Vec3[] = []
    for (let i = 0; i <= Math.ceil(length / 6); i++) {
      const pose = sampleLane(target, Math.min(length, i * 6))
      points.push({ x: pose.position.x - pose.tangent.z * target.width, y: pose.position.y, z: pose.position.z + pose.tangent.x * target.width })
    }
    const shift = (path: Vec3[]) => {
      const distances = cumulativeLengths(path), end = path.at(-1)!, delta = { x: points[0].x - end.x, z: points[0].z - end.z }
      const span = Math.min(160, distances.at(-1)! / 2)
      return path.map((p, i) => { const w = smoothstep(1 - (distances.at(-1)! - distances[i]) / span); return { ...p, x: p.x + delta.x * w, z: p.z + delta.z * w } })
    }
    road.points = shift(road.points)
    ramp.points = shift(ramp.points)
    ramp.cumulative = cumulativeLengths(ramp.points); ramp.length = ramp.cumulative.at(-1)!
    ramp.next = [id]
    if (!network.lanes.some(item => item.id === id)) network.lanes.push(lane(id, points, { kind: 'ramp', width: target.width, level: target.level, speedLimit: target.speedLimit, merge: true, left: target.id, next: [] }))
    if (!network.carriageways.some(item => item.id === id)) network.carriageways.push({ id, points, kind: 'ramp', laneCount: 1, laneWidth: target.width, level: target.level, speedLimit: target.speedLimit, shoulder: .35, bridge: road.bridge, oneWay: true })
    for (const movement of network.movements) {
      const at = movement.lanes.indexOf(ramp.id)
      if (at >= 0 && movement.lanes[at + 1] === target.id) movement.lanes.splice(at + 1, 0, id)
    }
    if (network.measurementArea) for (const p of points) {
      network.measurementArea.minX = Math.min(network.measurementArea.minX, p.x - 2)
      network.measurementArea.maxX = Math.max(network.measurementArea.maxX, p.x + 2)
      network.measurementArea.minZ = Math.min(network.measurementArea.minZ, p.z - 2)
      network.measurementArea.maxZ = Math.max(network.measurementArea.maxZ, p.z + 2)
    }
  }
}
function separation(a: Vec3, b: Vec3) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) }
