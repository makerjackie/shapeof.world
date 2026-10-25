import type {Carriageway,Network} from '../sim/types'
import type {Instance} from './mesh-kit'
import {isRiver,scenicGround} from './chongqing-context'
type Triple = [number,number,number]
interface OcclusionVolume { center: Triple; size: Triple }
export interface Building extends Instance { size: Triple; seed: number; kind: number; occlusion: OcclusionVolume }


export interface CityLayout { blocks:Building[]; beacons:number[] }
const layouts=new WeakMap<Network,CityLayout>()
export function cityLayout(urban:boolean,service:boolean,roads?:readonly Carriageway[],network?:Network):CityLayout {
  const cached=network&&layouts.get(network);if(cached)return cached
    const blocks: Building[] = [], beacons: number[] = []
    let seed = 12963
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
    const box = (x: number, z: number, width: number, depth: number, height: number, base: number, kind: number, tint: string, occlusion?: OcclusionVolume) => {
      blocks.push({ position: [x, base + height / 2 + scenicGround(network, x, z), z], scale: [width, height, depth], color: tint, size: [width, height, depth], seed: random() * 1000, kind, occlusion: occlusion ?? { center:[x,base+height/2,z], size:[width,height,depth] } })
    }
    const building = (x: number, z: number, width: number, depth: number, height: number, near: boolean) => {
      const glass = random() < 0.26
      const occlusion: OcclusionVolume = { center:[x,height/2+scenicGround(network,x,z),z], size:[width+5,height,depth+5] }
      if (near) {
        const podiumHeight = 4.1 + Math.floor(random() * 2) * 3.3
        box(x, z, width + 5, depth + 5, podiumHeight, 0, 1, '#20211f', occlusion)
        box(x, z, width, depth, height - podiumHeight, podiumHeight, glass ? 2 : 0, glass ? '#11191c' : random() < 0.5 ? '#20211f' : '#24211d', occlusion)
        box(x-width*0.13,z+depth*0.12,width*0.24,depth*0.21,2,height,3,'#48505a',occlusion)
        if(width>20)box(x+width*0.25,z-depth*0.2,3.5,3.5,1.3,height,3,'#51545a',occlusion)
      } else {
        const crown = height > 65 ? height * (0.08 + random() * 0.12) : 0
        box(x, z, width, depth, height - crown, 0, glass ? 2 : 0, glass ? '#10141a' : '#141719')
        if (crown) box(x + width * 0.06, z, width * 0.65, depth * 0.75, crown, height - crown, 0, '#11151a')
      }
      if (height > 100) beacons.push(x, height + scenicGround(network,x,z) + 1.3, z, random() * 6)
    }
    if (urban) {
      // The nearest frontage is > 12 m behind a 7.5 m half-width road curb.
      // Blocks are irregular but street-aligned; podiums give the street a human scale.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 4; iz++) {
          const near = ix === 0 && iz === 0
          const width = 18 + random() * 10, depth = 18 + random() * 10
          const x = sx * (48 + ix * 48 + (random() - 0.5) * 5), z = sz * (48 + iz * 49 + (random() - 0.5) * 5)
          const floors = near ? 4 + Math.floor(random() * 8) : 7 + Math.floor(random() ** 1.8 * 24)
          if (network?.id === 'continuous-flow' && Math.abs(x) < 85 && Math.abs(z) < 210) continue
          building(x, z, width, depth, floors * 3.3, true)
        }
      }
    }
    if (service || !urban) {
      // Small suburban blocks give the two ramp terminals a city-edge setting.
      // Keep the entire podium footprint outside every carriageway reservation.
      const clearsRoads = (x: number, z: number, width: number, depth: number) => {
        const clearance = Math.hypot(width + 5, depth + 5) / 2 + 8
        return (roads ?? []).every(road => {
          const roadHalf = road.laneCount * road.laneWidth / 2 + (road.shoulder ?? 0)
          for (let i = 1; i < road.points.length; i++) {
            const a = road.points[i - 1], b = road.points[i]
            const dx = b.x - a.x, dz = b.z - a.z
            const t = Math.max(0, Math.min(1, ((x-a.x)*dx+(z-a.z)*dz) / Math.max(0.001,dx*dx+dz*dz)))
            if (Math.hypot(x-a.x-t*dx,z-a.z-t*dz) < clearance + roadHalf) return false
          }
          return true
        })
      }
      // Connected street-front blocks share the local 200 m grid. Closely spaced
      // low-rise wings replace isolated luminous podium boxes in the meadow.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (const blockX of [310, 510]) for (const blockZ of [310, 510]) {
          if (random() < .20) continue
          for (let wing = 0; wing < 5; wing++) {
            const x=sx*(blockX+(wing-2)*30), z=sz*(blockZ+(wing%2)*34)
            const width=26+random()*4, depth=24+random()*6
            if (!clearsRoads(x,z,width,depth)) continue
            building(x,z,width,depth,(network?.id==='huangjuewan'?12+Math.floor(random()*18):3+Math.floor(random()*4))*3.3,network?.id==='huangjuewan')
          }
        }
      }
    }
    // Dense city blocks sit between 0.7 and 3 km, leaving long axial street corridors.
    for (let x = -2880; x <= 2880; x += 120) for (let z = -2880; z <= 2880; z += 120) {
      const radius = Math.hypot(x, z)
      const clusterDensity = 0.18 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(x * 0.004 + Math.cos(z * 0.004) * 2.0), 2)
      if (radius < 720 || radius > 3000 || Math.abs(x) < 100 || Math.abs(z) < 100 || random() > clusterDensity) continue
      const px = x + (random() - 0.5) * 38, pz = z + (random() - 0.5) * 38
      if (network?.id === 'huangjuewan' && isRiver(px,pz)) continue
      const cluster = 0.5 + 0.5 * Math.sin(x * 0.0014 + z * 0.0019)
      const height = 14 + random() ** 2.2 * (60 + cluster * 145)
      building(px, pz, 19 + random() * 35, 17 + random() * 31, height, false)
    }

  const layout={blocks,beacons};if(network)layouts.set(network,layout);return layout
}
export function primeCityLayout(network:Network,layout:CityLayout){layouts.set(network,layout)}
