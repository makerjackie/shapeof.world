import type { ConflictPoint, Lane, Movement, Network, Vec3 } from '../sim/types'
import { cumulativeLengths, projectToLane, sampleLane } from '../sim/geometry'
import { distance, mix, smoothstep } from '../designs/kit'

export const APPROACH_NAMES: Record<string, string> = {
  north: '北进', east: '东进', south: '南进', west: '西进',
  'g65-north': '包茂高速北', 'g65-south': '包茂高速南', 'xiajiang-west': '朝天门大桥方向',
  'xiajiang-east': '慈母山隧道方向', 'yuhang-north': '机场方向', 'local-south': '弹子石南向连接',
  'local-east': '弹广路东向连接', 'local-west': '弹广路西向连接',
}
export const TURN_NAMES = { left: '左转', straight: '直行', right: '右转', uturn: '掉头' }
export const TURN_SYMBOLS = { left: '↰', straight: '↑', right: '↱', uturn: '↶' }
export function turnKey(m: Movement) { return m.from === m.to ? 'uturn' : m.turn }
export const EXIT_NAMES:Record<string,string>={north:'北出',east:'东出',south:'南出',west:'西出'}
export function exitName(id:string){return EXIT_NAMES[id]??approachName(id)}
export function approachName(id: string) { return APPROACH_NAMES[id] ?? id }
export interface RouteReading {
  length: number; direct: number; detour: number; radius: number; speedKmh: number
  levels: number[]; climbs: number; descents: number; conflicts: ConflictPoint[]; weaving: string[]
}
export interface ExploreRoute {
  movement: Movement; path: Lane; reading: RouteReading; entry: Vec3; entryTangent: Vec3
  laneIds: string[]; focusPoints:Vec3[]
}

/** A route lists lateral transfers as consecutive lanes. Concatenating those
 * would drive backwards and count a weaving segment twice. Blend along the
 * actual adjacent pair once; this is a representative lane-change trace, not
 * the claim that all drivers change at an identical longitudinal position. */
export function movementPath(network: Network, movement: Movement): Vec3[] {
  const byId = new Map(network.lanes.map(l => [l.id, l]))
  const points: Vec3[] = []
  const append = (p: Vec3) => { if (!points.length || distance(points.at(-1)!, p) > 1e-5) points.push(p) }
  for (let i = 0; i < movement.lanes.length; i++) {
    const first = byId.get(movement.lanes[i])!
    const next = byId.get(movement.lanes[i + 1])
    if (next && !first.next.includes(next.id) && (first.left === next.id || first.right === next.id)) {
      const count = Math.max(12, Math.ceil(first.length / 3))
      for (let n = 0; n <= count; n++) {
        const t = n / count, a = sampleLane(first, t * first.length).position
        const b = sampleLane(next, projectToLane(next, a)).position
        append(mix(a, b, smoothstep((t - .3) / .4)))
      }
      i++
    } else first.points.forEach(append)
  }
  return points
}

/** Horizontal circumcircle of three road-centre samples. Lane-change traces
 * are deliberately excluded from a road's minimum geometric turning radius. */
export function minimumRadius(lanes: Lane[]) {
  let radius = Infinity, speedKmh = Infinity
  for (const lane of lanes) {
    const p = lane.points
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i-1], b = p[i], c = p[i+1]
      const ab = Math.hypot(b.x-a.x, b.z-a.z), bc = Math.hypot(c.x-b.x, c.z-b.z), ac = Math.hypot(c.x-a.x, c.z-a.z)
      const cross = Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))
      if (Math.min(ab,bc,ac) < .05 || cross < 1e-7) continue
      const r = ab * bc * ac / (2 * cross)
      if (r < radius) { radius = r; speedKmh = lane.speedLimit * 3.6 }
    }
  }
  return { radius, speedKmh: Number.isFinite(speedKmh) ? speedKmh : Math.min(...lanes.map(l=>l.speedLimit*3.6)) }
}

export function buildExploreRoutes(network: Network, conflicts: ConflictPoint[]): ExploreRoute[] {
  const byId = new Map(network.lanes.map(l => [l.id, l]))
  const seen = new Set<string>()
  return network.movements.filter(m => {
    // Collapse equivalent parallel through lanes; keep distinct destinations.
    const key = `${m.from}:${m.to}:${m.turn}`
    if (seen.has(key)) return false
    seen.add(key); return true
  }).map(movement => {
    const lanes = movement.lanes.map(id => byId.get(id)!)
    const points = movementPath(network,movement), cumulative = cumulativeLengths(points), length = cumulative.at(-1)!
    const path = { ...lanes[0], id: movement.id, points, cumulative, length }
    const start = points[0], end = points.at(-1)!, direct = Math.hypot(end.x-start.x,end.z-start.z)
    const near = (p: Vec3) => distance(sampleLane(path,projectToLane(path,p)).position,p) < 7
    // Static conflicts use one representative lane per arm. Associate the
    // selected O-D (or local connector) with that diagram before measuring;
    // a broad proximity buffer would count neighbouring, unrelated crossings.
    const segments=new Set(movement.lanes.filter(id=>!id.startsWith('hjw-accel-')).map(id=>id.replace(/^hjw-/,'').replace(/-\d+$/,'')))
    const diagrams=network.schematicMovements.filter(s=>
      (s.from===movement.from&&s.to===movement.to&&s.turn===movement.turn)||
      movement.lanes.some(id=>id===s.id||id===`${s.id}-outer`)||
      (network.id==='huangjuewan'&&segments.has(s.from)&&segments.has(s.to)))
    const conflictPaths=[path,...diagrams.map(s=>{const cumulative=cumulativeLengths(s.points);return {...path,points:s.points,cumulative,length:cumulative.at(-1)!}})]
    const touched=conflicts.filter(c=>conflictPaths.some(p=>distance(sampleLane(p,projectToLane(p,c.position)).position,c.position)<.005))
    const levels = [...new Set(lanes.map(l=>l.level))].sort((a,b)=>a-b)
    let climbs=0, descents=0, previous=lanes[0].level
    for (const l of lanes) { if(l.level>previous)climbs++; if(l.level<previous)descents++; previous=l.level }
    const entry = sampleLane(lanes[0], Math.max(0,lanes[0].length - (network.id==='huangjuewan'?35:80)))
    const turning=lanes.filter(l=>l.kind==='connector'||l.kind==='ramp')
    const focusPoints=turning.flatMap(l=>l.points)
    return {movement,path,focusPoints:focusPoints.length>1?focusPoints:points,laneIds:movement.lanes,entry:entry.position,entryTangent:entry.tangent,
      reading:{length,direct,detour:Math.max(0,length-direct),...minimumRadius(lanes),levels,climbs,descents,conflicts:touched,
        weaving:network.weaving.filter(w=>w.lanes?.some(id=>movement.lanes.includes(id)) || w.points.some(near)).map(w=>w.id)}}
  }).sort((a,b)=> {
    const order=['north','east','south','west'], ai=order.indexOf(a.movement.from),bi=order.indexOf(b.movement.from)
    return (ai<0?4:ai)-(bi<0?4:bi) || a.movement.from.localeCompare(b.movement.from) || ['left','straight','right'].indexOf(a.movement.turn)-['left','straight','right'].indexOf(b.movement.turn)
  })
}
