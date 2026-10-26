import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { sampleLane } from '../sim/geometry'
import { approachName, exitName, TURN_NAMES, TURN_SYMBOLS, turnKey, type ExploreRoute } from './routes'
import { replayAt, type DemoReplay, type DemoState } from './replay'
import type { WhyPin } from './explanations'

export const INITIAL_DEMO:DemoState={at:0,time:0,position:{x:0,y:0,z:0},tangent:{x:0,y:0,z:1},status:'loading',laneId:'',speed:0,progress:0}
export function EntryArrows({routes,selected,onSelect}:{routes:ExploreRoute[];selected?:string;onSelect:(id:string)=>void}) {
  const tx=useExperienceI18n()
  const groups=useMemo(()=>[...new Set(routes.map(r=>r.movement.from))].map(from=>({from,routes:routes.filter(r=>r.movement.from===from)})),[routes])
  return <>{groups.map(group=>{
    const {entry:p,entryTangent:t}=group.routes[0]
    return <group key={group.from}>
      {group.routes.slice(0,3).map((r,index)=>{
        const turn=turnKey(r.movement),side=turn==='left'?-1:turn==='right'?1:0
        const local=side?[[0,-7],[0,1],[side*5,1],[side*3,-1],[side*5,1],[side*3,3]]:[[0,-7],[0,6],[-2,3],[0,6],[2,3]]
        const points=local.map(([x,z])=>{const lateral=x+(index-1)*5;return new T.Vector3(p.x+t.x*z-t.z*lateral,p.y+.8,p.z+t.z*z+t.x*lateral)})
        return <Line key={r.movement.id} points={points} color="#80c7dc" lineWidth={2} onClick={e=>{e.stopPropagation();onSelect(r.movement.id)}}/>
      })}
      <Html position={[p.x,p.y+2,p.z]} center zIndexRange={[5,1]} style={{pointerEvents:'auto'}}>
        <div className="rd-entry"><span>{tx(approachName(group.from))}</span><div>{group.routes.map(r=>{
          const turn=turnKey(r.movement)
          return <button key={r.movement.id} type="button" aria-label={`${tx(approachName(group.from))} · ${tx(TURN_NAMES[turn])}${group.routes.length>3?` → ${tx(approachName(r.movement.to))}`:''}`} title={tx(exitName(r.movement.to))} aria-pressed={selected===r.movement.id} onClick={()=>onSelect(r.movement.id)}>{TURN_SYMBOLS[turn]}</button>
        })}</div></div>
      </Html>
    </group>
  })}</>
}

export function RouteScene({route,replay,revision,playing,demo,pins,activePin,onPin,explaining,traffic}:{route:ExploreRoute;replay:DemoReplay|null;revision:number;playing:boolean;demo:MutableRefObject<DemoState>;pins:WhyPin[];activePin:string|null;onPin:(id:string)=>void;explaining:boolean;traffic:boolean}) {
  const tx=useExperienceI18n(),car=useRef<T.Group>(null),arrows=useRef<T.InstancedMesh>(null),background=useRef<T.InstancedMesh>(null)
  const elapsed=useRef(0),{size}=useThree()
  const vectors=useMemo(()=>route.path.points.map(p=>new T.Vector3(p.x,p.y+.85,p.z)),[route])
  const arrowGeometry=useMemo(()=>{
    const g=new T.BufferGeometry()
    g.setAttribute('position',new T.Float32BufferAttribute([-1.7,0,-2.5,0,0,2.8,1.7,0,-2.5,0,0,-1.1,0,0,2.8,-1.7,0,-2.5],3));g.computeVertexNormals();return g
  },[])
  useEffect(()=>()=>arrowGeometry.dispose(),[arrowGeometry])
  useEffect(()=>{elapsed.current=0;demo.current={...INITIAL_DEMO,position:route.path.points[0]}},[route,replay,revision,demo])
  const scratch=useMemo(()=>new T.Object3D(),[])
  useFrame((state,delta)=>{
    if(playing&&!document.hidden&&replay)elapsed.current+=Math.min(delta,.1)
    if(replay)demo.current=replayAt(replay,elapsed.current)
    if(car.current){const p=demo.current.position,t=demo.current.tangent;car.current.position.set(p.x,p.y+2,p.z);car.current.rotation.y=Math.atan2(t.x,t.z);car.current.visible=!!replay}
    if(background.current){
      const others=demo.current.others??[],count=Math.min(300,others.length/7)
      for(let i=0;i<count;i++){
        const k=i*7;scratch.position.set(others[k+1],others[k+2]+.7,others[k+3]);scratch.rotation.set(0,others[k+4],0);scratch.scale.set(others[k+6],1.4,others[k+5]);scratch.updateMatrix();background.current.setMatrixAt(i,scratch.matrix)
      }
      background.current.count=count;background.current.instanceMatrix.needsUpdate=true
    }
    if(arrows.current){
      const count=Math.min(80,Math.max(12,Math.ceil(route.path.length/42)))
      const spacing=route.path.length/count,phase=playing?state.clock.elapsedTime*8:0
      for(let i=0;i<count;i++){
        const {position:p,tangent:t}=sampleLane(route.path,(i*spacing+phase)%route.path.length)
        scratch.position.set(p.x,p.y+1.3,p.z);scratch.rotation.set(0,Math.atan2(t.x,t.z),0)
        const scale=Math.max(.8,Math.min(3,route.path.length/(size.width<720?900:1700)))
        scratch.scale.setScalar(scale);scratch.updateMatrix();arrows.current.setMatrixAt(i,scratch.matrix)
      }
      arrows.current.count=count;arrows.current.instanceMatrix.needsUpdate=true
    }
  },-1)
  return <>
    {traffic&&<instancedMesh ref={background} args={[undefined,undefined,300]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#627985" emissive="#355365" emissiveIntensity={.35}/></instancedMesh>}
    <Html position={[route.path.points[0].x,route.path.points[0].y+5,route.path.points[0].z]} center zIndexRange={[6,2]} style={{pointerEvents:'none'}}><span className="rd-endpoint">{tx(approachName(route.movement.from))}</span></Html>
    <Html position={[route.path.points.at(-1)!.x,route.path.points.at(-1)!.y+5,route.path.points.at(-1)!.z]} center zIndexRange={[6,2]} style={{pointerEvents:'none'}}><span className="rd-endpoint">{tx(exitName(route.movement.to))}</span></Html>
    <Line points={vectors} color="#073d60" lineWidth={10} transparent opacity={.65} depthTest={false} renderOrder={8} />
    <Line points={vectors} color="#65e1f2" lineWidth={3} transparent opacity={.93} depthTest={false} renderOrder={9} />
    <instancedMesh ref={arrows} args={[arrowGeometry,undefined,80]} frustumCulled={false} renderOrder={10}><meshBasicMaterial color="#e0fcff" depthTest={false} depthWrite={false} side={T.DoubleSide} toneMapped={false}/></instancedMesh>
    <group ref={car}>
      <mesh><boxGeometry args={[4,2.2,8]}/><meshBasicMaterial color="#78efff" toneMapped={false}/></mesh>
      <mesh position={[0,1.4,-.7]}><boxGeometry args={[3,1.2,3.7]}/><meshBasicMaterial color="#0b3244" /></mesh>
      <Html center position={[0,7,0]} zIndexRange={[6,2]} style={{pointerEvents:'none'}}><span className="rd-demo-label">{tx('示范车')}</span></Html>
    </group>
    {pins.filter(p=>explaining||p.laneIds.some(id=>route.laneIds.includes(id))).map((p,i)=><WhyMarker key={p.id} pin={p} number={i+1} active={activePin===p.id||(!activePin&&p.laneIds.includes(demo.current.laneId))} onClick={()=>onPin(p.id)}/>) }
  </>
}
export function WhyMarker({pin,number,active,onClick}:{pin:WhyPin;number:number;active:boolean;onClick:()=>void}) {
  const tx=useExperienceI18n(),p=pin.position
  return <><Line points={[[p.x,p.y+1,p.z],[p.x,p.y+26,p.z]]} color={active?"#98dcea":"#47718c"} lineWidth={1} transparent opacity={.7}/><Html position={[p.x,p.y+26,p.z]} center zIndexRange={[7,3]}><button className="rd-why-pin" type="button" aria-pressed={active} aria-label={tx(pin.title)} onClick={onClick}><b>{number}</b></button></Html></>
}
