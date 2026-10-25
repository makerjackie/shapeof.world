import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network } from '../sim/types'
import { terrainHeight } from '../sim/terrain'
import { mergeGeometry, strip } from './mesh-kit'
import { litMaterial } from './NightWorld'
import { contextLayout } from './context-layout'

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
