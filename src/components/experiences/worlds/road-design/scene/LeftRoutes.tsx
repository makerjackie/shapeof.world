import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Network } from '../sim/types'
import { screenLines } from './Blueprint'

/** Dim route ink connects gaps between the actual amber vehicle exposures.
 * It uses driven lanes, never a second illustrative or synthetic traffic path. */
export function LeftRoutes({ network }: { network: Network }) {
  const assets=useMemo(()=>{
    const ids=new Set(network.movements.filter(m=>m.turn==='left').flatMap(m=>m.lanes))
    const lanes=network.lanes.filter(l=>ids.has(l.id)&&l.kind!=='main'&&!l.entry&&!l.exit)
    return screenLines(lanes.flatMap(l=>l.points.slice(1).map((p,i)=>({a:l.points[i],b:p,color:'#ffb347'}))),1.6,.24)
  },[network])
  useFrame(({size})=>assets.material.uniforms.resolution.value.set(size.width,size.height))
  useEffect(()=>()=>{assets.geometry.dispose();assets.material.dispose()},[assets])
  return <mesh geometry={assets.geometry} material={assets.material} frustumCulled={false}/>
}
