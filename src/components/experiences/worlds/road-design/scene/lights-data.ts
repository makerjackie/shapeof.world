import type {Network,Vec3} from '../sim/types'
import {terrainHeight} from '../sim/terrain'
import {samplePath} from './mesh-kit'
import {contextLayout} from './context-layout'

export interface Lamp { position: Vec3; height: number; urban: boolean; rotation: number; radius?: number }

export function buildLamps(network: Network): Lamp[] {
  const urban = network.carriageways.every(road => road.kind === 'urban')
  const lamps: Lamp[] = []
  if (!urban) for (const x of [-98, 98]) for (const z of [-98, 98]) lamps.push({ position: { x, y: terrainHeight(network,x,z), z }, height: 30, urban: false, rotation: 0 })
  for (const road of network.carriageways) {
    if (road.kind !== 'ramp' && road.oneWay && Math.hypot(road.points.at(-1)!.x-road.points[0].x,road.points.at(-1)!.z-road.points[0].z)<200) continue
    const cityRoad=road.kind==='urban'
    const offset = (road.laneCount * road.laneWidth + (road.medianWidth ?? 0)) / 2 + (road.shoulder ?? 0) + 1.4
    for (const { position: p, tangent: t } of samplePath(road.points, cityRoad ? 36 : road.kind === 'ramp' && network.id !== 'huangjuewan' ? 95 : 110)) {
      if (cityRoad && urban && Math.hypot(p.x, p.z) < 28) continue
      for (const side of cityRoad && !road.oneWay ? [-1, 1] : [1]) {
        lamps.push({ position: { x: p.x - t.z * offset * side, y: p.y, z: p.z + t.x * offset * side }, height: cityRoad ? 9 : 28, urban:cityRoad, rotation: Math.atan2(t.x, t.z) + (side < 0 ? Math.PI : 0) })
      }
    }
  }
  if(network.urbanJunctions?.length) {
    for(const node of network.urbanJunctions) {
      const x=(node.arms.find(arm=>arm.direction==='north'||arm.direction==='south')?.halfWidth??3.5)+3.35
      const z=(node.arms.find(arm=>arm.direction==='east'||arm.direction==='west')?.halfWidth??3.5)+3.35
      for(const sx of[-1,1])for(const sz of[-1,1]) lamps.push({position:{x:node.position.x+sx*(x+12),y:node.position.y,z:node.position.z+sz*z},height:Math.max(x,z)>13?12:9,urban:true,rotation:sz<0?-Math.PI/2:Math.PI/2,radius:Math.max(28,Math.hypot(x+12,z)*1.55)})
    }
  } else if(urban) {
    const horizontal=network.carriageways.find(road=>Math.abs(road.points[0].x)>Math.abs(road.points[0].z))
    const vertical=network.carriageways.find(road=>Math.abs(road.points[0].z)>Math.abs(road.points[0].x))
    const x=(vertical?vertical.laneCount*vertical.laneWidth/2:3.5)+3.8
    const z=(horizontal?horizontal.laneCount*horizontal.laneWidth/2:3.5)+3.8
    for(const sx of[-1,1])for(const sz of[-1,1]) lamps.push({position:{x:sx*(x+12),y:0.1,z:sz*z},height:9,urban:true,rotation:sz<0?-Math.PI/2:Math.PI/2,radius:28})
  }
  lamps.push(...contextLayout(network).lamps)
  return lamps
}

/** A single top-down irradiance atlas replaces hundreds of shadowed point lights. */
export function paintLightingAtlas(canvas:HTMLCanvasElement|OffscreenCanvas, lamps:Lamp[]) {
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  context.fillStyle = '#000'; context.fillRect(0, 0, 2048, 2048)
  context.globalCompositeOperation = 'lighter'
  const extent = 1800, scale = canvas.width / (extent * 2)
  for (const { position: p, urban, rotation, radius } of lamps) {
    // Urban luminaires project into the road, while mast lights cover a 52 m radius.
    const cx = p.x + (urban ? Math.cos(rotation) * 4.5 : 0), cz = p.z - (urban ? Math.sin(rotation) * 4.5 : 0)
    const x = (cx + extent) * scale, z = (cz + extent) * scale, r = (radius ?? (urban ? 26 : 52)) * scale
    const gradient = context.createRadialGradient(x, z, 0, x, z, r)
    gradient.addColorStop(0, urban ? 'rgba(255,206,144,1)' : 'rgba(255,237,201,1)')
    gradient.addColorStop(0.21, urban ? 'rgba(255,198,130,0.85)' : 'rgba(255,228,182,0.85)')
    gradient.addColorStop(0.48, 'rgba(255,218,166,0.46)')
    gradient.addColorStop(0.76, 'rgba(245,208,163,0.10)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient; context.fillRect(x - r, z - r, r * 2, r * 2)
  }
}

export async function makeLightingBitmap(lamps:Lamp[]) {
  if(typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')return null
  const canvas=new OffscreenCanvas(2048,2048);paintLightingAtlas(canvas,lamps)
  return createImageBitmap(canvas,{imageOrientation:'flipY',premultiplyAlpha:'none'})
}
