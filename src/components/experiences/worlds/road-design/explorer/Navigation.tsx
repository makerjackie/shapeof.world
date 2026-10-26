import { useEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { Network, Vec3 } from '../sim/types'
import { sampleLane } from '../sim/geometry'
import { approachName, exitName, type ExploreRoute } from './routes'

function GroundWord({text,position,tangent,large}:{text:string;position:Vec3;tangent:Vec3;large:boolean}){
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96
  const context=canvas.getContext('2d')!;context.font='500 38px sans-serif';context.textAlign='center';context.textBaseline='middle'
  context.fillStyle='#b1d9e1';context.fillText(text,256,48,490)
  return new T.CanvasTexture(canvas)
 },[text])
 useEffect(()=>()=>texture.dispose(),[texture])
 return <mesh position={[position.x,position.y+.45,position.z]} rotation={[-Math.PI/2,0,-Math.atan2(tangent.x,tangent.z)]}>
  <planeGeometry args={[large?100:35,large?19:7]}/><meshBasicMaterial map={texture} transparent opacity={.8} depthWrite={false} toneMapped={false}/>
 </mesh>
}

/** Labels painted near the junction, rather than at kilometre-long model edges. */
export function GroundNames({network,routes,route}:{network:Network;routes:ExploreRoute[];route?:ExploreRoute}){
 const tx=useExperienceI18n()
 const labels=useMemo(()=>{
  const seen=new Set<string>()
  return routes.flatMap(route=>{
   const last=network.lanes.find(l=>l.id===route.laneIds.at(-1))!
   const out=sampleLane(last,Math.min(last.length*.35,network.id==='huangjuewan'?35:90))
   return [{key:`in:${route.movement.from}`,name:approachName(route.movement.from),position:route.entry,tangent:route.entryTangent},
    {key:`out:${route.movement.to}`,name:exitName(route.movement.to),...out}].filter(label=>{if(seen.has(label.key))return false;seen.add(label.key);return true})
  })
 },[network,routes])
 const large=network.carriageways.some(r=>r.kind!=='urban')
 return <>{labels.map(label=><group key={label.key}>
  <GroundWord text={tx(label.name)} position={label.position} tangent={label.tangent} large={large}/>
  {(route?[`in:${route.movement.from}`,`out:${route.movement.to}`].includes(label.key):label.key.startsWith('out:'))&&<Html center position={[label.position.x-label.tangent.z*(large?25:9),label.position.y+2,label.position.z+label.tangent.x*(large?25:9)]} zIndexRange={[4,1]} style={{pointerEvents:'none'}}><span className="rd-portal-name">{tx(label.name)}</span></Html>}
 </group>)}</>
}

/** Camera-relative compass and clamped endpoint markers remain readable during
 * auto-framing, close-ups and follow mode. DOM positions update without React. */
export function Navigation({route}:{route?:ExploreRoute}){
 const tx=useExperienceI18n(),needle=useRef<SVGSVGElement>(null),entry=useRef<HTMLSpanElement>(null),exit=useRef<HTMLSpanElement>(null)
 const {size,gl}=useThree(),panel=useRef<HTMLElement|null>(null)
 const scratch=useMemo(()=>({p:new T.Vector3(),north:new T.Vector3(),inverse:new T.Quaternion()}),[])
 useFrame(({camera,size})=>{
  scratch.inverse.copy(camera.quaternion).invert();scratch.north.set(0,0,-1).applyQuaternion(scratch.inverse)
  if(needle.current)needle.current.style.transform=`rotate(${Math.atan2(scratch.north.x,-scratch.north.y)}rad)`
  if(!route)return
  if(!panel.current?.isConnected)panel.current=gl.domElement.closest('.road-design-experience')?.querySelector('.rd-explorer')??null
  const panelRect=panel.current?.getBoundingClientRect(),canvasRect=gl.domElement.getBoundingClientRect()
  const mobile=size.width<720,left=mobile?14:24,right=mobile?size.width-14:(panelRect?panelRect.left-canvasRect.left-12:size.width-380)
  const top=mobile?180:265,bottom=mobile&&panelRect?panelRect.top-canvasRect.top-55:size.height-170
  const points=[route.path.points[0],route.path.points.at(-1)!],positions:{x:number;y:number}[]=[]
  for(let i=0;i<2;i++){
   const element=(i?exit:entry).current;if(!element)continue
   const p=points[i];scratch.p.set(p.x,p.y+4,p.z).project(camera)
   let x=(scratch.p.x+1)*size.width/2,y=(1-scratch.p.y)*size.height/2
   if(scratch.p.z>1){x=size.width-x;y=size.height-y}
   const half=Math.min(element.offsetWidth/2,(right-left)/2),cx=Math.max(left+half,Math.min(right-half,x))
   let cy=Math.max(top,Math.min(Math.max(top,bottom),y))
   if(i&&positions[0]&&Math.abs(cx-positions[0].x)<half*2&&Math.abs(cy-positions[0].y)<38)cy=cy>top+45?cy-43:cy+43
   const clamped=Math.abs(x-cx)>2||Math.abs(y-cy)>2
   element.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`
   element.dataset.edge=String(clamped)
   element.style.setProperty('--bearing',`${Math.atan2(y-cy,x-cx)}rad`)
   positions.push({x:cx,y:cy})
  }
 })
 return <Html calculatePosition={()=>[0,0]} zIndexRange={[8,7]} style={{pointerEvents:'none',width:size.width,height:size.height}}>
  <div className="rd-navigation" aria-label={tx('方向与路线端点')}>
   <div className="rd-compass" aria-label={tx('指北针')}><svg ref={needle} viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" opacity=".15"/><path d="M22 4 16 28 22 24 28 28Z" fill="currentColor" fillOpacity=".2" stroke="currentColor"/><path d="M22 24V39" stroke="currentColor" opacity=".35"/></svg><span>N · {tx('北')}</span></div>
   {route&&<><span ref={entry} className="rd-endpoint rd-endpoint-in" data-endpoint="entry"><i/>{tx('入口')} · {tx(approachName(route.movement.from))}</span><span ref={exit} className="rd-endpoint rd-endpoint-out" data-endpoint="exit"><i/>{tx('出口')} · {tx(exitName(route.movement.to))}</span></>}
  </div>
 </Html>
}
