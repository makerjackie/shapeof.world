import type { Network, Vec3 } from './types'
import { terrainHeight } from './terrain'
import { sampleLane } from './geometry'
import { junctionRoads, lockedLand } from './land-footprint'

export interface GeometryCosts { layers: number; maximumHeight: number; bridgeArea: number; pavementArea: number; rampLength: number; hullArea: number; landArea: number; enclosedArea: number }
function hullArea(points: Vec3[]): number {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z)
  const cross = (o: Vec3, a: Vec3, b: Vec3) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x)
  const chain = (items: Vec3[]) => { const result: Vec3[] = []; for (const p of items) { while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, p) <= 0) result.pop(); result.push(p) } return result }
  const polygon = [...chain(sorted).slice(0, -1), ...chain(sorted.reverse()).slice(0, -1)]
  return Math.abs(polygon.reduce((sum, a, i) => { const b = polygon[(i + 1) % polygon.length]; return sum + a.x * b.z - a.z * b.x }, 0)) / 2
}

/** Junction envelope: ramps including acceleration/deceleration lanes; city
 * connectors plus the solid/channelized approach sections. Long free-flow leads
 * are clipped to this envelope before taking the pavement-boundary convex hull. */
export function junctionFootprint(network: Network): Vec3[] {
  const ramps = network.carriageways.filter(road => road.kind === 'ramp')
  const anchors = ramps.length ? ramps.flatMap(road => road.points) : network.lanes.flatMap(lane => {
    if (lane.kind === 'connector' || lane.waitingArea || lane.circulating) return lane.points
    if (lane.stopLine === undefined) return []
    return [sampleLane(lane, lane.stopLine).position, ...((lane.solid ?? []).map(interval => sampleLane(lane, interval.start).position))]
  })
  if (!anchors.length) return []
  const bounds = [Math.min(...anchors.map(p=>p.x)), Math.max(...anchors.map(p=>p.x)), Math.min(...anchors.map(p=>p.z)), Math.max(...anchors.map(p=>p.z))]
  const footprint: Vec3[] = [...anchors]
  for (const road of network.carriageways) {
    const half = (road.laneCount*road.laneWidth+(road.medianWidth??0))/2+(road.shoulder??0)
    for (let i=1;i<road.points.length;i++) {
      const a=road.points[i-1], b=road.points[i], dx=b.x-a.x, dz=b.z-a.z, norm=Math.hypot(dx,dz)||1
      let enter=0, leave=1
      if (road.kind !== 'ramp') for (const [origin,delta,min,max] of [[a.x,dx,bounds[0],bounds[1]],[a.z,dz,bounds[2],bounds[3]]]) {
        if (Math.abs(delta)<1e-9) { if(origin<min||origin>max)leave=-1; continue }
        const t0=(min-origin)/delta,t1=(max-origin)/delta
        enter=Math.max(enter,Math.min(t0,t1)); leave=Math.min(leave,Math.max(t0,t1))
      }
      if (leave<enter) continue
      for(const t of [enter,leave]) for(const side of [-1,1]) footprint.push({x:a.x+dx*t-dz/norm*half*side,y:0,z:a.z+dz*t+dx/norm*half*side})
    }
  }
  return footprint
}

/** Physical road surface quantities; footprint alone excludes remote leads. */
export function measureGeometry(network: Network): GeometryCosts {
  let maximumHeight = 0, bridgeArea = 0, pavementArea = 0, rampLength = 0
  const footprint = junctionFootprint(network), land = lockedLand(junctionRoads(network))
  for (const road of network.carriageways) {
    const width = road.laneCount * road.laneWidth + (road.medianWidth ?? 0) + 2 * (road.shoulder ?? 0)
    for (let i = 0; i < road.points.length; i++) {
      const p = road.points[i]
      const height = p.y - terrainHeight(network, p.x, p.z)
      maximumHeight = Math.max(maximumHeight, height)
      if (!i) continue
      const a = road.points[i - 1], length = Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z)
      pavementArea += length * width
      if (road.kind === 'ramp') rampLength += length
      const startHeight = a.y - terrainHeight(network, a.x, a.z)
      const above = height > 2.5 && startHeight > 2.5 ? 1 : height <= 2.5 && startHeight <= 2.5 ? 0 : (Math.max(height, startHeight) - 2.5) / Math.abs(height - startHeight)
      bridgeArea += above * length * width
    }
  }
  return { layers: new Set(network.carriageways.filter(road => road.level >= 0).map(road => road.level)).size, maximumHeight, bridgeArea, pavementArea, rampLength, hullArea: hullArea(footprint), landArea: land.area, enclosedArea: land.enclosedArea }
}
