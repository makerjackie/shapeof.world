import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useExperienceI18n } from '~/i18n/experience'
import { strip } from '../scene/mesh-kit'
import { terrainHeight } from '../sim/terrain'
import type { Network } from '../sim/types'
import type { Journey } from './journey'
import { journeyDistance, stepAt } from './journey'
import { sampleLane } from '../sim/geometry'
import { approachName, exitName, TURN_NAMES, TURN_SYMBOLS, turnKey, type ExploreRoute } from './routes'
import { replayAt, type DemoReplay, type DemoState } from './replay'
import type { WhyPin } from './explanations'
import { useEditorialText } from './use-editorial-text'

/** One cyan for the chosen route, here and in the plan/profile atlas (CSS --route-ink). */
export const ROUTE_INK='#3fd5ea'
/** Saturated cyan edges and a bright core above the bloom threshold: the
 * route glows like a tube light; the rest of the model stays matte. */
function routeGlowMaterial(){
  return new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-3,
    uniforms:{edge:{value:new T.Color('#12b4d0')},core:{value:new T.Color(.42,1.6,1.9)}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 edge; uniform vec3 core; varying vec2 vUv; void main(){float across=abs(vUv.x-.5)*2.0;gl_FragColor=vec4(mix(core,edge,smoothstep(.04,.34,across)),1.0);}'})
}
const HEAD_LAMP=[3.4,3.0,2.35],TAIL_LAMP=[2.9,.14,.07]
/** Other traffic as lamp points, as in the poster: warm heads, red tails. A
 * pixel floor keeps them visible from the overview, where a car is subpixel. */
function lampPoints(capacity:number){
  const geometry=new T.BufferGeometry()
  geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage))
  geometry.setAttribute('lampColor',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage))
  geometry.setDrawRange(0,0)
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{pixelRatio:{value:1}},
    vertexShader:'attribute vec3 lampColor; uniform float pixelRatio; varying vec3 vColor; void main(){vColor=lampColor;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(260.0/max(1.0,-p.z),2.5,7.0)*pixelRatio;}',
    fragmentShader:'varying vec3 vColor; void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;gl_FragColor=vec4(vColor,exp(-r*r*3.5));}'})
  return {geometry,material}
}
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
        return <Line key={r.movement.id} points={points} color={ROUTE_INK} lineWidth={2} onClick={e=>{e.stopPropagation();onSelect(r.movement.id)}}/>
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

export function RouteScene({route,replay,revision,playing,demo,pins,activePin,onPin,explaining,traffic,follow,showPins,journey,network,seek}:{route:ExploreRoute;replay:DemoReplay|null;revision:number;playing:boolean;demo:MutableRefObject<DemoState>;pins:WhyPin[];activePin:string|null;onPin:(id:string)=>void;explaining:boolean;traffic:boolean;follow:boolean;showPins:boolean;journey:Journey;network:Network;seek:{at:number;revision:number}|null}) {
  const tx=useExperienceI18n(),car=useRef<T.Group>(null),arrows=useRef<T.InstancedMesh>(null),background=useRef<T.InstancedMesh>(null),lamps=useMemo(()=>lampPoints(600),[])
  const {gl}=useThree(),label=useRef<HTMLSpanElement>(null),labelCheck=useRef(0),overlays=useRef<HTMLElement[]>([])
  const elapsed=useRef(0)
  const ribbon=useMemo(()=>strip(route.path.points,route.path.width,0,.16),[route]),glow=useMemo(routeGlowMaterial,[])
  const shadow=useMemo(()=>strip(route.path.points.map(p=>({...p,y:terrainHeight(network,p.x,p.z)+.03})),route.path.width*1.8),[route,network])
  const drops=useMemo(()=>Array.from({length:24},(_,i)=>sampleLane(route.path,route.path.length*i/23).position).filter(p=>p.y-terrainHeight(network,p.x,p.z)>3),[route,network])
  useEffect(()=>()=>{ribbon.dispose();shadow.dispose()},[ribbon,shadow])
  useEffect(()=>()=>glow.dispose(),[glow])
  useEffect(()=>()=>{lamps.geometry.dispose();lamps.material.dispose()},[lamps])
  useEffect(()=>{if(seek)elapsed.current=seek.at},[seek])
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
    if(label.current&&state.clock.elapsedTime-labelCheck.current>.1){
      labelCheck.current=state.clock.elapsedTime
      if(!overlays.current[0]?.isConnected)overlays.current=Array.from(gl.domElement.closest('.road-design-experience')?.querySelectorAll<HTMLElement>('.rd-atlas,.rd-explorer,.rd-heading,.rd-layers,.rd-catalog,.rd-main-tools,.rd-compass')??[])
      const a=label.current.getBoundingClientRect()
      const obscured=overlays.current.some(e=>{const b=e.getBoundingClientRect();return b.width&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top})
      label.current.style.visibility=obscured?'hidden':'visible'
    }
    if(background.current){
      const lampPosition=lamps.geometry.getAttribute('position') as T.BufferAttribute,lampColor=lamps.geometry.getAttribute('lampColor') as T.BufferAttribute
      const others=demo.current.others??[],count=Math.min(300,others.length/7)
      for(let i=0;i<count;i++){
        const k=i*7;scratch.position.set(others[k+1],others[k+2]+.7,others[k+3]);scratch.rotation.set(0,others[k+4],0);scratch.scale.set(others[k+6],1.2,others[k+5]);scratch.updateMatrix();background.current.setMatrixAt(i,scratch.matrix)
        for(const end of[1,-1]){
          const forward=end*(others[k+5]/2+.06),j=(i*2+(end>0?0:1))*3,color=end>0?HEAD_LAMP:TAIL_LAMP
          lampPosition.array[j]=others[k+1]+Math.sin(others[k+4])*forward;lampPosition.array[j+1]=others[k+2]+.78;lampPosition.array[j+2]=others[k+3]+Math.cos(others[k+4])*forward
          lampColor.array[j]=color[0];lampColor.array[j+1]=color[1];lampColor.array[j+2]=color[2]
        }
      }
      background.current.count=count;background.current.instanceMatrix.needsUpdate=true
      lamps.geometry.setDrawRange(0,count*2);lampPosition.needsUpdate=true;lampColor.needsUpdate=true;lamps.material.uniforms.pixelRatio.value=state.gl.getPixelRatio()
    }
    if(arrows.current){
      const count=Math.min(80,Math.max(6,Math.ceil(route.path.length/80)))
      const spacing=route.path.length/count,phase=playing?state.clock.elapsedTime*8:0
      for(let i=0;i<count;i++){
        const {position:p,tangent:t}=sampleLane(route.path,(i*spacing+phase)%route.path.length)
        scratch.position.set(p.x,p.y+.27,p.z);scratch.rotation.set(0,Math.atan2(t.x,t.z),0)
        // 2.8 m wide before scaling; follow mode stays below half a 1.8 m car.
        scratch.scale.setScalar(follow?.25:.6);scratch.updateMatrix();arrows.current.setMatrixAt(i,scratch.matrix)
      }
      arrows.current.count=count;arrows.current.instanceMatrix.needsUpdate=true
    }
  },-1)
  return <>
    {traffic&&<><instancedMesh ref={background} args={[undefined,undefined,300]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#2a3139" roughness={.5}/></instancedMesh>
      <points geometry={lamps.geometry} material={lamps.material} frustumCulled={false} renderOrder={3}/></>}
    <mesh geometry={shadow}><meshBasicMaterial color="#000000" transparent opacity={.3} depthWrite={false} side={T.DoubleSide}/></mesh>
    <mesh geometry={ribbon} material={glow} renderOrder={2}/>
    {drops.map((p,i)=><Line key={i} points={[[p.x,terrainHeight(network,p.x,p.z)+.05,p.z],[p.x,p.y,p.z]]} color={ROUTE_INK} lineWidth={1} transparent opacity={.4}/>)}
    <CrossingScene route={route} journey={journey} demo={demo} follow={follow}/>
    <instancedMesh ref={arrows} args={[arrowGeometry,undefined,80]} frustumCulled={false} renderOrder={10}><meshBasicMaterial color="#06323c" depthWrite={false} side={T.DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={0} polygonOffsetUnits={-3}/></instancedMesh>
    <group ref={car}>
      <DemonstrationCar/>
      {replay&&<Html center position={[0,4,0]} zIndexRange={[6,2]} style={{pointerEvents:'none'}}><span ref={label} className="rd-demo-label">{tx('示范车')}</span></Html>}
    </group>
    {showPins&&!journey&&pins.map((p,i)=>p.id===activePin&&(explaining||p.laneIds.some(id=>route.laneIds.includes(id)))&&<WhyMarker key={p.id} pin={p} number={i+1} active onClick={()=>onPin(p.id)} compact={follow}/>)}
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
  <Line points={[[-.8,1.49,-1.4],[-.8,1.49,1.1],[.8,1.49,1.1],[.8,1.49,-1.4],[-.8,1.49,-1.4]]} color={ROUTE_INK} lineWidth={1.5} toneMapped={false} depthTest={false} renderOrder={11}/>
 </>
}
export function WhyMarker({pin,number,active,onClick,compact=false}:{pin:WhyPin;number:number;active:boolean;onClick:()=>void;compact?:boolean}) {
  const copy=useEditorialText(),p=pin.position
  const {gl}=useThree(),button=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement|null>(null)
  const stem=useRef<T.Group>(null),label=useRef<T.Group>(null),offset=useMemo(()=>new T.Vector3(),[])
  useFrame(({camera,size})=>{
    // Cap the leader at 40 screen pixels in every close view; omit it in follow.
    const mpp=2*camera.position.distanceTo(offset.set(p.x,p.y,p.z))*Math.tan((camera as T.PerspectiveCamera).fov*Math.PI/360)/size.height
    const height=Math.min(26,mpp*40)
    if(stem.current)stem.current.scale.y=height
    if(label.current)label.current.position.y=p.y+height
    // An approach note can be outside the close-up until the car reaches it.
    // Hide its annotation there instead of drawing it offscreen or over UI.
    if(!panel.current?.isConnected)panel.current=gl.domElement.closest('.road-design-experience')?.querySelector('.rd-explorer')??null
    offset.set(p.x,p.y+height,p.z).project(camera)
    const rect=gl.domElement.getBoundingClientRect(),edge=panel.current?.getBoundingClientRect()
    const x=(offset.x+1)*size.width/2,y=(1-offset.y)*size.height/2,mobile=size.width<720
    const visible=offset.z<1&&x>20&&x<(mobile?size.width-20:(edge?.left??rect.right)-rect.left-20)&&y>(mobile?180:285)&&y<(mobile&&edge?edge.top-rect.top-55:size.height-175)
    if(button.current)button.current.style.visibility=visible?'visible':'hidden'
    if(stem.current)stem.current.visible=visible
  })
  if(compact)return null
  return <><group ref={stem} position={[p.x,p.y+1,p.z]}><Line points={[[0,0,0],[0,1,0]]} color={active?ROUTE_INK:"#6f7880"} lineWidth={1} transparent opacity={.7}/></group><group ref={label} position={[p.x,p.y+26,p.z]}><Html center zIndexRange={[7,3]}><button ref={button} className="rd-why-pin" type="button" aria-pressed={active} aria-label={copy(pin,'title')} onClick={onClick}><b>{number}</b></button></Html></group></>
}

function CrossingScene({route,journey,demo,follow}:{route:ExploreRoute;journey:Journey;demo:MutableRefObject<DemoState>;follow:boolean}){
 const copy=useEditorialText(),groups=useRef<(T.Group|null)[]>([]),labels=useRef<(HTMLSpanElement|null)[]>([])
 useFrame(()=>{const s=journeyDistance(route,demo.current.position),step=journey.steps[stepAt(journey,s)],nearest=step?.crossings.reduce<Journey['crossings'][number]|undefined>((a,b)=>!a||Math.abs(b.s-s)<Math.abs(a.s-s)?b:a,undefined);groups.current.forEach((g,i)=>{const visible=!follow&&nearest===journey.crossings[i];if(g)g.visible=visible;if(labels.current[i])labels.current[i]!.style.display=visible?'block':'none'})})
 return <>{journey.crossings.map((c,i)=><group key={i} ref={g=>{groups.current[i]=g}}>
  {c.lines.map((line,j)=><Line key={j} points={line.map(p=>[p.x,p.y,p.z] as [number,number,number])} color="#e5a24a" lineWidth={5} transparent opacity={.85}/>)}
  <Line points={[[c.position.x,c.position.y+.2,c.position.z],[c.position.x,c.position.y+18,c.position.z]]} color="#d39a4d" lineWidth={1}/>
  <Html position={[c.position.x,c.position.y+20,c.position.z]} center zIndexRange={[8,3]} style={{pointerEvents:'none'}}><span ref={el=>{labels.current[i]=el}} className="rd-crossing-label" data-grade-crossing={c.over?'over':'under'}>{copy(c,'title')}</span></Html>
 </group>)}</>
}
