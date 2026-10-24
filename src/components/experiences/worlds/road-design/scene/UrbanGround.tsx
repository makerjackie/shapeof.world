import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network, Vec3 } from '../sim/types'
import { fillInstances, mergeGeometry, planarPolygon, samplePath, strip, wall, type Instance } from './mesh-kit'
import { litMaterial } from './NightWorld'
import { arc, bezier, line, offsetPath, point as roadPoint } from '../designs/kit'
import { ROUNDABOUT_ISLAND_RADIUS, ROUNDABOUT_OUTER_RADIUS, ROUNDABOUT_SPLITTER } from '../designs/roundabout'

const KERB_HEIGHT = 0.15
const SIDEWALK_WIDTH = 5
const CORNER_RADIUS = 12

/** The street edge, rather than a square overlay, defines both paving and kerbs. */
export function UrbanGround({ network, atlas }: { network: Network; atlas: T.Texture }) {
  // A service interchange sits in open roadside land. Its sidewalks belong to
  // the junction, but an arbitrary square of city-block paving does not.
  const service = network.carriageways.some(road => road.kind === 'main')
  const nodes = useMemo(() => network.urbanJunctions?.map(node => {
    const vectors = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] } as const
    const edge = node.layout === 'roundabout' ? 32 : Math.max(20, ...node.arms.map(arm => arm.halfWidth + (node.cornerRadius ?? 12)))
    const carriageways = node.arms.map(arm => {
      const [dx, dz] = vectors[arm.direction]
      return { id: `${node.id}-${arm.direction}`, points: line(roadPoint(dx * edge, dz * edge, 0), roadPoint(dx * (arm.reach ?? 330), dz * (arm.reach ?? 330), 0)), laneCount: 2, laneWidth: arm.halfWidth - 0.45, shoulder: 0.45, speedLimit: 14, level: 0, bridge: false, kind: 'urban' as const }
    })
    return { node, network: { ...network, carriageways } }
  }), [network])
  if (nodes?.length) return <>{nodes.map(({ node, network: localNetwork }) => <group key={node.id} position={[node.position.x, node.position.y, node.position.z]}><JunctionGround network={localNetwork} atlas={atlas} radius={node.cornerRadius} roundabout={node.layout === 'roundabout'} islandRadius={node.islandRadius} frontagePaving={!service} /></group>)}</>
  return <JunctionGround network={network} atlas={atlas} />
}

function JunctionGround({ network, atlas, radius = CORNER_RADIUS, roundabout = false, islandRadius = ROUNDABOUT_ISLAND_RADIUS, frontagePaving = true }: { network: Network; atlas: T.Texture; radius?: number; roundabout?: boolean; islandRadius?: number; frontagePaving?: boolean }) {
  const assets = useMemo(() => {
    const asphalt: T.BufferGeometry[] = [], blocks: T.BufferGeometry[] = [], paving: T.BufferGeometry[] = [], kerbs: T.BufferGeometry[] = [], pitRims: T.BufferGeometry[] = []
    const trunks: Instance[] = [], crowns: Instance[] = [], pits: Instance[] = []
    const arms = new Map<string, { half: number; reach: number; height: number }>()
    for (const road of network.carriageways) {
      if (road.kind !== 'urban' || road.oneWay) continue
      const far = road.points.at(-1)!, near = road.points[0]
      const arm = Math.abs(far.x) > Math.abs(far.z) ? far.x > 0 ? 'east' : 'west' : far.z > 0 ? 'south' : 'north'
      arms.set(arm, { half: road.laneCount * road.laneWidth / 2 + (road.shoulder ?? 0), reach: Math.hypot(far.x, far.z), height: near.y })
      const half = road.laneCount * road.laneWidth / 2 + (road.shoulder ?? 0)
      for (const { position: p, tangent: t } of samplePath(road.points, 12)) {
        if (Math.hypot(p.x, p.z) < 30) continue
        for (const side of [-1, 1]) {
          const x = p.x - t.z * side * (half + 2.8), z = p.z + t.x * side * (half + 2.8)
          const variation = Math.sin(x * 13.13 + z * 17.71) * 0.5 + 0.5, height = 5.7 + variation * 1.5
          pits.push({ position: [x, p.y + KERB_HEIGHT + 0.004, z], scale: [1.8, 0.03, 1.8] })
          const ring = [{ x: x - 1, y: p.y + KERB_HEIGHT + 0.03, z: z - 1 }, { x: x + 1, y: p.y + KERB_HEIGHT + 0.03, z: z - 1 }, { x: x + 1, y: p.y + KERB_HEIGHT + 0.03, z: z + 1 }, { x: x - 1, y: p.y + KERB_HEIGHT + 0.03, z: z + 1 }, { x: x - 1, y: p.y + KERB_HEIGHT + 0.03, z: z - 1 }]
          pitRims.push(strip(ring, 0.12))
          trunks.push({ position: [x, p.y + height * 0.28, z], scale: [0.23, height * 0.56, 0.23] })
          for (let cluster = 0; cluster < 3; cluster++) {
            const a = cluster * 2.399 + variation * Math.PI, r = cluster === 0 ? 0 : 1.15
            crowns.push({ position: [x + Math.cos(a) * r, p.y + height * (cluster === 0 ? 0.8 : 0.65), z + Math.sin(a) * r], scale: [2.5 + Math.sin(a)*.7 + variation*.4, 2.4 + Math.cos(a)*.6, 2.6 + Math.sin(a+1.3)*.6], color: cluster % 2 ? '#0d170f' : '#101a12' })
          }
        }
      }
    }
    const groundY = [...arms.values()][0]?.height ?? 0.12
    const fallbackH = arms.get('east')?.half ?? arms.get('west')?.half ?? 3.95
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const horizontal = arms.get(sx > 0 ? 'east' : 'west'), vertical = arms.get(sz > 0 ? 'south' : 'north')
      if (!horizontal) continue
      const hx = vertical?.half ?? 3.95, hz = horizontal.half ?? fallbackH
      const cx = hx + radius, cz = hz + radius
      const extent = Math.max(20, cx, cz), roadY = groundY + 0.026
      const point = (x: number, z: number, y = roadY): Vec3 => ({ x: x * sx, y, z: z * sz })
      const edge: Vec3[] = vertical ? [point(horizontal.reach, hz), point(cx, hz)] : [point(horizontal.reach, hz), point(0, hz)]
      const polygon: Vec3[] = [point(0, 0), point(extent, 0), point(extent, hz)]
      if (vertical) {
        for (let i = 0; i <= 20; i++) {
          const angle = -Math.PI / 2 - i * Math.PI / 40
          const p = point(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius)
          edge.push(p); polygon.push(p)
        }
        edge.push(point(hx, vertical.reach)); polygon.push(point(hx, extent), point(0, extent))
      } else polygon.push(point(0, hz))
      if (roundabout) {
        // The outside kerb follows the circulatory carriageway between four
        // flared entries. It never cuts across the central island.
        const outer = ROUNDABOUT_OUTER_RADIUS, angle = Math.PI * 0.15
        const first = point(outer * Math.cos(angle), outer * Math.sin(angle))
        const last = point(outer * Math.sin(angle), outer * Math.cos(angle))
        const entry = bezier(point(32, hz), point(26, hz), point(22, 7), first, 16)
        const around = arc({ x: 0, y: roadY, z: 0 }, outer, angle, Math.PI / 2 - angle * 2, 24).map(p => ({ x: p.x * sx, y: p.y, z: p.z * sz }))
        const exit = bezier(last, point(7, 22), point(hx, 26), point(hx, 32), 16)
        edge.splice(0, edge.length, point(horizontal.reach, hz), ...entry, ...around.slice(1), ...exit.slice(1), point(hx, vertical?.reach ?? horizontal.reach))
        asphalt.push(planarPolygon([point(0, 0), point(32, 0), ...entry, ...around.slice(1), ...exit.slice(1), point(0, 32)]))
      } else asphalt.push(planarPolygon(polygon))
      // Service courts and frontage paving fill the land behind the sidewalk;
      // this contour follows its outside edge and never overlays a traffic lane.
      const blockX = Math.min(410, horizontal.reach), blockZ = Math.min(410, vertical?.reach ?? horizontal.reach)
      const blockEdge: Vec3[] = [point(blockX, hz + SIDEWALK_WIDTH, 0.025)]
      if (vertical) {
        for (let i = 0; i <= 20; i++) {
          const angle = -Math.PI / 2 - i * Math.PI / 40
          blockEdge.push(point(cx + Math.cos(angle) * (radius - SIDEWALK_WIDTH), cz + Math.sin(angle) * (radius - SIDEWALK_WIDTH), 0.025))
        }
        blockEdge.push(point(hx + SIDEWALK_WIDTH, blockZ, 0.025))
      } else blockEdge.push(point(0, hz + SIDEWALK_WIDTH, 0.025), point(0, blockZ, 0.025))
      blockEdge.push(point(blockX, blockZ, 0.025))
      if (frontagePaving) {
        if (!roundabout) blocks.push(planarPolygon(blockEdge))
        else blocks.push(planarPolygon([...offsetPath(edge, -sx * sz * SIDEWALK_WIDTH).map(p => ({ ...p, y: 0.025 })), point(blockX, blockZ, 0.025)]))
      }
      // Mirroring reverses the strip normal; outside is always toward its block.
      const outside = -sx * sz
      paving.push(strip(edge, SIDEWALK_WIDTH, outside * SIDEWALK_WIDTH / 2, KERB_HEIGHT))
      kerbs.push(wall(edge, 0, 0, KERB_HEIGHT), strip(edge, 0.24, 0, KERB_HEIGHT + 0.008))
      kerbs.push(wall(edge, outside * SIDEWALK_WIDTH, -0.30, KERB_HEIGHT))
    }
    const blockMaterial = litMaterial(atlas, '#414247', 0.85)
    blockMaterial.emissive.set('#22252b'); blockMaterial.emissiveIntensity = 0.30
    const blockCompile = blockMaterial.onBeforeCompile
    blockMaterial.onBeforeCompile = (shader, renderer) => {
      blockCompile(shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        vec2 courtCoord=roadWorld.xz/vec2(1.5,0.9);
        vec2 courtEdge=min(fract(courtCoord),1.0-fract(courtCoord));
        vec2 courtAA=max(fwidth(courtCoord),vec2(0.001));
        float courtJoints=min(smoothstep(0.012-courtAA.x,0.012+courtAA.x,courtEdge.x),smoothstep(0.014-courtAA.y,0.014+courtAA.y,courtEdge.y));
        float courtGrain=fract(sin(dot(floor(courtCoord),vec2(12.9898,78.233)))*43758.5453);
        float serviceDrive=smoothstep(5.5,6.0,abs(mod(abs(roadWorld.x)+0.5,48.0)-24.0));
        outgoingLight*=mix(0.66,0.94+courtGrain*0.12,courtJoints)*mix(0.78,1.0,serviceDrive);
        #include <opaque_fragment>`)
    }
    blockMaterial.customProgramCacheKey = () => 'urban-frontage-paving-v1'
    const pavingMaterial = litMaterial(atlas, '#52504c', 1.2)
    const originalCompile = pavingMaterial.onBeforeCompile
    pavingMaterial.onBeforeCompile = (shader, renderer) => {
      originalCompile(shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        vec2 tileCoord=roadWorld.xz/vec2(0.75,0.45);
        tileCoord.x+=mod(floor(tileCoord.y),2.0)*0.5;
        vec2 tileEdge=min(fract(tileCoord),1.0-fract(tileCoord));
        vec2 tileAA=max(fwidth(tileCoord),vec2(0.0001));
        float mortar=min(smoothstep(0.014-tileAA.x,0.014+tileAA.x,tileEdge.x),smoothstep(0.022-tileAA.y,0.022+tileAA.y,tileEdge.y));
        float tileTone=0.92+0.1*fract(sin(dot(floor(tileCoord),vec2(12.9898,78.233)))*43758.5453);
        outgoingLight*=mix(0.55,tileTone,mortar);
        #include <opaque_fragment>`)
    }
    pavingMaterial.customProgramCacheKey = () => 'urban-paving-5m-v1'
    return { asphalt: mergeGeometry(asphalt), blocks: mergeGeometry(blocks), blockMaterial, paving: mergeGeometry(paving), kerbs: mergeGeometry(kerbs), pitRims: mergeGeometry(pitRims), trunks, crowns, pits, asphaltMaterial: litMaterial(atlas, '#1d1f23', 1.3), pavingMaterial, kerbMaterial: litMaterial(atlas, '#777571', 1.7), leafMaterial: litMaterial(atlas, '#ffffff', 1.7), trunkMaterial: litMaterial(atlas, '#392d20', 0.8) }
  }, [network, atlas, radius, roundabout, islandRadius, frontagePaving])
  useEffect(() => () => {
    assets.asphalt.dispose(); assets.blocks.dispose(); assets.blockMaterial.dispose(); assets.paving.dispose(); assets.kerbs.dispose(); assets.pitRims.dispose()
    assets.asphaltMaterial.dispose(); assets.pavingMaterial.dispose(); assets.kerbMaterial.dispose(); assets.leafMaterial.dispose(); assets.trunkMaterial.dispose()
  }, [assets])
  return <>
    <mesh geometry={assets.asphalt} material={assets.asphaltMaterial} />
    {roundabout && <RoundaboutIslands atlas={atlas} radius={islandRadius} />}
    {frontagePaving && <mesh geometry={assets.blocks} material={assets.blockMaterial} />}
    <mesh geometry={assets.paving} material={assets.pavingMaterial} />
    <mesh geometry={assets.kerbs} material={assets.kerbMaterial} />
    <mesh geometry={assets.pitRims} material={assets.kerbMaterial} />
    <instancedMesh args={[undefined, undefined, assets.pits.length]} ref={m => { if (m) fillInstances(m, assets.pits) }}><boxGeometry /><meshStandardMaterial color="#11160e" roughness={1} /></instancedMesh>
    <instancedMesh args={[undefined, assets.trunkMaterial, assets.trunks.length]} ref={m => { if (m) fillInstances(m, assets.trunks) }}><cylinderGeometry args={[0.5, 0.65, 1, 6]} /></instancedMesh>
    <instancedMesh args={[undefined, assets.leafMaterial, assets.crowns.length]} ref={m => { if (m) fillInstances(m, assets.crowns) }}><icosahedronGeometry args={[0.5, 1]} /></instancedMesh>
  </>
}

function RoundaboutIslands({ atlas, radius }: { atlas: T.Texture; radius: number }) {
  const assets = useMemo(() => {
    const edges: T.BufferGeometry[] = [], surfaces: T.BufferGeometry[] = [], apron: T.BufferGeometry[] = []
    const circle = arc(roadPoint(0, 0, 0.026), radius - 2.2, 0, Math.PI * 2, 160)
    edges.push(wall(circle, 0, 0, 0.15), strip(circle, 0.2, 0, 0.15))
    // The mountable truck apron is mountable; the raised island stays clear of the
    // swept vehicle envelope. A thin planted mound is visible from low views.
    const apronWidth = 16 - radius + 2.2
    apron.push(strip(circle, apronWidth, -apronWidth / 2, 0.025))
    for (let arm = 0; arm < 4; arm++) {
      const angle = arm * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle)
      const points = ROUNDABOUT_SPLITTER.map(p => ({ x: p.x * c - p.z * s, y: 0.176, z: p.x * s + p.z * c }))
      surfaces.push(planarPolygon(points)); edges.push(wall([...points, points[0]], 0, -0.15, 0), strip([...points, points[0]], 0.15))
    }
    return { edges: mergeGeometry(edges), surfaces: mergeGeometry(surfaces), apron: mergeGeometry(apron), cement: litMaterial(atlas, '#75716a', 1.3), grass: litMaterial(atlas, '#10170e', 0.65), foliage: litMaterial(atlas, '#152015', 1.9), apronMaterial: litMaterial(atlas, '#777064', 1.1) }
  }, [atlas, radius])
  useEffect(() => () => { assets.edges.dispose(); assets.surfaces.dispose(); assets.apron.dispose(); assets.cement.dispose(); assets.grass.dispose(); assets.foliage.dispose(); assets.apronMaterial.dispose() }, [assets])
  return <>
    <mesh geometry={assets.edges} material={assets.cement} />
    <mesh geometry={assets.surfaces} material={assets.cement} />
    <mesh geometry={assets.apron} material={assets.apronMaterial} />
    {[0,1,2,3,4,5,6,7,8].map(i=><mesh key={i} position={[Math.cos(i*2.4)*9,.65,Math.sin(i*2.4)*9]} scale={[2.3,1.1,1.7]} material={assets.foliage}><icosahedronGeometry args={[1,1]}/></mesh>)}
    <mesh position={[0,2.3,0]}><cylinderGeometry args={[.2,.34,4.5,8]}/><meshStandardMaterial color="#3d3021"/></mesh>
    {[[-1,4.6,0],[1.2,5.5,.4],[.1,6,-.7]].map((p,i)=><mesh key={i} position={p as [number,number,number]} scale={[3.1,2.7,2.8]} material={assets.foliage}><icosahedronGeometry args={[1,1]}/></mesh>)}
    <pointLight position={[4,5,1]} color="#e9c69a" intensity={16} distance={16} decay={2}/>
    <mesh position={[0, 0.21, 0]} material={assets.grass}><cylinderGeometry args={[radius - 2.32, radius - 2.32, 0.13, 96]} /></mesh>
  </>
}
