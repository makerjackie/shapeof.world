import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useExperienceI18n } from '~/i18n/experience'
import { sampleLane } from '../sim/geometry'
import { approachName, exitName, TURN_NAMES, TURN_SYMBOLS, turnKey, type ExploreRoute } from './routes'
import { replayAt, type DemoReplay, type DemoState } from './replay'
import type { WhyPin } from './explanations'
import { useEditorialText } from './use-editorial-text'

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
  const elapsed=useRef(0)
  const vectors=useMemo(()=>route.path.points.map(p=>new T.Vector3(p.x,p.y+.85,p.z)),[route])
  const arrowGeometry=useMemo(()=>{
    const g=new T.BufferGeometry()
    // Two thin strokes, about one car long, sharing the route ink's hue.
    g.setAttribute('position',new T.Float32BufferAttribute([-1.4,0,-1.3,-1.2,0,-1.5,.1,0,1.2,-1.4,0,-1.3,.1,0,1.2,-.1,0,1.5,1.4,0,-1.3,1.2,0,-1.5,-.1,0,1.2,1.4,0,-1.3,-.1,0,1.2,.1,0,1.5],3));g.computeVertexNormals();return g
  },[])
  useEffect(()=>()=>arrowGeometry.dispose(),[arrowGeometry])
  useEffect(()=>{elapsed.current=0;demo.current={...INITIAL_DEMO,position:route.path.points[0]}},[route,replay,revision,demo])
  const scratch=useMemo(()=>new T.Object3D(),[])
  useFrame((state,delta)=>{
    if(playing&&!document.hidden&&replay)elapsed.current+=Math.min(delta,.1)
    if(replay)demo.current=replayAt(replay,elapsed.current)
    if(car.current){const p=demo.current.position,t=demo.current.tangent;car.current.position.set(p.x,p.y,p.z);car.current.rotation.set(-Math.atan2(t.y,Math.hypot(t.x,t.z)),Math.atan2(t.x,t.z),0,'YXZ');car.current.visible=!!replay}
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
        scratch.scale.setScalar(.6);scratch.updateMatrix();arrows.current.setMatrixAt(i,scratch.matrix)
      }
      arrows.current.count=count;arrows.current.instanceMatrix.needsUpdate=true
    }
  },-1)
  return <>
    {traffic&&<instancedMesh ref={background} args={[undefined,undefined,300]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#627985" emissive="#355365" emissiveIntensity={.35}/></instancedMesh>}
    <Line points={vectors} color="#073d60" lineWidth={10} transparent opacity={.65} depthTest={false} renderOrder={8} />
    <Line points={vectors} color="#65e1f2" lineWidth={3} transparent opacity={.93} depthTest={false} renderOrder={9} />
    <instancedMesh ref={arrows} args={[arrowGeometry,undefined,80]} frustumCulled={false} renderOrder={10}><meshBasicMaterial color="#80dbe8" depthTest={false} depthWrite={false} side={T.DoubleSide} toneMapped={false}/></instancedMesh>
    <group ref={car}>
      <DemonstrationCar/>
      {replay&&<Html center position={[0,4,0]} zIndexRange={[6,2]} style={{pointerEvents:'none'}}><span className="rd-demo-label">{tx('示范车')}</span></Html>}
    </group>
    {pins.filter(p=>explaining||p.laneIds.some(id=>route.laneIds.includes(id))).map((p,i)=><WhyMarker key={p.id} pin={p} number={i+1} active={activePin===p.id||(!activePin&&p.laneIds.includes(demo.current.laneId))} onClick={()=>onPin(p.id)}/>) }
  </>
}

function DemonstrationCar(){
 const shell=useMemo(()=>new RoundedBoxGeometry(1,1,1,1,.08),[])
 useEffect(()=>()=>shell.dispose(),[shell])
 // Same proportions, rounded shell, cabin and lamps as Vehicles' passenger car.
 return <>
  <mesh geometry={shell} position={[0,.58,0]} scale={[1.8,.65,4.5]}><meshStandardMaterial color="#a7aaa8" emissive="#6c777a" emissiveIntensity={.12} roughness={.35} metalness={.35}/></mesh>
  <mesh geometry={shell} position={[0,1.14,-.15]} scale={[1.512,.6,2.34]}><meshStandardMaterial color="#1c2b35" roughness={.18} metalness={.6}/></mesh>
  {[-1,1].flatMap(end=>[-1,1].map(side=><mesh key={`${end}:${side}`} position={[side*.648,.7,end*2.25]}><boxGeometry args={[.3,.16,.14]}/><meshBasicMaterial color={end>0?'#ffe6bb':'#cf3026'} toneMapped={false}/></mesh>))}
  <Line points={[[-.8,1.49,-1.4],[-.8,1.49,1.1],[.8,1.49,1.1],[.8,1.49,-1.4],[-.8,1.49,-1.4]]} color="#65e1f2" lineWidth={1.5} toneMapped={false} depthTest={false} renderOrder={11}/>
 </>
}
export function WhyMarker({pin,number,active,onClick}:{pin:WhyPin;number:number;active:boolean;onClick:()=>void}) {
  const copy=useEditorialText(),p=pin.position
  return <><Line points={[[p.x,p.y+1,p.z],[p.x,p.y+26,p.z]]} color={active?"#98dcea":"#47718c"} lineWidth={1} transparent opacity={.7}/><Html position={[p.x,p.y+26,p.z]} center zIndexRange={[7,3]}><button className="rd-why-pin" type="button" aria-pressed={active} aria-label={copy(pin,'title')} onClick={onClick}><b>{number}</b></button></Html></>
}
