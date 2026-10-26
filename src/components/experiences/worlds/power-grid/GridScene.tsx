import { memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import * as T from 'three'
import { isWorldPaused } from '~/lib/world-playback'

type V3 = [number, number, number]
export interface SceneState { hz: number; tripped: boolean; shed: number; playing: boolean; reduced: boolean }
function Beam({ a, b, radius = .025, color = '#607e78', wire = false }: { a: V3; b: V3; radius?: number; color?: string; wire?: boolean }) {
  const { length, position, quaternion } = useMemo(() => {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), direction = bv.clone().sub(av)
    return { length: direction.length(), position: av.add(bv).multiplyScalar(.5), quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()) }
  }, [a.join(','), b.join(',')])
  return <mesh position={position} quaternion={quaternion} castShadow><cylinderGeometry args={[radius, radius, length, 6]}/><meshStandardMaterial color={color} wireframe={wire}/></mesh>
}
function Tower({ x, z, wire }: { x: number; z: number; wire: boolean }) {
  const c = wire ? '#2f5890' : '#72847c'
  return <group position={[x, .12, z]}>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <group key={`${sx}:${sz}`}>
      <Beam a={[sx*.44, 0, sz*.32]} b={[sx*.16, 2.35, sz*.13]} color={c}/>
      {[0, .65, 1.3].map((y, i) => <Beam key={y} a={[sx*(.44-i*.08), y, sz*(.32-i*.06)]} b={[-sx*(.36-i*.08), y+.65, sz*(.26-i*.06)]} radius={.014} color={c}/>)}
    </group>))}
    {[1.65,2.1].map(y => <group key={y}><Beam a={[-.9, y, 0]} b={[.9, y, 0]} radius={.035} color={c}/>{[-.8,.8].map(xi => <mesh key={xi} position={[xi,y-.12,0]}><cylinderGeometry args={[.055,.055,.24,8]}/><meshStandardMaterial color="#c3ccc0" wireframe={wire}/></mesh>)}</group>)}
  </group>
}
function Generator({ position, index, state, wire }: { position: V3; index: number; state: React.RefObject<SceneState>; wire: boolean }) {
  const rotor = useRef<T.Group>(null), caseMaterial = useRef<T.MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    const s = state.current
    const tripped = index === 0 && s.tripped
    if (rotor.current && s.playing && !s.reduced && !isWorldPaused()) rotor.current.rotation.z += Math.min(dt,.05) * (tripped ? .15 : s.hz / 50 * 1.5)
    caseMaterial.current?.color.set(tripped ? '#a4aaa3' : wire ? '#ffffff' : '#387b6d')
  })
  return <group position={position}>
    <mesh position={[0,.12,0]} receiveShadow castShadow><boxGeometry args={[1.65,.24,2.35]}/><meshStandardMaterial color={wire?'#edf3fa':'#d4dcd1'} wireframe={wire}/></mesh>
    <mesh position={[0,.72,-.22]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.65,.65,1.55,40,1,true,0,Math.PI*1.35]}/><meshStandardMaterial ref={caseMaterial} color="#387b6d" side={T.DoubleSide} roughness={.55} metalness={.2} wireframe={wire}/></mesh>
    {[-.85,-.66,-.47,-.28,-.09,.1,.29].map(z => <mesh key={z} position={[0,.72,z]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.65,.022,5,40,Math.PI*1.35]}/><meshStandardMaterial color={wire?'#2f5890':'#91aba0'} wireframe={wire}/></mesh>)}
    <group position={[0,.72,0]} ref={rotor}>
      <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.33,.33,1.9,24]}/><meshStandardMaterial color={wire?'#7297c1':'#a5794b'} metalness={.65} roughness={.35} wireframe={wire}/></mesh>
      {Array.from({length:8},(_,i) => <mesh key={i} position={[Math.cos(i*Math.PI/4)*.36,Math.sin(i*Math.PI/4)*.36,0]} rotation={[0,0,i*Math.PI/4]} castShadow><boxGeometry args={[.12,.16,1.55]}/><meshStandardMaterial color={wire?'#3c65a0':'#bf9164'} metalness={.55} roughness={.4} wireframe={wire}/></mesh>)}
      <mesh position={[0,0,.95]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.11,.11,.5,16]}/><meshStandardMaterial color="#a4b4b0" metalness={.75} roughness={.25} wireframe={wire}/></mesh>
    </group>
    <mesh position={[.65,.85,-.85]} castShadow><boxGeometry args={[.18,.5,.32]}/><meshStandardMaterial color={index===0?'#c34430':'#779589'} wireframe={wire}/></mesh>
  </group>
}
function City({ state, wire }: { state: React.RefObject<SceneState>; wire: boolean }) {
  const disconnected = useRef<T.Group>(null)
  const buildings = useMemo(() => Array.from({length:20},(_,i) => ({x:3.7+(i%5)*.6,z:-1.4+Math.floor(i/5)*.6,h:.35+((i*7)%11)*.08})),[])
  useFrame(() => { if(disconnected.current) disconnected.current.children.forEach((child,i)=>{child.visible=i<Math.round(state.current.shed/500)}) })
  return <group>
    <mesh position={[5,.12,-.65]} receiveShadow><boxGeometry args={[4,.24,3.35]}/><meshStandardMaterial color={wire?'#edf3fa':'#dce1d8'} wireframe={wire}/></mesh>
    {buildings.map((b,i) => <group key={i}>
      <mesh position={[b.x,b.h/2+.25,b.z]} castShadow receiveShadow><boxGeometry args={[.34,b.h,.44]}/><meshStandardMaterial color={wire?'#b4c8e1':i%3===0?'#8ba69b':'#f6f7ef'} roughness={.9} wireframe={wire}/></mesh>
      {[0,1].map(j=><mesh key={j} position={[b.x-.09+j*.18,b.h*.55+.25,b.z+.225]}><planeGeometry args={[.075,.12]}/><meshBasicMaterial color={wire?'#35649d':'#dfad68'}/></mesh>)}
    </group>)}
    <group ref={disconnected}>
      {buildings.slice(-3).map((b,i)=><group key={i}><mesh position={[b.x,b.h/2+.26,b.z]}><boxGeometry args={[.36,b.h+.02,.46]}/><meshStandardMaterial color="#727b79"/></mesh><mesh position={[b.x,.26,b.z]}><boxGeometry args={[.44,.04,.54]}/><meshBasicMaterial color="#bd4833"/></mesh></group>)}
    </group>
  </group>
}
function Circuit({ state, wire }: { state: React.RefObject<SceneState>; wire:boolean }) {
  const lever = useRef<T.Group>(null)
  const paths: V3[][] = [[[-5,.23,-2.8],[-3.65,.23,-2.8]], [[-3.05,.23,-2.8],[-2.5,.23,-2.8],[-2.5,.23,-.3],[.1,.23,-.3]], [[-5,.23,.1],[-2.5,.23,.1],[-2.5,.23,-.3]], [[-5,.23,3],[-2.5,.23,3],[-2.5,.23,-.3]], [[2.2,.23,-.3],[3.2,.23,-.3],[3.2,.23,1.1],[5,.23,1.1]]]
  useFrame(()=>{if(lever.current)lever.current.rotation.y=state.current.tripped?-.8:0})
  return <>
    {paths.map((path,i)=>path.slice(1).map((point,j)=><Beam key={`${i}:${j}`} a={path[j]} b={point} radius={.035} color={wire?'#215996':'#377d75'}/>))}
    <group position={[-3.35,.23,-2.8]}><mesh position={[0,-.02,0]}><boxGeometry args={[.9,.1,.4]}/><meshStandardMaterial color="#d8dfd4"/></mesh><group ref={lever} position={[-.3,.08,0]}><Beam a={[0,0,0]} b={[.6,0,0]} radius={.055} color="#c34430"/></group></group>
    {[-.8,.8].map((x,i)=><group key={x}>{[0,1].map(l=><Beam key={l} a={[x+.1,1.65+l*.45,-.3]} b={[x+2.2,1.65+l*.45,-.3]} radius={.014} color={wire?'#215996':'#5c716b'}/>)}</group>)}
  </>
}
function FitCamera({ revision, wire }: { revision:number; wire:boolean }) {
  const {camera,size}=useThree()
  useEffect(()=>{ if(camera instanceof T.OrthographicCamera){camera.zoom=Math.min(size.width/(wire?18:17),size.height/(wire?11:10));camera.updateProjectionMatrix()} },[camera,size.width,size.height,revision,wire])
  return null
}
export const GridScene = memo(function GridScene({ state, wire, onInteract, resetView }: { state: React.RefObject<SceneState>; wire:boolean; onInteract:()=>void; resetView:number }) {
  return <Canvas shadows dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'low-power'}}>
    <color attach="background" args={[wire?'#f0f5fc':'#e7ede5']}/>
    <OrthographicCamera key={`camera:${wire}:${resetView}`} makeDefault position={wire?[0,18,3]:[12,10,15]} zoom={50} near={.1} far={90}/>
    <FitCamera revision={resetView} wire={wire}/><ambientLight intensity={1.6}/><hemisphereLight args={['#ffffff','#a0aca3',1.2]}/>
    <directionalLight position={[-5,12,7]} intensity={3.2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-.001}/>
    <group position={[0,-.6,0]}>
      <mesh position={[0,-.1,0]} receiveShadow><boxGeometry args={[16,.2,9]}/><meshStandardMaterial color={wire?'#f8fbff':'#edf1e8'} roughness={1}/></mesh>
      {[[-5.4,0,-2.8],[-5.4,0,.1],[-5.4,0,3]].map((p,i)=><Generator key={i} position={p as V3} index={i} state={state} wire={wire}/>)}
      <Circuit state={state} wire={wire}/><Beam a={[.1,.23,-.3]} b={[.1,1.65,-.3]} color="#607e78"/><Beam a={[2.2,1.65,-.3]} b={[2.2,.23,-.3]} color="#607e78"/><Tower x={.1} z={-.3} wire={wire}/><Tower x={2.2} z={-.3} wire={wire}/><City state={state} wire={wire}/>
      {wire&&<gridHelper args={[16,32,'#a9bfdc','#dbe6f2']} position={[0,.015,0]}/>}
    </group>
    <OrbitControls key={`orbit:${wire}:${resetView}`} target={[0,.1,0]} minZoom={10} maxZoom={130} minPolarAngle={.1} maxPolarAngle={Math.PI*.47} enableDamping={false} onStart={onInteract}/>
  </Canvas>
})
