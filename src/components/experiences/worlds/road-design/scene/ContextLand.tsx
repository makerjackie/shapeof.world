import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network, Vec3 } from '../sim/types'
import { terrainHeight } from '../sim/terrain'
import { mergeGeometry, strip } from './mesh-kit'
import { litMaterial, type Lamp } from './NightWorld'

interface ContextLayout { streets: Vec3[][]; parking: Vec3[][]; lamps: Lamp[] }
const layouts = new WeakMap<Network, ContextLayout>()
/** Quiet local streets, outside the simulated roads' reservations. */
export function contextLayout(network: Network): ContextLayout {
  const cached = layouts.get(network)
  if (cached) return cached
  const result: ContextLayout = { streets: [], parking: [], lamps: [] }
  if (network.carriageways.every(road => road.kind === 'urban')) return result
  const clear = (x: number, z: number, margin: number) => network.carriageways.every(road => {
    const width = road.laneCount * road.laneWidth / 2 + (road.shoulder ?? 0) + margin
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z
      const t = Math.max(0, Math.min(1, ((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz || 1)))
      if (Math.hypot(x-a.x-t*dx,z-a.z-t*dz) < width) return false
    }
    return true
  })
  const ground = (x: number, z: number): Vec3 => ({ x, y: terrainHeight(network,x,z) + 0.02, z })
  for (const axis of [0, 1]) for (const fixed of [-1050,-850,-650,-450,-250,250,450,650,850,1050]) for (let start = -1100; start < 1100; start += 36) {
    const points = [0, .5, 1].map(t => axis ? ground(fixed, start+t*36) : ground(start+t*36,fixed))
    if (points.some(p => !clear(p.x,p.z,24))) continue
    result.streets.push(points)
    const center = points[1]
    result.lamps.push({ position: ground(center.x + (axis ? 4 : 0), center.z + (axis ? 0 : 4)), height: 8, urban: true, rotation: axis ? Math.PI : -Math.PI/2, radius: 27 })
  }
  for (const x of [-560,-350,350,560]) for (const z of [-580,-340,340,580]) {
    if (!clear(x,z,48)) continue
    result.parking.push([ground(x-28,z),ground(x+28,z)])
    result.lamps.push({ position: ground(x,z), height: 10, urban: true, rotation: 0, radius: 35 })
  }
  layouts.set(network,result)
  return result
}

export function ContextLand({ network, atlas }: { network: Network; atlas: T.Texture }) {
  const assets = useMemo(() => {
    const layout = contextLayout(network), surfaces: T.BufferGeometry[] = [], marks: T.BufferGeometry[] = []
    for (const points of layout.streets) {
      surfaces.push(strip(points,6))
      for (const side of [-1,1]) marks.push(strip(points,.13,side*3.1,.03))
    }
    for (const points of layout.parking) {
      surfaces.push(strip(points,32))
      for (let i=1;i<18;i++) for(const side of [-1,1]) {
        const x=points[0].x+i*3.1,z=points[0].z
        marks.push(strip([{x,y:terrainHeight(network,x,z+side*4)+.05,z:z+side*4},{x,y:terrainHeight(network,x,z+side*13)+.05,z:z+side*13}],.13))
      }
    }
    const asphalt=litMaterial(atlas,'#262723',.65), paint=litMaterial(atlas,'#585747',.7)
    asphalt.emissive.set('#0b0d0c');asphalt.emissiveIntensity=.5
    return { surfaces:mergeGeometry(surfaces),marks:mergeGeometry(marks),asphalt,paint }
  },[network,atlas])
  useEffect(()=>()=>{assets.surfaces.dispose();assets.marks.dispose();assets.asphalt.dispose();assets.paint.dispose()},[assets])
  return <><mesh geometry={assets.surfaces} material={assets.asphalt}/><mesh geometry={assets.marks} material={assets.paint}/></>
}
