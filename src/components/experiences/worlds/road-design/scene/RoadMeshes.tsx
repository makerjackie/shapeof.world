import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { Carriageway, Network, Vec3 } from '../sim/types'
import type { TrafficSimulation } from '../sim/simulation'
import { signalState } from '../sim/control'
import { sampleLane } from '../sim/geometry'
import { fillInstances, mergeGeometry, samplePath, strip, wall, type Instance } from './mesh-kit'
import { litMaterial, type Lamp } from './NightWorld'
import { UrbanGround } from './UrbanGround'

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
  let nearest = { distance: Infinity, lateral: 0, y: 0 }
  for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz)
    const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / Math.max(0.0001, length * length)))
    const px = p.x - a.x - dx * u, pz = p.z - a.z - dz * u, distance = Math.hypot(px, pz)
    if (distance < nearest.distance) nearest = { distance, lateral: (-dz * px + dx * pz) / Math.max(0.0001, length), y: a.y + (b.y - a.y) * u }
  }
  return nearest
}

export function RoadMeshes({ network, atlas, lamps, simulation }: { network: Network; atlas: T.Texture; lamps: Lamp[]; simulation: TrafficSimulation }) {
  const urban = network.carriageways.every(road => road.kind === 'urban')
  const hasUrban = urban || Boolean(network.urbanJunctions?.length)
  const assets = useMemo(() => {
    const pavement: T.BufferGeometry[] = [], concrete: T.BufferGeometry[] = [], edgeCaps: T.BufferGeometry[] = [], soffits: T.BufferGeometry[] = [], paint: T.BufferGeometry[] = [], yellow: T.BufferGeometry[] = []
    const piers: Instance[] = [], caps: Instance[] = [], lampPoles: Instance[] = [], lampArms: Instance[] = [], luminaires: Instance[] = []
    for (const road of network.carriageways) {
      const urbanRoad = road.kind === 'urban' || Boolean(network.urbanJunctions?.length) && road.kind === 'ramp' && !road.bridge
      const half = (road.laneCount * road.laneWidth + (road.medianWidth ?? 0)) / 2, width = half * 2 + (road.shoulder ?? 0) * 2
      const bank = road.superelevation ?? 0
      const auxiliary = road.id.startsWith('aux-road-'), main = road.kind === 'main'
      const a = road.points[0], b = road.points.at(-1)!, horizontalLength = Math.hypot(b.x - a.x, b.z - a.z)
      const longitudinal = (p: Vec3) => (p.x * (b.x - a.x) + p.z * (b.z - a.z)) / horizontalLength
      const portals = network.carriageways.filter(r => r !== road && r.kind === 'ramp' && !r.id.startsWith('aux-road-')).flatMap(r => [r.points[0], r.points.at(-1)!]).flatMap(p => {
        const projection = projectToRoad(p, road)
        return projection.distance < width / 2 + 1.5 && Math.abs(p.y - projection.y) < 0.75 ? [{ at: longitudinal(p), side: Math.sign(projection.lateral) }] : []
      })
      const auxiliaryRanges = main ? network.carriageways.filter(r => r.id.startsWith('aux-road-')).flatMap(r => {
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
          if (auxiliary) return side > 0 && portals.every(portal => Math.abs(along - portal.at) > 35)
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
      if (road.bridge || road.points.some(p => p.y > 2.5)) {
        // Box-girder webs and soffit, sampled from exactly the same alignment as the deck.
        for (const section of sections(road.points, p => p.y > 2.5)) {
          for (const side of [-1, 1]) concrete.push(wall(section, side * (width / 2 - 0.7), -1.75, 0, bank))
          const underside = strip(section, width - 1.4, 0, -1.75, bank)
          const faces = underside.getIndex()!
          for (let n = 0; n < faces.count; n += 3) {
            const b = faces.getX(n + 1)
            faces.setX(n + 1, faces.getX(n + 2)); faces.setX(n + 2, b)
          }
          underside.computeVertexNormals(); soffits.push(underside)
        }
        for (const section of sections(road.points, p => p.y > 0.35 && p.y <= 2.5)) for (const side of [-1, 1]) {
          const retaining = wall(section, side * width / 2, -2.5, 0, bank)
          const positions = retaining.getAttribute('position')
          for (let i = 0; i < positions.count; i += 2) positions.setY(i, 0.03)
          retaining.computeVertexNormals()
          concrete.push(retaining)
        }
        for (const { position: p, tangent: t } of samplePath(road.points, 30)) {
          // Auxiliary decks share the mainline supports. Test every other road,
          // including curved ramps, before placing a column down to the ground.
          if (auxiliary || p.y < 3 || pierHitsLowerRoad(p, road, network.carriageways)) continue
          const height = p.y - 2.2
          piers.push({ position: [p.x, height / 2, p.z], scale: [1.7, height, 1.7] })
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
    return { pavement: mergeGeometry(pavement), concrete: mergeGeometry(concrete), edgeCaps: mergeGeometry(edgeCaps), soffits: mergeGeometry(soffits), paint: mergeGeometry(paint), yellow: mergeGeometry(yellow), piers, caps, lampPoles, lampArms, luminaires, asphalt: litMaterial(atlas, urban ? '#1d1f23' : '#252628', urban ? 1.3 : 2.1), cement: litMaterial(atlas, '#777571', 1.6), edgeMaterial: litMaterial(atlas, '#aca69a', 2.4), underside: litMaterial(atlas, '#25272a', 0.22) }
  }, [network, atlas, lamps, urban, hasUrban])
  useEffect(() => () => { assets.pavement.dispose(); assets.concrete.dispose(); assets.edgeCaps.dispose(); assets.soffits.dispose(); assets.paint.dispose(); assets.yellow.dispose(); assets.asphalt.dispose(); assets.cement.dispose(); assets.edgeMaterial.dispose(); assets.underside.dispose() }, [assets])
  return <>
    <mesh geometry={assets.pavement} material={assets.asphalt} />
    {hasUrban && <UrbanGround network={network} atlas={atlas} />}
    <mesh geometry={assets.concrete} material={assets.cement} />
    <mesh geometry={assets.edgeCaps} material={assets.edgeMaterial} />
    <mesh geometry={assets.soffits} material={assets.underside} />
    <mesh geometry={assets.paint}><meshStandardMaterial color="#d9d6cc" emissive="#c8bd9b" emissiveIntensity={0.12} roughness={0.8} side={T.DoubleSide} /></mesh>
    <mesh geometry={assets.yellow}><meshStandardMaterial color="#d4a72c" emissive="#9f7200" emissiveIntensity={0.15} side={T.DoubleSide} /></mesh>
    <instancedMesh args={[undefined, assets.cement, assets.piers.length]} ref={m => { if (m) fillInstances(m, assets.piers) }}><cylinderGeometry args={[0.5, 0.64, 1, 12]} /></instancedMesh>
    <instancedMesh args={[undefined, assets.cement, assets.caps.length]} ref={m => { if (m) fillInstances(m, assets.caps) }}><boxGeometry /></instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.lampPoles.length]} ref={m => { if (m) fillInstances(m, assets.lampPoles) }}><cylinderGeometry args={[0.5, 0.7, 1, 8]} /><meshStandardMaterial color="#5e666c" metalness={0.6} roughness={0.45} /></instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.lampArms.length]} ref={m => { if (m) fillInstances(m, assets.lampArms) }}><boxGeometry /><meshStandardMaterial color="#505a64" metalness={0.6} roughness={0.4} /></instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.luminaires.length]} ref={m => { if (m) fillInstances(m, assets.luminaires) }}><boxGeometry /><meshBasicMaterial color={[4, 3.8, 3.5]} toneMapped={false} /></instancedMesh>
    {network.control.kind === 'signal' && <SignalLights network={network} simulation={simulation} />}
  </>
}

function SignalLights({ network, simulation }: { network: Network; simulation: TrafficSimulation }) {
  const bulb = useRef<T.InstancedMesh>(null)
  const heads = useMemo(() => {
    const seen = new Set<string>()
    return network.lanes.filter(lane => lane.stopLine !== undefined && (lane.signalGroups?.length || lane.entry)).flatMap(lane => {
      if ((lane.signalGroups?.length ?? 0) > 1) return []
      const movement = network.movements.find(m => m.lanes.includes(lane.id))
      const groups = lane.signalGroups ?? [movement?.signalGroup ?? movement?.from ?? '']
      const sample = sampleLane(lane, lane.stopLine ?? lane.length), p = sample.position, { x: tx, z: tz } = sample.tangent
      const angle = Math.atan2(tx, tz)
      const node = network.urbanJunctions?.reduce((best, item) => Math.hypot(p.x - item.position.x, p.z - item.position.z) < Math.hypot(p.x - best.position.x, p.z - best.position.z) ? item : best)
      const key = `${node?.id ?? movement?.from}-${angle.toFixed(1)}-${groups.join('|')}`
      if (seen.has(key)) return []
      seen.add(key)
      let x = p.x + tx * 9 - tz * 6, z = p.z + tz * 9 + tx * 6
      if (node) {
        const fromNorthSouth = Math.abs(tz) > Math.abs(tx)
        const direction = fromNorthSouth ? tz > 0 ? 'north' : 'south' : tx > 0 ? 'west' : 'east'
        const arm = node.arms.find(arm => arm.direction === direction), half = arm?.halfWidth ?? 4
        const edge = Math.max(20, half + (node.cornerRadius ?? 12)) + 2
        const lateral = half + 1.3 + (lane.waitingArea ? 1.4 : 0)
        x = node.position.x - tx * edge - tz * lateral
        z = node.position.z - tz * edge + tx * lateral
      }
      return [{ x, z, angle, groups }]
    })
  }, [network])
  const o = useMemo(() => new T.Object3D(), [])
  const halos = useMemo(() => {
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(heads.flatMap(head => [0, 1, 2].flatMap(n => [head.x, 6.8 - n * 0.45, head.z])), 3))
    geometry.setAttribute('signalColor', new T.Float32BufferAttribute(new Float32Array(heads.length * 9), 3))
    const material = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute vec3 signalColor; varying vec3 glowColor; void main(){
        glowColor=signalColor; vec4 p=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*p; gl_PointSize=clamp(1000.0/max(1.0,-p.z),4.0,16.0);
      }`,
      fragmentShader: `varying vec3 glowColor; void main(){
        float r=length(gl_PointCoord-0.5)*2.0;
        float halo=exp(-r*r*5.5)*(1.0-smoothstep(0.7,1.0,r));
        gl_FragColor=vec4(glowColor,halo*0.4);
      }`,
    })
    return { geometry, material }
  }, [heads])
  useEffect(() => () => { halos.geometry.dispose(); halos.material.dispose() }, [halos])
  const signalColor = useMemo(() => new T.Color(), [])
  useFrame(() => {
    if (!bulb.current) return
    heads.forEach((head, i) => {
      const colors = head.groups.map(group => signalState(network.control, simulation.time, group))
      const state = colors.includes('green') ? 'green' : colors.includes('yellow') ? 'yellow' : 'red'
      for (let n = 0; n < 3; n++) {
        o.position.set(head.x, 6.8 - n * 0.45, head.z); o.rotation.set(0, head.angle, 0); o.scale.set(0.25, 0.25, 0.25); o.updateMatrix()
        bulb.current!.setMatrixAt(i * 3 + n, o.matrix)
        const active = state === (['red', 'yellow', 'green'] as const)[n]
        signalColor.set(active ? [0xff3022, 0xffb622, 0x5cffa0][n] : 0x091014).multiplyScalar(active ? 5 : 0.5)
        bulb.current!.setColorAt(i * 3 + n, signalColor)
        halos.geometry.getAttribute('signalColor').setXYZ(i * 3 + n, active ? signalColor.r : 0, active ? signalColor.g : 0, active ? signalColor.b : 0)
      }
    })
    halos.geometry.getAttribute('signalColor').needsUpdate = true
    bulb.current.instanceMatrix.needsUpdate = true
    if (bulb.current.instanceColor) bulb.current.instanceColor.needsUpdate = true
  })
  return <group>{heads.map((h, i) => <group key={i} position={[h.x, 0, h.z]} rotation={[0, h.angle, 0]}>
    <mesh position={[0.6, 3.4, 0.2]}><cylinderGeometry args={[0.1, 0.14, 6.8, 8]} /><meshStandardMaterial color="#7d8386" /></mesh>
    <mesh position={[0, 6.35, 0.2]}><boxGeometry args={[0.55, 1.65, 0.35]} /><meshStandardMaterial color="#12181b" /></mesh>
  </group>)}<points geometry={halos.geometry} material={halos.material} frustumCulled={false} /><instancedMesh ref={bulb} args={[undefined, undefined, heads.length * 3]} frustumCulled={false}><sphereGeometry args={[0.5, 8, 6]} /><meshBasicMaterial toneMapped={false} /></instancedMesh></group>
}
