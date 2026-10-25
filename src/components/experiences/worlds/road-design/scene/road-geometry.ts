import * as T from 'three'
import type { Carriageway, Network, Vec3 } from '../sim/types'
import { terrainHeight } from '../sim/terrain'
import { sampleLane } from '../sim/geometry'
import { mergeGeometry, samplePath, strip, wall, type Instance } from './mesh-kit'
import type { Lamp } from './lights-data'

function dashGeometry(points: Vec3[], offset: number, length = 5, gap = 8) {
  const pieces: T.BufferGeometry[] = []
  for (const { position: p, tangent: t } of samplePath(points, length + gap)) {
    pieces.push(strip([{ x: p.x - t.x * length / 2, y: p.y - t.y * length / 2, z: p.z - t.z * length / 2 }, { x: p.x + t.x * length / 2, y: p.y + t.y * length / 2, z: p.z + t.z * length / 2 }], 0.13, offset, 0.04))
  }
  return pieces
}

/** Keep sampled road sections without joining across an opening in a barrier. */
function sections(points: Vec3[], keep: (p: Vec3, distance: number, total: number) => boolean) {
  const result: Vec3[][] = []
  const total = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y, p.z - points[i].z), 0)
  let current: Vec3[] = [], distance = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
    if (keep(middle, distance + length / 2, total)) {
      if (!current.length) current.push(a)
      current.push(b)
    } else if (current.length) { result.push(current); current = [] }
    distance += length
  }
  if (current.length) result.push(current)
  return result
}

function triangle(a: Vec3, b: Vec3, c: Vec3) {
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2))
  geometry.computeVertexNormals()
  return geometry
}

function pierHitsLowerRoad(p: Vec3, road: Carriageway, roads: Carriageway[]) {
  for (const other of roads) {
    if (other.id === road.id) continue
    const clearance = other.laneCount * other.laneWidth / 2 + (other.shoulder ?? 0) + 2
    for (let i = 1; i < other.points.length; i++) {
      const a = other.points[i - 1], b = other.points[i], dx = b.x - a.x, dz = b.z - a.z
      const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / Math.max(0.0001, dx * dx + dz * dz)))
      const y = a.y + (b.y - a.y) * u
      if (p.y - y > 2.5 && Math.hypot(p.x - a.x - dx * u, p.z - a.z - dz * u) < clearance) return true
    }
  }
  return false
}

function projectToRoad(p: Vec3, road: Carriageway) {
  let nearest = { distance: Infinity, lateral: 0, y: 0, along: 0 }, walked = 0
  for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz)
    const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / Math.max(0.0001, length * length)))
    const px = p.x - a.x - dx * u, pz = p.z - a.z - dz * u, distance = Math.hypot(px, pz)
    if (distance < nearest.distance) nearest = { distance, lateral: (-dz * px + dx * pz) / Math.max(0.0001, length), y: a.y + (b.y - a.y) * u, along: walked + u * length }
    walked += length
  }
  return nearest
}

function isAuxiliary(id: string) { return id.startsWith('aux-road-') || id.startsWith('hjw-accel-') }

/** CPU mesh construction runs in the preparation worker; the alignment and
 * vertex data are identical to the original renderer. */
export function buildRoadGeometry(network:Network,lamps:Lamp[]) {
  const urban=network.carriageways.every(road=>road.kind==='urban')
  const hasUrban=urban||Boolean(network.urbanJunctions?.length)
    const pavement: T.BufferGeometry[] = [], concrete: T.BufferGeometry[] = [], edgeCaps: T.BufferGeometry[] = [], soffits: T.BufferGeometry[] = [], paint: T.BufferGeometry[] = [], yellow: T.BufferGeometry[] = []
    const piers: Instance[] = [], caps: Instance[] = [], lampPoles: Instance[] = [], lampArms: Instance[] = [], luminaires: Instance[] = []
    for (const road of network.carriageways) {
      const urbanRoad = road.kind === 'urban' || Boolean(network.urbanJunctions?.length) && road.kind === 'ramp' && !road.bridge
      const half = (road.laneCount * road.laneWidth + (road.medianWidth ?? 0)) / 2, width = half * 2 + (road.shoulder ?? 0) * 2
      const bank = road.superelevation ?? 0
      const auxiliary = isAuxiliary(road.id), main = road.kind === 'main'
      const outerSide = network.lanes.find(lane => lane.id === road.id)?.right ? -1 : 1
      const longitudinal = (p: Vec3) => projectToRoad(p, road).along
      const portals = network.carriageways.filter(r => r !== road && r.kind === 'ramp' && !isAuxiliary(r.id)).flatMap(r => [r.points[0], r.points.at(-1)!]).flatMap(p => {
        const projection = projectToRoad(p, road)
        return projection.distance < width / 2 + 1.5 && Math.abs(p.y - projection.y) < 0.75 ? [{ at: longitudinal(p), side: Math.sign(projection.lateral) }] : []
      })
      const auxiliaryRanges = main ? network.carriageways.filter(r => isAuxiliary(r.id)).flatMap(r => {
        const first = r.points[0], last = r.points.at(-1)!, p = projectToRoad(first, road), q = projectToRoad(last, road)
        return Math.max(p.distance, q.distance) < width / 2 && Math.max(Math.abs(first.y - p.y), Math.abs(last.y - q.y)) < 0.75 ? [{ start: Math.min(longitudinal(first), longitudinal(last)), end: Math.max(longitudinal(first), longitudinal(last)), side: Math.sign(p.lateral) }] : []
      }) : []
      pavement.push(strip(road.points, width, 0, 0.025, bank))
      for (let n = 1; n < road.laneCount; n++) {
        if (urbanRoad && !road.oneWay && n === Math.ceil(road.laneCount / 2)) continue
        const offset = -half + n * road.laneWidth
        if (urbanRoad) {
          for (const section of sections(road.points, p => (network.urbanJunctions?.length ? Math.min(...network.urbanJunctions.map(node => Math.hypot(p.x - node.position.x, p.z - node.position.z))) : Math.hypot(p.x, p.z)) > 60)) paint.push(...dashGeometry(section, offset, 3, 5))
          for (const section of sections(road.points, p => (network.urbanJunctions?.length ? Math.min(...network.urbanJunctions.map(node => Math.hypot(p.x - node.position.x, p.z - node.position.z))) : Math.hypot(p.x, p.z)) <= 60)) paint.push(strip(section, 0.13, offset, 0.045))
        } else paint.push(...dashGeometry(road.points, offset, 6, 9))
      }
      for (const side of [-1, 1]) {
        // Auxiliary lanes share their inner boundary with the highway. Ramp
        // portals must stay open; a continuous guardrail here cuts through cars.
        const open = (p: Vec3, distance: number, total: number) => {
          if (urbanRoad) return true
          const along = longitudinal(p)
          if (auxiliary) return side === outerSide && portals.every(portal => Math.abs(along - portal.at) > 35)
          if (main) return portals.every(portal => portal.side !== side || Math.abs(along - portal.at) > 38) && auxiliaryRanges.every(range => range.side !== side || along < range.start - 14 || along > range.end + 14)
          if (!main) return distance > 35 && distance < total - 35
          return true
        }
        for (const section of sections(road.points, open)) {
          paint.push(strip(section, 0.16, side * half, 0.045, bank))
          if (!urbanRoad) {
            concrete.push(wall(section, side * (width / 2 - 0.2), -0.25, 0.85, bank))
            edgeCaps.push(strip(section, 0.20, side * (width / 2 - 0.2), 0.86, bank))
          }
        }
        if (main) for (const section of sections(road.points, p => auxiliaryRanges.some(range => range.side === side && longitudinal(p) > range.start && longitudinal(p) < range.end))) paint.push(...dashGeometry(section, side * half, 2, 4))
      }
      if (road.bridge || road.points.some(p => p.y - terrainHeight(network,p.x,p.z) > 2.5)) {
        // Box-girder webs and soffit, sampled from exactly the same alignment as the deck.
        for (const section of sections(road.points, p => p.y - terrainHeight(network,p.x,p.z) > 2.5)) {
          for (const side of [-1, 1]) concrete.push(wall(section, side * (width / 2 - 0.7), -1.75, 0, bank))
          const underside = strip(section, width - 1.4, 0, -1.75, bank)
          const faces = underside.getIndex()!
          for (let n = 0; n < faces.count; n += 3) {
            const b = faces.getX(n + 1)
            faces.setX(n + 1, faces.getX(n + 2)); faces.setX(n + 2, b)
          }
          underside.computeVertexNormals(); soffits.push(underside)
        }
        for (const section of sections(road.points, p => p.y - terrainHeight(network,p.x,p.z) > 0.35 && p.y - terrainHeight(network,p.x,p.z) <= 2.5)) for (const side of [-1, 1]) {
          const retaining = wall(section, side * width / 2, -2.5, 0, bank)
          const positions = retaining.getAttribute('position')
          for (let i = 0; i < positions.count; i += 2) positions.setY(i, terrainHeight(network,positions.getX(i),positions.getZ(i)) + 0.03)
          retaining.computeVertexNormals()
          concrete.push(retaining)
        }
        for (const { position: p, tangent: t } of samplePath(road.points, 30)) {
          // Auxiliary decks share the mainline supports. Test every other road,
          // including curved ramps, before placing a column down to the ground.
          if (auxiliary || p.y - terrainHeight(network,p.x,p.z) < 3 || pierHitsLowerRoad(p, road, network.carriageways)) continue
          const ground = terrainHeight(network,p.x,p.z), height = p.y - ground - 2.2
          piers.push({ position: [p.x, ground + height / 2, p.z], scale: [1.7, height, 1.7] })
          caps.push({ position: [p.x, p.y - 2.05, p.z], scale: [width - 1, 0.85, 2.4], rotation: Math.atan2(t.x, t.z) })
        }
      }
      if (urbanRoad && !road.oneWay && road.laneCount > 1) {
        // These carriageways contain both directions: yellow belongs at their
        // centre, while white separators stay between lanes of one direction.
        for (const side of road.medianWidth ? [-1, 1] : [0]) for (const offset of [-0.11, 0.11]) yellow.push(strip(road.points, 0.12, offset + side * (road.medianWidth ?? 0) / 2 + (road.laneCount % 2 ? road.laneWidth / 2 : 0), 0.045))
      }
    }
    if (hasUrban) {
      const entries = network.lanes.filter(l => l.stopLine !== undefined && !l.waitingArea && l.kind !== 'main')
      for (const lane of entries) {
        const last = lane.points.at(-1)!, before = lane.points.at(-2)!, length = Math.hypot(last.x - before.x, last.z - before.z)
        const t = { x: (last.x - before.x) / length, z: (last.z - before.z) / length }
        const local = (forward: number, right: number): Vec3 => ({ x: last.x + t.x * forward - t.z * right, y: last.y + 0.055, z: last.z + t.z * forward + t.x * right })
        const mark = (s: number, offset: number, length: number, width: number) => {
          paint.push(strip([local(-s - length / 2, offset), local(-s + length / 2, offset)], width))
        }
        const mustYield = network.control.kind === 'yield' && !(network.control.majorApproaches ?? []).includes(lane.entry!)
        if (mustYield) {
          // Give-way marking: two broken lines and a white inverted triangle.
          for (const s of [1.5, 2.25]) for (let offset = -lane.width / 2 + 0.4; offset < lane.width / 2; offset += 0.8) mark(s, offset, 0.2, 0.5)
          const corners = [local(-6, -1), local(-6, 1), local(-9.5, 0)]
          for (let i = 0; i < 3; i++) paint.push(strip([corners[i], corners[(i + 1) % 3]], 0.18))
        } else if (network.control.kind === 'signal') mark(lane.length - (lane.stopLine ?? lane.length - 1.5), 0, 0.45, lane.width - 0.2)
        const turns = new Set(network.movements.filter(m => m.lanes.includes(lane.id)).map(m => m.turn))
        // Filled heads and a bent shaft show the destinations of this lane.
        for (const s of [15, 36]) {
          paint.push(strip([local(-s - 2.3, 0), local(-s + 0.3, 0)], 0.23))
          if (turns.has('straight')) {
            paint.push(strip([local(-s, 0), local(-s + 1.2, 0)], 0.23))
            paint.push(triangle(local(-s + 2.4, 0), local(-s + 0.8, -0.6), local(-s + 0.8, 0.6)))
          }
          for (const side of [-1, 1]) if (turns.has(side < 0 ? 'left' : 'right')) {
            paint.push(strip([local(-s - 0.5, 0), local(-s + 0.3, side * 0.7), local(-s + 0.3, side)], 0.23))
            paint.push(triangle(local(-s + 0.3, side * 1.65), local(-s - 0.3, side * 0.8), local(-s + 0.9, side * 0.8)))
          }
        }
      }
      for (const waiting of network.lanes.filter(lane => lane.waitingArea)) {
        for (const side of [-1, 1]) paint.push(...dashGeometry(waiting.points, side * waiting.width / 2, 1.6, 1.6))
        const stop = sampleLane(waiting, waiting.stopLine ?? waiting.length)
        paint.push(strip([{ x: stop.position.x - stop.tangent.z * waiting.width / 2, y: stop.position.y + 0.07, z: stop.position.z + stop.tangent.x * waiting.width / 2 }, { x: stop.position.x + stop.tangent.z * waiting.width / 2, y: stop.position.y + 0.07, z: stop.position.z - stop.tangent.x * waiting.width / 2 }], 0.35))
      }
      // Zebra crossings span each approach, leaving the central turning area clear.
      const crossings: { cx: number; cz: number; tx: number; tz: number; y: number; width: number }[] = []
      if (network.urbanJunctions?.length) {
        const vectors = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] } as const
        for (const node of network.urbanJunctions) for (const arm of node.arms) {
          const [dx, dz] = vectors[arm.direction]
          const stopGates = entries.filter(lane => { const p = lane.points.at(-1)!; return Math.abs((p.x - node.position.x) * dz - (p.z - node.position.z) * dx) < arm.halfWidth + 2 && (p.x - node.position.x) * dx + (p.z - node.position.z) * dz > 0 && Math.hypot(p.x - node.position.x, p.z - node.position.z) < 70 })
          const at = stopGates.length ? Math.min(...stopGates.map(lane => { const p = lane.points.at(-1)!; return (p.x - node.position.x) * dx + (p.z - node.position.z) * dz })) - (node.layout === 'roundabout' ? -3 : 3) : 20
          crossings.push({ cx: node.position.x + dx * at, cz: node.position.z + dz * at, tx: -dx, tz: -dz, y: node.position.y + 0.06, width: arm.halfWidth * 2 - 0.5 })
        }
      } else for (const approach of [...new Set(network.movements.map(m => m.from))]) {
        const lane = network.lanes.find(l => l.entry === approach)
        if (!lane) continue
        const end = lane.points.at(-1)!, before = lane.points.at(-2)!, n = Math.hypot(end.x - before.x, end.z - before.z), tx = (end.x - before.x) / n, tz = (end.z - before.z) / n
        crossings.push({ cx: end.x + tx * 3 + tz * lane.width / 2, cz: end.z + tz * 3 - tx * lane.width / 2, tx, tz, y: end.y + 0.06, width: network.lanes.filter(l => l.entry === approach).length * lane.width * 2 })
      }
      for (const crossing of crossings) for (let k = -crossing.width / 2 + 0.4; k < crossing.width / 2; k += 1.1) {
        const { cx, cz, tx, tz, y } = crossing
        paint.push(strip([{ x: cx - tz * k - tx * 1.8, y, z: cz + tx * k - tz * 1.8 }, { x: cx - tz * k + tx * 1.8, y, z: cz + tx * k + tz * 1.8 }], 0.5))
      }
    }
    for (const lamp of lamps) {
      const p = lamp.position, h = lamp.height, angle = lamp.rotation
      lampPoles.push({ position: [p.x, p.y + h / 2, p.z], scale: [lamp.urban ? 0.18 : 0.40, h, lamp.urban ? 0.18 : 0.40] })
      if (lamp.urban) {
        lampArms.push({ position: [p.x + Math.cos(angle) * 1.4, p.y + h - 0.1, p.z - Math.sin(angle) * 1.4], scale: [3, 0.13, 0.13], rotation: angle })
        luminaires.push({ position: [p.x + Math.cos(angle) * 2.8, p.y + h - 0.2, p.z - Math.sin(angle) * 2.8], scale: [0.7, 0.12, 0.35], color: '#ffbd71' })
      } else {
        for (let n = 0; n < 6; n++) {
          const a = n * Math.PI / 3
          luminaires.push({ position: [p.x + Math.cos(a) * 1.8, p.y + h, p.z + Math.sin(a) * 1.8], scale: [0.8, 0.15, 0.8], color: '#f7e8d1' })
        }
        lampArms.push({ position: [p.x, p.y + h - 0.15, p.z], scale: [3.9, 0.15, 3.9] })
      }
    }
    return { pavement: mergeGeometry(pavement), concrete: mergeGeometry(concrete), edgeCaps: mergeGeometry(edgeCaps), soffits: mergeGeometry(soffits), paint: mergeGeometry(paint), yellow: mergeGeometry(yellow), piers, caps, lampPoles, lampArms, luminaires }
}

const GEOMETRIES = ['pavement','concrete','edgeCaps','soffits','paint','yellow'] as const
interface PackedGeometry { position:Float32Array; normal:Float32Array; uv?:Float32Array; bounds:[number,number,number,number] }
export type PackedRoadGeometry = { [K in typeof GEOMETRIES[number]]:PackedGeometry } & Pick<ReturnType<typeof buildRoadGeometry>,'piers'|'caps'|'lampPoles'|'lampArms'|'luminaires'>
export function packRoadGeometry(assets:ReturnType<typeof buildRoadGeometry>):PackedRoadGeometry {
  const result:Record<string,unknown>={...assets}
  for(const key of GEOMETRIES){const g=assets[key];result[key]={position:g.getAttribute('position').array,normal:g.getAttribute('normal').array,uv:g.getAttribute('uv')?.array,bounds:[g.boundingSphere!.center.x,g.boundingSphere!.center.y,g.boundingSphere!.center.z,g.boundingSphere!.radius]}}
  return result as PackedRoadGeometry
}
export function unpackRoadGeometry(data:PackedRoadGeometry) {
  const result={...data} as unknown as ReturnType<typeof buildRoadGeometry>
  for(const key of GEOMETRIES){const g=new T.BufferGeometry();for(const name of ['position','normal','uv'] as const){const array=data[key][name];if(array)g.setAttribute(name,new T.BufferAttribute(array,name==='uv'?2:3))}const [x,y,z,radius]=data[key].bounds;g.boundingSphere=new T.Sphere(new T.Vector3(x,y,z),radius);result[key]=g}
  return result
}
export function roadGeometryBuffers(data:PackedRoadGeometry):ArrayBuffer[]{return GEOMETRIES.flatMap(key=>['position','normal','uv'].flatMap(name=>{const array=data[key][name as 'position'|'normal'|'uv'];return array?[array.buffer as ArrayBuffer]:[]}))}
