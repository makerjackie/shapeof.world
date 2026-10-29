import { memo, useEffect, useMemo, useRef, type ComponentRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import * as T from 'three'
import { isWorldPaused } from '~/lib/world-playback'
import { advance, FINAL_MESH, FOILS, PLANETARY, RAD, readings, sectionSample, SECTIONS, SPEC, TAU, type Inputs, type PartId, type State, type ViewId } from './model'
import { bladeGeometry, foilGeometry, gearGeometry, groundHeight, landscapeGeometry } from './geometry'

type Props = { state: MutableRefObject<State>; telemetry: MutableRefObject<ReturnType<typeof readings>>; input: Inputs; paused: boolean; speed: number; view: ViewId; part: PartId; explode: number; cover: boolean; flow: boolean; labels: boolean; station: number; sectionMode: boolean; reset: number; names: Record<string,string>; select: (p:PartId)=>void; sample:(s:State)=>void; interact:()=>void }
const AXIS_X:[number,number,number]=[0,0,Math.PI/2]
const BASE=groundHeight(0,0),HEAD=SPEC.hubHeight-5*Math.sin(5*RAD)
function Metal({color='#83939b',roughness=.32}:{color?:string;roughness?:number}){return <meshStandardMaterial color={color} roughness={roughness} metalness={.78}/>}
function Shaft({x=0,y=0,z=0,length,r=.15,color='#a1afb6'}:{x?:number;y?:number;z?:number;length:number;r?:number;color?:string}){return <mesh position={[x,y,z]} rotation={AXIS_X} castShadow><cylinderGeometry args={[r,r,length,32]}/><Metal color={color}/></mesh>}
function Ring({at=[0,0,0],r,width=.045,color='#a0afb8',rotation=[0,Math.PI/2,0]}:{at?:[number,number,number];r:number;width?:number;color?:string;rotation?:[number,number,number]}){return <mesh position={at} rotation={rotation}><torusGeometry args={[r,width,8,64]}/><Metal color={color}/></mesh>}
function Block({at,size,color='#7b8d96',metal=.5}:{at:[number,number,number];size:[number,number,number];color?:string;metal?:number}){return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={metal} roughness={.45}/></mesh>}
function Bolts({x,r,n=16}:{x:number;r:number;n?:number}){return <>{Array.from({length:n},(_,i)=>{const a=i/n*TAU;return <Shaft key={i} x={x} y={Math.cos(a)*r} z={Math.sin(a)*r} length={.08} r={.045} color="#b6c2c7"/>})}</>}
function Clock(p:Props){const elapsed=useRef(0);useFrame((_,dt)=>{if(!p.paused&&!document.hidden&&!isWorldPaused()){p.state.current=advance(p.state.current,Math.min(dt,.06)*p.speed,p.input);p.telemetry.current=readings(p.state.current,p.input)}elapsed.current+=dt;if(elapsed.current>.15){p.sample({...p.state.current});elapsed.current=0}});return null}
function Planetary({state,inputRatio,x,sun,ring,module,explode}:{state:MutableRefObject<State>;inputRatio:number;x:number;sun:number;ring:number;module:number;explode:number}){
 const sunRef=useRef<T.Group>(null),carrier=useRef<T.Group>(null),planets=useRef<(T.Group|null)[]>([]),planet=(ring-sun)/2,distance=module*(sun+planet)/2
 const geometries=useMemo(()=>[gearGeometry(sun,module,.18),gearGeometry(planet,module,.18),gearGeometry(ring,module,.19,true)],[sun,planet,ring,module])
 useEffect(()=>()=>geometries.forEach(g=>g.dispose()),[geometries])
 useFrame(()=>{const a=state.current.theta*inputRatio;if(sunRef.current)sunRef.current.rotation.x=a*5;if(carrier.current)carrier.current.rotation.x=a;planets.current.forEach(g=>{if(g)g.rotation.x=-a*(ring/sun)*sun/planet})})
 return <group position={[x+explode*x*.4,0,0]}>
  <mesh geometry={geometries[2]} rotation={[0,Math.PI/2,0]}><Metal color="#627984"/></mesh>
  <group ref={sunRef}><mesh geometry={geometries[0]} rotation={[0,Math.PI/2,0]}><Metal color="#c4a364"/></mesh><Shaft length={.6} r={module*sun*.13}/></group>
  <group ref={carrier}>{Array.from({length:3},(_,i)=>{const a=i*TAU/3;return <group key={i} position={[0,Math.cos(a)*distance,Math.sin(a)*distance]}><group ref={g=>{planets.current[i]=g}}><mesh geometry={geometries[1]} rotation={[0,Math.PI/2,0]}><Metal color="#9eafba"/></mesh></group><Shaft x={.26} length={.3} r={.075}/></group>})}<Ring at={[.32,0,0]} r={distance} width={.055} color="#9d8662"/></group>
  <Bolts x={.23} r={ring*module/2+module*2} n={16}/>
 </group>
}
function Gearbox({state,explode,select}:{state:MutableRefObject<State>;explode:number;select:(p:PartId)=>void}){
 const big=useRef<T.Group>(null),small=useRef<T.Group>(null),geometry=useMemo(()=>[gearGeometry(FINAL_MESH.wheel,FINAL_MESH.module,.22),gearGeometry(FINAL_MESH.pinion,FINAL_MESH.module,.22)],[])
 useEffect(()=>()=>geometry.forEach(g=>g.dispose()),[geometry]);useFrame(()=>{if(big.current)big.current.rotation.x=state.current.theta*25;if(small.current)small.current.rotation.x=-state.current.theta*97})
 return <group onClick={e=>{e.stopPropagation();select('gearbox')}}>
  {PLANETARY.map(stage=><Planetary key={stage.x} state={state} {...stage} explode={explode}/>)}
  <group position={[2.8+explode*2.8*.4,0,0]}><group ref={big}><mesh geometry={geometry[0]} rotation={[0,Math.PI/2,0]}><Metal color="#bb9b60"/></mesh></group><group position={[0,0,.732]}><group ref={small}><mesh geometry={geometry[1]} rotation={[0,Math.PI/2,0]}><Metal color="#a8b8c0"/></mesh></group></group></group>
  <Block at={[1.4,-1.17,0]} size={[4.2,.22,2.7]} color="#354d5a"/>
  <Shaft x={1.6} length={4.3+explode*1.2} r={.13}/>
 </group>
}
function Generator({state,explode=0,select,large=false}:{state:MutableRefObject<State>;explode?:number;select:(p:PartId)=>void;large?:boolean}){
 const rotor=useRef<T.Group>(null),coils=useRef<T.Group>(null)
 useFrame(()=>{if(rotor.current)rotor.current.rotation.x=-state.current.theta*97})
 return <group position={[large?0:6.8,0,large?0:.732]} onClick={e=>{e.stopPropagation();select('generator')}}>
  <Shaft length={3.5} r={.18}/>
  <group ref={rotor}>{Array.from({length:6},(_,i)=>{const a=i*TAU/6;return <group key={i} rotation={[a,0,0]}><Block at={[0,.48,0]} size={[2.3,.25,.43]} color={i%2?'#62849d':'#ac735c'} metal={.65}/></group>})}<Shaft length={2.6} r={.3} color="#627780"/></group>
  <group ref={coils} position={[explode*3,0,0]}>{Array.from({length:24},(_,i)=>{const a=i*TAU/24;return <group key={i} rotation={[a,0,0]}><RoundedBox args={[2.2,.32,.13]} radius={.055} smoothness={2} position={[0,.86,0]} castShadow><meshStandardMaterial color={['#b87b4d','#a06f48','#c68b56'][i%3]} metalness={.7} roughness={.33}/></RoundedBox>{[-.9,.9].map(x=><Ring key={x} at={[x,.86,0]} rotation={[Math.PI/2,0,0]} r={.15} width={.04} color="#b28256"/>)}</group>})}</group>
  {[-1.3,1.3].map(x=><group key={x} position={[x+(x>0?explode*3:0),0,0]}><Ring r={1.1} width={.14} color="#5d7784"/><Bolts x={.1} r={1.1} n={12}/></group>)}
  <Block at={[0,-1.15,0]} size={[3.2,.25,2.5]} color="#425e6a"/>
 </group>
}
function Brake({state,select}:{state:MutableRefObject<State>;select:(p:PartId)=>void}){const ref=useRef<T.Group>(null);useFrame(()=>{if(ref.current)ref.current.rotation.x=-state.current.theta*97});return <group position={[4.3,0,.732]} onClick={e=>{e.stopPropagation();select('brake')}}><group ref={ref}><Shaft length={.075} r={.64} color="#aeb9be"/><Ring r={.56} width={.025} color="#485d69"/></group>{[-1,1].map(side=><Block key={side} at={[side*.16,.38,0]} size={[.2,.5,.65]} color="#8c6559"/>)}<Block at={[0,-.6,0]} size={[.5,.22,.6]} color="#435765"/></group>}
function Nacelle({state,explode,cover,select,simple=false,direction=0}:{state:MutableRefObject<State>;explode:number;cover:boolean;select:(p:PartId)=>void;simple?:boolean;direction?:number}){
 const vane=useRef<T.Group>(null);useFrame(()=>{if(vane.current)vane.current.rotation.y=(direction-state.current.yaw)*RAD})
 return <>
  {!simple&&<>
   <Block at={[2,-1.65,0]} size={[11,.3,3.6]} color="#3a515e"/>
   {[-3,-1,3.8,8].map(x=><group key={x}><Block at={[x,-.8,0]} size={[.3,1.3,2.1]} color="#536976"/>{[-.9,.9].map(z=><Shaft key={z} x={x} y={-.2} z={z} length={.5} r={.12}/>)}</group>)}
   <group rotation={[0,0,-5*RAD]}>
    <group onClick={e=>{e.stopPropagation();select('shaft')}}><Shaft x={-2.4} length={5.2} r={.33} color="#9aa8af"/><Ring at={[-2.9,0,0]} r={.5} width={.15} color="#526d7e"/><Ring at={[-.7,0,0]} r={.48} width={.14} color="#526d7e"/></group>
    <Gearbox state={state} explode={explode} select={select}/><Shaft x={4.7} z={.732} length={3.3} r={.11}/><Brake state={state} select={select}/><Generator state={state} explode={explode} select={select}/>
   </group>
   <group position={[.1,-2.2,0]} onClick={e=>{e.stopPropagation();select('yaw')}}><mesh><cylinderGeometry args={[2.1,2.1,.25,64]}/><Metal color="#5d7483"/></mesh><mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.87,.08,8,96]}/><Metal color="#a2b3bd"/></mesh>{Array.from({length:36},(_,i)=>{const a=i*TAU/36;return <Block key={i} at={[Math.cos(a)*2.06,0,Math.sin(a)*2.06]} size={[.11,.32,.11]} color="#859aa7"/>})}</group>
   <Block at={[9,.2,-1.4]} size={[1.1,1.5,.4]} color="#566c74"/>
   {Array.from({length:14},(_,i)=><Block key={i} at={[8.5+i*.09,.3,-1.7]} size={[.035,1.15,.25]} color="#97a7a5"/>)}
  </>}
  {(cover||simple)&&<RoundedBox args={[12,3.9,4.1]} radius={.7} smoothness={4} position={[2,explode*8+.3,0]} castShadow receiveShadow onClick={e=>{e.stopPropagation();select('shaft')}}><meshStandardMaterial color="#c7d0ca" roughness={.38} metalness={.18}/></RoundedBox>}
  <group position={[7,2.65,0]}>
   <mesh position={[0,-.35,0]}><cylinderGeometry args={[.04,.05,.7,8]}/><Metal/></mesh>
   <group ref={vane}><Block at={[.35,0,0]} size={[1.1,.035,.035]} color="#9aafa5"/><mesh position={[.8,.13,0]}><boxGeometry args={[.3,.28,.025]}/><Metal color="#b0bdb7"/></mesh></group>
  </group>
 </>
}
function Rotor({state,geometry,shortGeometry,short,select,phase=0}:{state:MutableRefObject<State>;geometry:T.BufferGeometry;shortGeometry:T.BufferGeometry;short:boolean;select:(p:PartId)=>void;phase?:number}){
 const ref=useRef<T.Group>(null),pitch=useRef<(T.Group|null)[]>([])
 useFrame(()=>{if(ref.current)ref.current.rotation.x=state.current.theta+phase;pitch.current.forEach(g=>{if(g)g.rotation.y=state.current.pitch*RAD})})
 return <group position={[-5*Math.cos(5*RAD),5*Math.sin(5*RAD),0]} rotation={[0,0,-5*RAD]}><group ref={ref}>
  <mesh position={[-1.2,0,0]} scale={[1.7,1.45,1.45]} onClick={e=>{e.stopPropagation();select('rotor')}} castShadow><sphereGeometry args={[1,32,24]}/><meshStandardMaterial color="#d2d8d0" roughness={.36} metalness={.15}/></mesh>
  {[0,TAU/3,TAU*2/3].map((angle,i)=><group key={i} rotation={[angle,0,0]}>
   <group rotation={[0,0,2.5*RAD]}>
    <group position={[0,1.6,0]} onClick={e=>{e.stopPropagation();select('pitch')}}><mesh><cylinderGeometry args={[1.79,1.79,.35,48]}/><Metal color="#b0bdbe"/></mesh><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.72,.065,8,64]}/><Metal color="#778f9c"/></mesh></group>
    <group ref={g=>{pitch.current[i]=g}}><mesh geometry={short?shortGeometry:geometry} castShadow receiveShadow onClick={e=>{e.stopPropagation();select('rotor')}}><meshStandardMaterial color="#d4dcd3" roughness={.4} metalness={.08} side={T.DoubleSide}/></mesh></group>
   </group>
  </group>)}
 </group></group>
}
function Turbine({at,state,geometry,shortGeometry,detail=false,explode=0,cover=true,select,phase=0,focusPart='shaft',direction=0}:{at:[number,number,number];state:MutableRefObject<State>;geometry:T.BufferGeometry;shortGeometry:T.BufferGeometry;detail?:boolean;explode?:number;cover?:boolean;select:(p:PartId)=>void;phase?:number;focusPart?:PartId;direction?:number}){
 const nacelle=useRef<T.Group>(null);useFrame(()=>{if(nacelle.current)nacelle.current.rotation.y=state.current.yaw*RAD})
 return <group position={at}>
  <mesh position={[0,43.8,0]} castShadow receiveShadow onClick={e=>{e.stopPropagation();select('tower')}}><cylinderGeometry args={[1.935,3,87.6,40]}/><meshStandardMaterial color="#afbdb6" roughness={.52} metalness={.15}/></mesh>
  {[0,30,60,86].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[3-(3-1.935)*y/87.6,.035,6,48]}/><Metal color="#83958f"/></mesh>)}
  <Block at={[-3.01,1.9,0]} size={[.035,2.7,1]} color="#7f9698"/>
  <mesh position={[0,.35,0]}><cylinderGeometry args={[4.7,4.8,.7,48]}/><meshStandardMaterial color="#68736b" roughness={.9}/></mesh>
  <group ref={nacelle} position={[0,HEAD,0]}><Nacelle state={state} explode={explode} cover={cover} select={select} simple={!detail} direction={direction}/>{(!detail||['shaft','rotor','pitch'].includes(focusPart))&&<Rotor state={state} geometry={geometry} shortGeometry={shortGeometry} short={detail} select={select} phase={phase}/>}</group>
 </group>
}
function Sea({state}:{state:MutableRefObject<State>}){
 const material=useRef<T.ShaderMaterial>(null)
 useFrame(()=>{if(material.current)material.current.uniforms.uTime.value=state.current.elapsed})
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,-350]}><planeGeometry args={[5500,5000]}/><shaderMaterial ref={material} uniforms={{uTime:{value:0}}} vertexShader="varying vec2 vWorld;varying float vDistance;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xz;vDistance=length(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}" fragmentShader="varying vec2 vWorld;varying float vDistance;uniform float uTime;void main(){float fade=exp(-length(fwidth(vWorld))*.08);float a=(sin(vWorld.x*.045+vWorld.y*.081-uTime*.8)*.5+sin(vWorld.x*.11-vWorld.y*.037+uTime*.6)*.25+sin(vWorld.x*.25+vWorld.y*.19+uTime*.2)*.12)*fade;vec3 c=mix(vec3(.035,.10,.13),vec3(.11,.22,.26),.45+.22*a);float l=pow(max(0.,a*.5+.5),10.)*.05;float fog=smoothstep(300.,1600.,vDistance);gl_FragColor=vec4(mix(c+l,vec3(.13,.22,.24),fog),1.);}"/></mesh>
}
function Sky(){return <mesh><sphereGeometry args={[2400,32,16]}/><shaderMaterial side={T.BackSide} depthWrite={false} vertexShader="varying vec3 vDirection;void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader="varying vec3 vDirection;void main(){float h=max(0.,vDirection.y);vec3 horizon=vec3(.13,.22,.24),zenith=vec3(.025,.075,.12);vec3 c=mix(horizon,zenith,pow(h,.42));float glow=pow(max(0.,dot(normalize(vDirection),normalize(vec3(-1.,.04,-1.)))),24.)*exp(-h*7.);c+=vec3(.12,.075,.025)*glow;gl_FragColor=vec4(c,1.);}"/></mesh>}
function WindTraces({state,input,visible}:{state:MutableRefObject<State>;input:Inputs;visible:boolean}){
 const ref=useRef<T.InstancedMesh>(null),dummy=useMemo(()=>new T.Object3D(),[])
 useFrame(()=>{if(!ref.current)return;const a=input.direction*RAD;for(let i=0;i<180;i++){const x=((state.current.elapsed*state.current.wind+i*37.7)%400)-200,z=((i*53.23)%260)-130,y=20+(i*7.7)%135;dummy.position.set(x*Math.cos(a)+z*Math.sin(a),y,-x*Math.sin(a)+z*Math.cos(a));dummy.rotation.set(0,a,0);dummy.scale.set(2.5,.07,.07);dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix)}ref.current.instanceMatrix.needsUpdate=true})
 return <instancedMesh visible={visible} ref={ref} args={[undefined,undefined,180]} frustumCulled={false}><sphereGeometry args={[1,4,3]}/><meshBasicMaterial color="#87aaad" transparent opacity={.36} depthWrite={false}/></instancedMesh>
}
function Farm({p,geometry,shortGeometry}:{p:Props;geometry:T.BufferGeometry;shortGeometry:T.BufferGeometry}){
 const terrain=useMemo(()=>landscapeGeometry(),[]);useEffect(()=>()=>terrain.dispose(),[terrain])
 const road=useMemo(()=>[-450,-300,-100,0,180,330,500].map((x,i)=>new T.Vector3(x,groundHeight(x,35+Math.sin(i)*24)+.13,35+Math.sin(i)*24)),[])
 return <>
  <Sky/><mesh geometry={terrain} receiveShadow><meshStandardMaterial vertexColors roughness={.92}/></mesh><Sea state={p.state}/>
  <Line points={road} color="#8b8870" lineWidth={4} transparent opacity={.55}/>
  {[[-190,-220],[50,-240],[210,-20],[250,-400],[410,-90]].map(([x,z],i)=><Turbine key={i} at={[x,groundHeight(x,z),z]} state={p.state} geometry={geometry} shortGeometry={shortGeometry} select={p.select} phase={i*1.7} direction={p.input.direction}/>)}
  <Turbine at={[0,BASE,0]} state={p.state} geometry={geometry} shortGeometry={shortGeometry} select={p.select} direction={p.input.direction}/>
  <group position={[36,groundHeight(36,26),26]}><Block at={[0,1.7,0]} size={[5,3.3,4]} color="#607b7f"/><Block at={[0,3.7,0]} size={[5.2,.4,4.2]} color="#b0b7a1"/>{[-1.4,0,1.4].map(x=><group key={x}><Block at={[x,4.1,0]} size={[.1,.7,.1]} color="#7b8d8b"/><mesh position={[x,4.6,0]}><sphereGeometry args={[.16,10,8]}/><meshStandardMaterial color="#9cb0a9"/></mesh></group>)}</group>
  <Line points={[[0,BASE+.1,0],[0,BASE+.1,22],[36,groundHeight(36,26)+.1,26]]} color="#9f8055" lineWidth={1.5}/>
  <WindTraces state={p.state} input={p.input} visible={p.flow}/>
  {p.labels&&<Html position={[0,BASE+155,0]} center zIndexRange={[6,1]}><button className="wt-pin" onClick={()=>p.select('rotor')}>{p.names.rotor}</button></Html>}
 </>
}
function BladeStudy(p:Props){
 const geometry=useMemo(()=>bladeGeometry(),[]),foil=useMemo(()=>foilGeometry(p.station),[p.station]),airflow=useRef<T.Group>(null),liftRef=useRef<T.Group>(null),dragRef=useRef<T.Group>(null),pitch=useRef<T.Group>(null)
 const section=SECTIONS[p.station],points=useMemo(()=>{const f=FOILS[section.foil];return [...f.profile,f.profile[0]].map(v=>new T.Vector3((v[0]-f.reference[0])*section.chord,v[1]*section.chord,.38))},[section])
 useEffect(()=>()=>{geometry.dispose()},[geometry]);useEffect(()=>()=>foil.dispose(),[foil])
 useFrame(()=>{if(pitch.current)pitch.current.rotation.y=p.state.current.pitch*RAD;if(airflow.current){const e=sectionSample(p.state.current,p.input,p.station,p.telemetry.current);airflow.current.rotation.z=e.alpha*RAD;if(liftRef.current){liftRef.current.visible=Math.abs(e.cl)>.0001;liftRef.current.scale.y=T.MathUtils.clamp(e.cl/1.5,-1.3,1.3)}if(dragRef.current)dragRef.current.scale.x=T.MathUtils.clamp(e.cd/.12,.08,2)}})
 if(p.sectionMode)return <>
  <mesh geometry={foil}><meshStandardMaterial color="#bdc9c6" metalness={.3} roughness={.38}/></mesh><Line points={points} color="#b6cbd2" lineWidth={1}/>
  <Line points={[[-3,0,.4],[3,0,.4]]} color="#657e8c" dashed dashSize={.15} gapSize={.12} lineWidth={1}/>
  <group ref={airflow} position={[0,0,.6]}>
   <Line points={[[-3.2,-.8,0],[-1.9,-.8,0]]} color="#88b3c4" lineWidth={2}/><mesh position={[-1.85,-.8,0]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[.1,.3,10]}/><meshBasicMaterial color="#88b3c4"/></mesh>
   <group ref={liftRef}><Line points={[[0,0,0],[0,1.65,0]]} color="#bca16a" lineWidth={2}/><mesh position={[0,1.7,0]}><coneGeometry args={[.09,.28,10]}/><meshBasicMaterial color="#bca16a"/></mesh></group>
   <group ref={dragRef}><Line points={[[0,0,0],[.9,0,0]]} color="#ae7766" lineWidth={2}/><mesh position={[.94,0,0]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[.07,.22,10]}/><meshBasicMaterial color="#ae7766"/></mesh></group>
  </group>
 </>
 return <group rotation={[0,0,-Math.PI/2]} position={[-31,0,0]}><group ref={pitch}><mesh geometry={geometry} castShadow><meshStandardMaterial color="#cbd6ce" roughness={.4} metalness={.14} side={T.DoubleSide}/></mesh><Line points={[...FOILS[section.foil].profile,FOILS[section.foil].profile[0]].map(v=>{const tangent=(v[0]-FOILS[section.foil].reference[0])*section.chord,axial=v[1]*section.chord,a=section.twist*RAD;return new T.Vector3(axial*Math.cos(a)+tangent*Math.sin(a),section.span+SPEC.hubRadius,-axial*Math.sin(a)+tangent*Math.cos(a))})} color="#d1ad6e" lineWidth={2}/></group></group>
}
function ElectricStudy(p:Props){const phase=useRef<T.Group>(null);useFrame(()=>{if(phase.current)phase.current.rotation.x=-p.state.current.theta*97});return <>
 <Generator state={p.state} explode={p.explode} select={p.select} large/>
 <group position={[5,0,0]} onClick={e=>{e.stopPropagation();p.select('converter')}}><RoundedBox args={[1.6,2.5,2.2]} radius={.08} smoothness={2}><meshStandardMaterial color="#385869" metalness={.55} roughness={.4}/></RoundedBox>{[-.5,0,.5].map(x=><Block key={x} at={[x,0,1.13]} size={[.16,1.5,.06]} color="#8baab8"/>)}</group>
 <group position={[9,0,0]} onClick={e=>{e.stopPropagation();p.select('converter')}}><Block at={[0,-.9,0]} size={[2.5,.4,2.3]} color="#475e68"/>{[-.65,.65].map(z=><mesh key={z} position={[0,0,z]}><torusGeometry args={[.68,.22,10,40]}/><meshStandardMaterial color="#b27b4d" roughness={.4} metalness={.75}/></mesh>)}<Block at={[0,0,0]} size={[.3,1.7,.25]} color="#657e88"/></group>
 {[-.35,0,.35].map((z,i)=><Line key={z} points={[[1.4,-.3,z],[2.6,-.8,z],[4.2,-.8,z]]} color={['#af7854','#869da6','#b1a179'][i]} lineWidth={3}/>)}
 <Line points={[[5.8,-.5,0],[7,-.5,0],[7.8,-.5,0]]} color="#88afbb" lineWidth={2}/><Line points={[[10.2,-.4,0],[13,-.4,0]]} color="#a8b7a4" lineWidth={3}/>
 {p.labels&&<>{[[0,1.9,0],[5,1.9,0],[9,1.9,0]].map((at,i)=><Html key={i} position={at as [number,number,number]} center zIndexRange={[7,1]}><span className="wt-pin">{p.names[i===0?'generator':'converter']}</span></Html>)}</>}
 </>}
function Camera(p:Props){const {camera,size}=useThree(),orbit=useRef<ComponentRef<typeof OrbitControls>>(null)
 useEffect(()=>{let target=new T.Vector3(0,BASE+70,0),pos=new T.Vector3(-205,140,200)
  if(p.view==='nacelle'){
   const locations:Record<PartId,[number,number,number,number]>={rotor:[-5,0,0,19],pitch:[-5,0,0,12],shaft:[.5,0,0,17],gearbox:[1.7,0,0,7.8],generator:[6.8,0,.732,6.5],brake:[4.3,0,.732,4],yaw:[0,-2,0,8],converter:[8,0,0,9],tower:[0,-2,0,24]}
   const [x,y,z,d]=locations[p.part];target.set(x,BASE+HEAD+y,z);pos.copy(target).add(new T.Vector3(d*.75,d*.5,d*.88))
  }
  if(p.view==='blade'){target.set(0,0,0);pos.set(10,26,80);if(p.sectionMode)pos.set(1.5,1.4,7.5)}
  if(p.view==='electric'){target.set(p.part==='generator'?0:5,0,0);pos.set(p.part==='generator'?5:12,p.part==='generator'?3:7,p.part==='generator'?7:16)}
  if(size.width<600){pos.sub(target).multiplyScalar(p.view==='farm'?1.35:p.view==='blade'&&!p.sectionMode?1.75:1.4).add(target)}
  camera.position.copy(pos);camera.lookAt(target);if(camera instanceof T.PerspectiveCamera){camera.fov=p.view==='farm'?43:42;camera.updateProjectionMatrix()}
  if(orbit.current){orbit.current.target.copy(target);orbit.current.update()}
 },[p.view,p.part,p.reset,p.sectionMode,size.width,size.height,camera])
 return <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.08} minDistance={p.view==='farm'?35:1.6} maxDistance={p.view==='farm'?1600:300} minPolarAngle={.05} maxPolarAngle={Math.PI*.92} onStart={p.interact}/>
}
export const WindScene=memo(function WindScene(p:Props){
 const geometry=useMemo(()=>bladeGeometry(),[]),shortGeometry=useMemo(()=>bladeGeometry(4.1),[])
 useEffect(()=>()=>{geometry.dispose();shortGeometry.dispose()},[geometry,shortGeometry])
 return <Canvas shadows dpr={[1,1.5]} camera={{position:[-205,140,200],fov:43,near:.05,far:5000}} gl={{antialias:true}}>
  <color attach="background" args={[p.view==='farm'?'#13262e':'#08121b']}/>
  {p.view==='farm'&&<fog attach="fog" args={['#17303a',380,1700]}/>}
  <hemisphereLight args={['#d6e4df','#132c32',p.view==='farm'?1.5:.8]}/><ambientLight intensity={.22}/>
  <directionalLight position={[-150,240,130]} intensity={p.view==='farm'?2.6:2.2} color="#e9ddbe" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={180} shadow-camera-bottom={-120} shadow-bias={-.0005}/>
  <directionalLight position={[50,80,-160]} intensity={1.2} color="#8cb8d2"/>
  <Environment frames={1} resolution={128}><Lightformer form="rect" position={[-15,15,12]} scale={[20,8,1]} intensity={2.5} target={[0,0,0]}/><Lightformer form="rect" position={[10,5,-8]} scale={[6,18,1]} intensity={2} color="#a0c1d4" target={[0,0,0]}/></Environment>
  <Camera {...p}/><Clock {...p}/>
  {p.view==='farm'?<Farm p={p} geometry={geometry} shortGeometry={shortGeometry}/>:p.view==='nacelle'?<Turbine at={[0,BASE,0]} state={p.state} geometry={geometry} shortGeometry={shortGeometry} detail direction={p.input.direction} focusPart={p.part} explode={p.explode} cover={p.cover} select={p.select}/>:p.view==='blade'?<BladeStudy {...p}/>:<ElectricStudy {...p}/>}
 </Canvas>
})
