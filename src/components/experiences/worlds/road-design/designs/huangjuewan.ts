import { balanceThroughEntries } from '../sim/demand'
import roadData from '../data/huangjuewan-roads.json'
import terrainData from '../data/huangjuewan-terrain.json'
import type { Carriageway, DesignSpec, Lane, Movement, Network, SchematicMovement, Turn, Vec3 } from '../sim/types'
import { terrainHeight } from '../sim/terrain'
import { distance, joinPaths, lane, lengthOf, mix, offsetPath, smoothstep } from './kit'

/** OSM topology and plan coordinates are observed; every road elevation is inferred. */
export const HUANGJUEWAN_METADATA = roadData.metadata
export const HUANGJUEWAN_TERRAIN = terrainData
export const sampleHuangjuewanTerrain = (x: number, z: number) => terrainHeight(terrainData, x, z)
interface Segment { id: string; nodes: number[]; points: Vec3[]; from: number; to: number; road: typeof roadData.roads[number]; length: number }
interface Portal { node: number; id: string; name: string; count: number; road: Segment; incoming: boolean }
const nodes: Vec3[] = roadData.nodes.map(p => ({ x: p[1] as number, y: p[2] as number, z: p[3] as number }))

function splitRoads(): Segment[] {
  const usage = new Map<number, number>()
  for (const road of roadData.roads) for (const node of road.nodes) usage.set(node, (usage.get(node) ?? 0) + 1)
  const segments: Segment[] = []
  for (const road of roadData.roads) {
    let start = 0
    for (let index = 1; index < road.nodes.length; index++) {
      if (index < road.nodes.length - 1 && usage.get(road.nodes[index])! < 2) continue
      const ids = road.nodes.slice(start, index + 1), points = ids.map(id => nodes[id])
      segments.push({ id: `${road.id}-${start}`, from: ids[0], to: ids.at(-1)!, nodes: ids, points, road, length: lengthOf(points) }); start = index
    }
  }
  return segments
}

function heading(segment: Segment, end: boolean) {
  const points = segment.points, a = end ? points.at(-2)! : points[0], b = end ? points.at(-1)! : points[1]
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length }
}
function portalName(segment: Segment, incoming: boolean) {
  const p = incoming ? segment.points[0] : segment.points.at(-1)!, road = segment.road
  if (road.name === '包茂高速') return p.z < 0 ? ['g65-north', '包茂高速北'] : ['g65-south', '包茂高速南']
  if (road.name === '峡江路') return p.x < 0 ? ['xiajiang-west', '朝天门大桥方向'] : ['xiajiang-east', '慈母山隧道方向']
  if (road.name === '渝航大道') return ['yuhang-north', '机场方向']
  // Three distinct local-road access arms remain separate boundary portals.
  if (p.z > 80) return ['local-south', '弹子石南向连接']
  return p.x > 50 ? ['local-east', '弹广路东向连接'] : ['local-west', '弹广路西向连接']
}

/** Positive edge lengths make Dijkstra deterministic; no connector is invented. */
export function shortestHuangjuewanRoute(segments: Segment[], start: number, goal: number): Segment[] | undefined {
  const outgoing = new Map<number, Segment[]>()
  for (const edge of segments) { const list = outgoing.get(edge.from) ?? []; list.push(edge); outgoing.set(edge.from, list) }
  const costs = new Map([[start, 0]]), previous = new Map<number, Segment>(), settled = new Set<number>()
  while (true) {
    let current: number | undefined, best = Infinity
    for (const [node, cost] of costs) if (!settled.has(node) && cost < best) { current = node; best = cost }
    if (current === undefined) return
    if (current === goal) break
    settled.add(current)
    for (const edge of outgoing.get(current) ?? []) {
      const cost = best + edge.length
      if (cost < (costs.get(edge.to) ?? Infinity)) { costs.set(edge.to, cost); previous.set(edge.to, edge) }
    }
  }
  const route: Segment[] = []; let node = goal
  while (node !== start) { const edge = previous.get(node); if (!edge) return; route.unshift(edge); node = edge.from }
  return route
}

function routeTurn(first: Segment, last: Segment): Turn {
  const a = heading(first, false), b = heading(last, true), angle = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z)
  return Math.abs(angle) < Math.PI / 3 ? 'straight' : angle > 0 ? 'right' : 'left'
}
function branchPath(segment: Segment, incoming: boolean, metres = 70) {
  const points = incoming ? [...segment.points].reverse() : segment.points, kept = [points[0]]; let sum = 0
  for (let index = 1; index < points.length && sum < metres; index++) { sum += distance(points[index - 1], points[index]); kept.push(points[index]) }
  return incoming ? kept.reverse() : kept
}

function firstMetres(points: Vec3[], metres: number) {
  const result = [points[0]]; let walked = 0
  for (let index = 1; index < points.length; index++) {
    const length = distance(points[index - 1], points[index])
    if (walked + length >= metres) { result.push(mix(points[index - 1], points[index], (metres - walked) / length)); break }
    result.push(points[index]); walked += length
  }
  return result
}

/** OSM ways describe centre lines, not the length of merge tapers. The auxiliary
 * lane is an explicit engineering assumption; the imported database is intact. */
function taperEnd(points: Vec3[], end: Vec3, maximumSpan = 60): Vec3[] {
  const oldEnd = points.at(-1)!, delta = { x: end.x - oldEnd.x, y: end.y - oldEnd.y, z: end.z - oldEnd.z }
  const span = Math.min(maximumSpan, lengthOf(points) * .5)
  let remaining = 0
  const tapered = [...points].reverse().map((p, index, reversed) => {
    if (index) remaining += distance(reversed[index - 1], p)
    const weight = smoothstep(1 - remaining / Math.max(.001, span))
    return { x: p.x + delta.x * weight, y: p.y + delta.y * weight, z: p.z + delta.z * weight }
  }).reverse()
  // Offset joins can shorten a curved centre line. Preserve both endpoints
  // while projecting intermediate heights back into the 6% grade envelope.
  for (let pass = 0; pass < 80; pass++) for (const forward of [true, false]) {
    for (let k = 1; k < tapered.length - 1; k++) {
      const i = forward ? k : tapered.length - 1 - k, j = forward ? i - 1 : i + 1
      const p = tapered[i], q = tapered[j], rise = .0599 * Math.hypot(p.x - q.x, p.z - q.z)
      p.y = Math.max(q.y - rise, Math.min(q.y + rise, p.y))
    }
  }
  return tapered
}

/** Match offset lane endpoints at observed shared nodes. Road centre lines stay
 * untouched; short lateral tapers describe lane continuity through an OSM split. */
function alignLaneJoins(lanes: Lane[]) {
  const byId = new Map(lanes.map(item => [item.id, item]))
  const parent = new Map<string,string>()
  const root = (key: string): string => { const previous=parent.get(key); if(!previous) { parent.set(key,key); return key } if(previous===key)return key; const found=root(previous);parent.set(key,found);return found }
  for(const item of lanes)for(const id of item.next)if(byId.has(id))parent.set(root(`end:${item.id}`),root(`start:${id}`))
  const groups = new Map<string,{ lane: Lane; start: boolean; point: Vec3 }[]>()
  for(const item of lanes)for(const start of [true,false]) {
    const key=`${start?'start':'end'}:${item.id}`
    if(!parent.has(key))continue
    const id=root(key), group=groups.get(id)??[]
    group.push({lane:item,start,point:start?item.points[0]:item.points.at(-1)!});groups.set(id,group)
  }
  for(const group of groups.values()) {
    const references=group.filter(row=>row.lane.kind==='main'), samples=references.length?references:group
    const point=samples.reduce((p,row)=>({x:p.x+row.point.x/samples.length,y:p.y+row.point.y/samples.length,z:p.z+row.point.z/samples.length}),{x:0,y:0,z:0})
    for(const row of group) row.lane.points=row.start?taperEnd([...row.lane.points].reverse(),point).reverse():taperEnd(row.lane.points,point)
  }
  for(const item of lanes) { item.length=lengthOf(item.points);item.cumulative=[0];for(let i=1;i<item.points.length;i++)item.cumulative.push(item.cumulative[i-1]+distance(item.points[i-1],item.points[i])) }
}

export function buildHuangjuewan(): Network {
  const segments = splitRoads(), incoming = new Map<number, Segment[]>(), outgoing = new Map<number, Segment[]>()
  for (const segment of segments) {
    incoming.set(segment.to, [...(incoming.get(segment.to) ?? []), segment]); outgoing.set(segment.from, [...(outgoing.get(segment.from) ?? []), segment])
  }
  const entries: Portal[] = [], exits: Portal[] = []
  for (const segment of segments) {
    for (const inbound of [true, false]) {
      const node = inbound ? segment.from : segment.to
      if ((inbound ? incoming : outgoing).has(node)) continue
      const [id, name] = portalName(segment, inbound)
      ;(inbound ? entries : exits).push({ node, id, name, count: segment.road.lanes, road: segment, incoming: inbound })
    }
  }
  const lanes: Lane[] = [], carriageways: Carriageway[] = [], movements: Movement[] = [], schematicMovements: SchematicMovement[] = []
  const laneId = (edge: Segment, index: number) => `hjw-${edge.id}-${index}`
  const isRamp = (segment: Segment) => segment.road.highway.endsWith('_link')
  const departureLane = (edge: Segment, next: Segment) => {
    const h = heading(edge, true), origin = next.points[0], p = next.points[Math.min(next.points.length - 1, 4)]
    return h.x * (p.z - origin.z) - h.z * (p.x - origin.x) >= 0 ? edge.road.lanes - 1 : 0
  }
  const arrivalLane = (edge: Segment, next: Segment) => {
    const h = heading(next, false), origin = edge.points.at(-1)!, p = edge.points[Math.max(0, edge.points.length - 5)]
    return h.x * (p.z - origin.z) - h.z * (p.x - origin.x) >= 0 ? next.road.lanes - 1 : 0
  }
  // Geometry is one carriageway per observed way; sim edges split only at real nodes.
  for (const road of roadData.roads) carriageways.push({ id: `hjw-road-${road.id}`, points: road.nodes.map(id => nodes[id]), laneCount: road.lanes, laneWidth: 3.75, level: Math.max(0, road.layer), kind: road.highway.endsWith('_link') ? 'ramp' : 'main', speedLimit: (road.highway.endsWith('_link') ? 50 : road.highway === 'motorway' ? 100 : 80) / 3.6, bridge: road.bridge, oneWay: true, shoulder: road.highway.endsWith('_link') ? 1 : 2 })
  for (const edge of segments) for (let index = 0; index < edge.road.lanes; index++) {
    const points = offsetPath(edge.points, (index - (edge.road.lanes - 1) / 2) * 3.75)
    const next: string[] = []
    for (const successor of outgoing.get(edge.to) ?? []) {
      if (isRamp(successor) && !isRamp(edge) && index !== departureLane(edge, successor)) continue
      const nextIndex = isRamp(edge) && !isRamp(successor) ? arrivalLane(edge, successor) : Math.min(index, successor.road.lanes - 1)
      next.push(laneId(successor, nextIndex))
    }
    const l = lane(laneId(edge, index), points, { width: 3.75, speedLimit: (isRamp(edge) ? 50 : edge.road.highway === 'motorway' ? 100 : 80) / 3.6, kind: isRamp(edge) ? 'ramp' : 'main', level: Math.max(0, edge.road.layer), next,
      entry: entries.find(portal => portal.node === edge.from)?.id, exit: exits.find(portal => portal.node === edge.to)?.id,
      ...(index > 0 ? { left: laneId(edge, index - 1) } : {}), ...(index < edge.road.lanes - 1 ? { right: laneId(edge, index + 1) } : {}),
      merge: isRamp(edge) && (incoming.get(edge.to)?.length ?? 0) > 1,
    })
    // No speculative solid line through a branch: the imported OSM lacks markings.
    lanes.push(l)
  }
  const accelerationLanes = new Map<string, string>()
  const lanesById = new Map(lanes.map(lane => [lane.id, lane]))
  const sharedAuxiliaries = new Set<string>()
  for (const edge of segments.filter(isRamp)) for (const successor of outgoing.get(edge.to) ?? []) {
    if (isRamp(successor) || successor.length < 85 || (incoming.get(edge.to)?.length ?? 0) < 2) continue
    const index = arrivalLane(edge, successor), receiving = lanesById.get(laneId(successor, index))!
    const side = index === 0 ? -1 : 1
    const points = firstMetres(offsetPath(receiving.points, side * 3.75), Math.min(240, receiving.length - 20))
    const id = `hjw-accel-${successor.id}-${index}`
    const auxiliary = lane(id, points, { width: 3.75, speedLimit: receiving.speedLimit, level: receiving.level, kind: 'ramp', next: [], merge: true, ...(side > 0 ? { left: receiving.id } : { right: receiving.id }) })
    if (!sharedAuxiliaries.has(id)) lanes.push(auxiliary)
    accelerationLanes.set(`${edge.id}|${successor.id}`, id)
    for (let rampIndex = 0; rampIndex < edge.road.lanes; rampIndex++) {
      const previous = lanesById.get(laneId(edge, rampIndex))!
      previous.next = previous.next.map(next => next === receiving.id ? id : next)
      previous.points = taperEnd(previous.points, points[0]); previous.length = lengthOf(previous.points)
      previous.cumulative = [0]
      for (let pi = 1; pi < previous.points.length; pi++) previous.cumulative.push(previous.cumulative[pi - 1] + distance(previous.points[pi - 1], previous.points[pi]))
      previous.merge = (incoming.get(edge.to) ?? []).filter(isRamp).length > 1
    }
    const surface = carriageways.find(item => item.id === `hjw-road-${edge.road.id}`)!
    surface.points = taperEnd(surface.points, points[0], 160)
    if (!sharedAuxiliaries.has(id)) carriageways.push({ id, points, laneCount: 1, laneWidth: 3.75, level: receiving.level, kind: 'ramp', speedLimit: receiving.speedLimit, bridge: successor.road.bridge, oneWay: true, shoulder: .35 })
    sharedAuxiliaries.add(id)
  }
  alignLaneJoins(lanes)
  const defaultOD: NonNullable<Network['defaultOD']> = []
  for (const entry of entries) {
    const reachable = exits.filter(exit => exit.id !== entry.id).flatMap(exit => {
      const route = shortestHuangjuewanRoute(segments, entry.node, exit.node)
      return route?.length ? [{ exit, route, straight: route.every(edge => !isRamp(edge)) }] : []
    })
    const through = reachable.filter(row => row.straight), turning = reachable.filter(row => !row.straight)
    const branchKey = (route: Segment[]) => route.find(isRamp)?.id ?? route[0].id
    const firstBranches = new Set(reachable.map(row => branchKey(row.route)))
    // A terminating three-lane arterial feeds two single-lane ramp branches;
    // use 600 veh/h/lane there, versus 750 on a continuous urban expressway.
    const rate = isRamp(entry.road) ? 360 : entry.count * (entry.road.road.highway === 'motorway' ? 1500 : through.length ? 750 : 600)
    for (const { exit, route, straight } of reachable) {
      // 15% motorway demand changes routes; airport's terminating arterial has no
      // through continuation, so its observed connectors share the whole demand.
      const share = through.length && turning.length ? (straight ? .85 / through.length : .15 / turning.length) : 1 / firstBranches.size / reachable.filter(row => branchKey(row.route) === branchKey(route)).length
      const firstBranch = route.findIndex((edge, i) => i > 0 && isRamp(edge) && !isRamp(route[i - 1]))
      const branchLane = firstBranch > 0 ? departureLane(route[firstBranch - 1], route[firstBranch]) : entry.count - 1
      const startIndices = straight ? Array.from({ length: entry.count }, (_, i) => i) : [Math.min(branchLane, entry.count - 1)]
      for (const startIndex of startIndices) {
        let index = startIndex; const ids: string[] = []
        for (let ri = 0; ri < route.length; ri++) {
          const edge = route[ri]; ids.push(laneId(edge, index))
          const next = route[ri + 1]
          if (!next) continue
          if (isRamp(next) && !isRamp(edge)) {
            const required = departureLane(edge, next)
            while (index !== required) { index += Math.sign(required - index); ids.push(laneId(edge, index)) }
          }
          const acceleration = accelerationLanes.get(`${edge.id}|${next.id}`)
          if (acceleration) ids.push(acceleration)
          index = isRamp(edge) && !isRamp(next) ? arrivalLane(edge, next) : Math.min(index, next.road.lanes - 1)
        }
        const turn = routeTurn(route[0], route.at(-1)!), id = `hjw-${entry.node}-${exit.node}-${startIndex}`
        movements.push({ id, name: `${entry.name} → ${exit.name}`, from: entry.id, to: exit.id, turn, lanes: ids, weight: share / startIndices.length, priority: straight ? 2 : 1 })
        defaultOD.push({ movementId: id, vehiclesPerHour: rate * share / startIndices.length })
      }
    }
  }
  // Each local in/out pair includes the common predecessor/successor chord.
  // Physical joins are computed from shared paths, never from a canned count.
  for (const [node, ins] of incoming) {
    const outs = outgoing.get(node) ?? []
    if (ins.length < 2 && outs.length < 2) continue
    for (const a of ins) for (const b of outs) schematicMovements.push({ id: `hjw-branch-${a.id}-${b.id}`, name: `${a.road.name || '匝道'} → ${b.road.name || '匝道'}`, from: a.id, to: b.id, turn: routeTurn(a, b), points: joinPaths(branchPath(a, true), branchPath(b, false)), level: Math.max(a.road.layer, b.road.layer, 0) })
  }
  const network: Network = { id: 'huangjuewan', lanes, carriageways, movements, schematicMovements, defaultOD, terrain: HUANGJUEWAN_TERRAIN, weaving: [], control: { kind: 'free' }, measurementArea: { minX: -550, maxX: 550, minZ: -850, maxZ: 650 } }
  balanceThroughEntries(network, defaultOD)
  return network
}

/** Count link-only paths from a non-link entry to a non-link exit, collapsing
 * OSM's bridge/layer splits but retaining genuinely branching ramp corridors. */
export function huangjuewanTopologySummary() {
  const segments = splitRoads(), incoming = new Map<number, Segment[]>(), outgoing = new Map<number, Segment[]>()
  for (const edge of segments) { incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]); outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]) }
  const ramp = (edge: Segment) => edge.road.highway.endsWith('_link')
  const starts = segments.filter(edge => ramp(edge) && !(incoming.get(edge.from) ?? []).some(ramp))
  let corridors = 0
  const walk = (edge: Segment, seen: Set<string>) => {
    const next = (outgoing.get(edge.to) ?? []).filter(ramp)
    if (!next.length) { corridors++; return }
    for (const candidate of next) if (!seen.has(candidate.id)) walk(candidate, new Set([...seen, candidate.id]))
  }
  for (const edge of starts) walk(edge, new Set([edge.id]))
  const network = buildHuangjuewan(), laneMap = new Map(network.lanes.map(lane => [lane.id, lane]))
  const rampConnections = new Set(network.movements.filter(movement => movement.lanes.some(id => laneMap.get(id)!.kind === 'ramp')).map(movement => `${movement.from} → ${movement.to}`))
  return { mainSystemRampConnections: [...rampConnections].filter(connection => !connection.includes('local-')).length,
    allTurningODConnections: rampConnections.size, branchedLinkPaths: corridors, rampWays: roadData.roads.filter(road => road.highway.endsWith('_link')).length, directionCount: new Set(network.movements.flatMap(movement => [movement.from, movement.to])).size,
    entryPortals: segments.filter(edge => !incoming.has(edge.from)).length, exitPortals: segments.filter(edge => !outgoing.has(edge.to)).length,
    directions: [...new Set(network.movements.flatMap(movement => [movement.from, movement.to]))], movements: network.movements.length }
}

export const huangjuewan: DesignSpec = {
  id: 'huangjuewan', name: '重庆黄桷湾立交', nameEn: 'Huangjuewan · Chongqing', chapter: 4,
  description: '真实道路在山谷里层层相接。线形来自 OpenStreetMap；桥面高度由层号、坡度和净空推断，不是实测。',
  defaultDemand: 900, camera: { position: { x: 580, y: 365, z: 670 }, target: { x: 0, y: 33, z: -15 }, fov: 48 }, build: buildHuangjuewan,
}
