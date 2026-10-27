import { memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, OrbitControls, OrthographicCamera } from '@react-three/drei'
import * as T from 'three'
import { isWorldPaused } from '~/lib/world-playback'

type V3 = [number, number, number]
export interface SceneState { hz: number; tripped: boolean; shed: number; playing: boolean; reduced: boolean }

/** Dark workbench palette. Teal is the only signal colour (live current); red marks the trip and shed load. */
const C = {
  bg: '#07090b',
  slab: '#12171c', slabEdge: '#3b454e', grid: '#1b2329',
  plinth: '#1c2228', plinthEdge: '#323b43',
  casing: '#5a6672', casingTripped: '#262c32', rib: '#87939f', ribTripped: '#3a4249',
  bronze: '#c08a55', bronzeFin: '#d29f6a', shaft: '#a7b1bb',
  tower: '#8d99a5', insulator: '#cfd6dd',
  current: '#4fd8c4', currentCore: '#d6fff8', dead: '#2c3439',
  alert: '#ff5a44',
  building: '#7d8794', buildingHigh: '#9aa4b0', window: '#ffc874', blackout: '#171c21',
  // Blueprint (工程图) keeps the same dark ground; only the drawing turns to steel-blue line work.
  wire: '#7fa6d4', wireDim: '#4e6f97', wireSlab: '#0a1017', wireGrid: '#16263a',
}

function useBeam(a: V3, b: V3) {
  return useMemo(() => {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), direction = bv.clone().sub(av)
    return { length: direction.length(), position: av.add(bv).multiplyScalar(.5), quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()) }
  }, [a.join(','), b.join(',')])
}
function Beam({ a, b, radius = .025, color = C.tower, wire = false }: { a: V3; b: V3; radius?: number; color?: string; wire?: boolean }) {
  const { length, position, quaternion } = useBeam(a, b)
  return <mesh position={position} quaternion={quaternion} castShadow><cylinderGeometry args={[radius, radius, length, 6]}/><meshStandardMaterial color={color} roughness={.6} metalness={.25} wireframe={wire}/></mesh>
}
/** A conductor that glows on the dark ground: an unlit core plus a soft additive halo. Dims when it carries nothing. */
function Conductor({ a, b, radius = .035, live }: { a: V3; b: V3; radius?: number; live: () => boolean }) {
  const { length, position, quaternion } = useBeam(a, b)
  const core = useRef<T.MeshBasicMaterial>(null), halo = useRef<T.MeshBasicMaterial>(null)
  useFrame(() => {
    const on = live()
    core.current?.color.set(on ? C.current : C.dead)
    if (halo.current) halo.current.opacity = on ? .2 : 0
  })
  return <group position={position} quaternion={quaternion}>
    <mesh><cylinderGeometry args={[radius, radius, length, 8]}/><meshBasicMaterial ref={core} color={C.current} toneMapped={false}/></mesh>
    <mesh><cylinderGeometry args={[radius * 3.2, radius * 3.2, length, 10, 1, true]}/><meshBasicMaterial ref={halo} color={C.current} transparent opacity={.2} blending={T.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  </group>
}
function Tower({ x, z, wire }: { x: number; z: number; wire: boolean }) {
  const c = wire ? C.wire : C.tower
  return <group position={[x, .12, z]}>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <group key={`${sx}:${sz}`}>
      <Beam a={[sx*.44, 0, sz*.32]} b={[sx*.16, 2.35, sz*.13]} color={c}/>
      {[0, .65, 1.3].map((y, i) => <Beam key={y} a={[sx*(.44-i*.08), y, sz*(.32-i*.06)]} b={[-sx*(.36-i*.08), y+.65, sz*(.26-i*.06)]} radius={.014} color={c}/>)}
    </group>))}
    {[1.65,2.1].map(y => <group key={y}><Beam a={[-.9, y, 0]} b={[.9, y, 0]} radius={.035} color={c}/>{[-.8,.8].map(xi => <mesh key={xi} position={[xi,y-.12,0]}><cylinderGeometry args={[.055,.055,.24,8]}/><meshStandardMaterial color={wire ? C.wire : C.insulator} roughness={.4} wireframe={wire}/></mesh>)}</group>)}
  </group>
}
function Plinth({ position, size, wire }: { position: V3; size: V3; wire: boolean }) {
  return <mesh position={position} receiveShadow castShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial color={wire ? C.wireDim : C.plinth} roughness={.95} wireframe={wire}/>
    {!wire && <Edges color={C.plinthEdge}/>}
  </mesh>
}
function Generator({ position, index, state, wire }: { position: V3; index: number; state: React.RefObject<SceneState>; wire: boolean }) {
  const rotor = useRef<T.Group>(null), caseMaterial = useRef<T.MeshStandardMaterial>(null)
  const ribMaterial = useMemo(() => new T.MeshStandardMaterial({ roughness: .45, metalness: .4 }), [])
  useEffect(() => () => ribMaterial.dispose(), [ribMaterial])
  useEffect(() => { ribMaterial.wireframe = wire; ribMaterial.needsUpdate = true }, [ribMaterial, wire])
  useFrame((_, dt) => {
    const s = state.current
    const tripped = index === 0 && s.tripped
    if (rotor.current && s.playing && !s.reduced && !isWorldPaused()) rotor.current.rotation.z += Math.min(dt,.05) * (tripped ? .15 : s.hz / 50 * 1.5)
    caseMaterial.current?.color.set(wire ? (tripped ? C.wireDim : C.wire) : tripped ? C.casingTripped : C.casing)
    ribMaterial.color.set(wire ? C.wireDim : tripped ? C.ribTripped : C.rib)
  })
  return <group position={position}>
    <Plinth position={[0,.12,0]} size={[1.65,.24,2.35]} wire={wire}/>
    <mesh position={[0,.72,-.22]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.65,.65,1.55,40,1,true,0,Math.PI*1.35]}/><meshStandardMaterial ref={caseMaterial} color={C.casing} side={T.DoubleSide} roughness={.5} metalness={.35} wireframe={wire}/></mesh>
    {[-.85,-.66,-.47,-.28,-.09,.1,.29].map(z => <mesh key={z} position={[0,.72,z]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.65,.022,5,40,Math.PI*1.35]}/><primitive object={ribMaterial} attach="material"/></mesh>)}
    <group position={[0,.72,0]} ref={rotor}>
      <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.33,.33,1.9,24]}/><meshStandardMaterial color={wire ? C.wire : C.bronze} emissive={wire ? '#000' : '#3a2410'} metalness={.45} roughness={.38} wireframe={wire}/></mesh>
      {Array.from({length:8},(_,i) => <mesh key={i} position={[Math.cos(i*Math.PI/4)*.36,Math.sin(i*Math.PI/4)*.36,0]} rotation={[0,0,i*Math.PI/4]} castShadow><boxGeometry args={[.12,.16,1.55]}/><meshStandardMaterial color={wire ? C.wireDim : C.bronzeFin} emissive={wire ? '#000' : '#3a2410'} metalness={.4} roughness={.42} wireframe={wire}/></mesh>)}
      <mesh position={[0,0,.95]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.11,.11,.5,16]}/><meshStandardMaterial color={wire ? C.wire : C.shaft} metalness={.6} roughness={.3} wireframe={wire}/></mesh>
    </group>
    <mesh position={[.65,.85,-.85]} castShadow><boxGeometry args={[.18,.5,.32]}/><meshStandardMaterial color={index===0 ? C.alert : C.current} emissive={index===0 ? C.alert : C.current} emissiveIntensity={.55} roughness={.5} wireframe={wire}/></mesh>
  </group>
}
function City({ state, wire }: { state: React.RefObject<SceneState>; wire: boolean }) {
  const disconnected = useRef<T.Group>(null)
  const buildings = useMemo(() => Array.from({length:20},(_,i) => ({x:3.7+(i%5)*.6,z:-1.4+Math.floor(i/5)*.6,h:.35+((i*7)%11)*.08})),[])
  useFrame(() => { if(disconnected.current) disconnected.current.children.forEach((child,i)=>{child.visible=i<Math.round(state.current.shed/500)}) })
  return <group>
    <Plinth position={[5,.12,-.65]} size={[4,.24,3.35]} wire={wire}/>
    {buildings.map((b,i) => <group key={i}>
      <mesh position={[b.x,b.h/2+.25,b.z]} castShadow receiveShadow><boxGeometry args={[.34,b.h,.44]}/><meshStandardMaterial color={wire ? C.wireDim : i%3===0 ? C.buildingHigh : C.building} roughness={.92} wireframe={wire}/></mesh>
      {[0,1].map(j=><mesh key={j} position={[b.x-.09+j*.18,b.h*.55+.25,b.z+.225]}><planeGeometry args={[.075,.12]}/><meshBasicMaterial color={wire ? C.wire : C.window} toneMapped={false}/></mesh>)}
    </group>)}
    <group ref={disconnected}>
      {buildings.slice(-3).map((b,i)=><group key={i}><mesh position={[b.x,b.h/2+.26,b.z]}><boxGeometry args={[.36,b.h+.02,.46]}/><meshStandardMaterial color={C.blackout} roughness={1}/></mesh><mesh position={[b.x,.26,b.z]}><boxGeometry args={[.44,.04,.54]}/><meshBasicMaterial color={C.alert} toneMapped={false}/></mesh></group>)}
    </group>
  </group>
}

/** Feeders, in the direction power flows. `gen0` feeders go dark when that unit trips. */
const FEEDERS: { path: V3[]; gen0?: boolean; radius?: number }[] = [
  { path: [[-5,.23,-2.8],[-3.65,.23,-2.8]], gen0: true },
  { path: [[-3.05,.23,-2.8],[-2.5,.23,-2.8],[-2.5,.23,-.3]], gen0: true },
  { path: [[-5,.23,.1],[-2.5,.23,.1],[-2.5,.23,-.3]] },
  { path: [[-5,.23,3],[-2.5,.23,3],[-2.5,.23,-.3]] },
  { path: [[-2.5,.23,-.3],[.1,.23,-.3],[.1,1.65,-.3]] },
  ...[-.8,.8].flatMap(x => [0,1].map(l => ({ path: [[x+.1,1.65+l*.45,-.3],[x+2.2,1.65+l*.45,-.3]] as V3[], radius: .016 }))),
  { path: [[2.2,1.65,-.3],[2.2,.23,-.3],[3.2,.23,-.3],[3.2,.23,1.1],[5,.23,1.1]] },
]
const PULSE_SPACING = .62
/** Small bright pulses travelling along the live feeders. Speed follows frequency; they stop when the world is paused. */
function CurrentFlow({ state }: { state: React.RefObject<SceneState> }) {
  const mesh = useRef<T.InstancedMesh>(null), phase = useRef(0)
  const pulses = useMemo(() => FEEDERS.flatMap(feeder => {
    const points = feeder.path.map(p => new T.Vector3(...p))
    const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]))
    const total = lengths.reduce((a, b) => a + b, 0)
    return Array.from({ length: Math.max(1, Math.round(total / PULSE_SPACING)) }, (_, k) => ({ points, lengths, total, offset: k * total / Math.max(1, Math.round(total / PULSE_SPACING)), gen0: !!feeder.gen0 }))
  }), [])
  const matrix = useMemo(() => new T.Matrix4(), []), at = useMemo(() => new T.Vector3(), []), scale = useMemo(() => new T.Vector3(), []), still = useMemo(() => new T.Quaternion(), [])
  useFrame((_, dt) => {
    const s = state.current, node = mesh.current
    if (!node) return
    if (s.playing && !s.reduced && !isWorldPaused()) phase.current += Math.min(dt, .05) * .9 * s.hz / 50
    pulses.forEach((p, i) => {
      let d = (p.offset + phase.current) % p.total, seg = 0
      while (seg < p.lengths.length - 1 && d > p.lengths[seg]) { d -= p.lengths[seg]; seg++ }
      at.copy(p.points[seg]).lerp(p.points[seg + 1], Math.min(1, d / p.lengths[seg]))
      scale.setScalar(p.gen0 && s.tripped ? 0 : 1)
      node.setMatrixAt(i, matrix.compose(at, still, scale))
    })
    node.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, pulses.length]} frustumCulled={false}>
    <sphereGeometry args={[.06, 10, 8]}/>
    <meshBasicMaterial color={C.currentCore} toneMapped={false}/>
  </instancedMesh>
}
function Circuit({ state, wire }: { state: React.RefObject<SceneState>; wire:boolean }) {
  const lever = useRef<T.Group>(null)
  useFrame(()=>{if(lever.current)lever.current.rotation.y=state.current.tripped?-.8:0})
  const live = (gen0?: boolean) => () => !(gen0 && state.current.tripped)
  return <>
    {FEEDERS.map((feeder,i)=>feeder.path.slice(1).map((point,j)=><Conductor key={`${i}:${j}`} a={feeder.path[j]} b={point} radius={feeder.radius} live={live(feeder.gen0)}/>))}
    {!wire && <CurrentFlow state={state}/>}
    <group position={[-3.35,.23,-2.8]}>
      <mesh position={[0,-.02,0]}><boxGeometry args={[.9,.1,.4]}/><meshStandardMaterial color={wire ? C.wireSlab : '#2a3239'} roughness={.8} wireframe={wire}/>{!wire && <Edges color={C.plinthEdge}/>}</mesh>
      <group ref={lever} position={[-.3,.08,0]}><mesh position={[.3,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.055,.055,.6,8]}/><meshStandardMaterial color={C.alert} emissive={C.alert} emissiveIntensity={.6}/></mesh></group>
    </group>
  </>
}
/** Faint grid clipped to the slab, so nothing hangs past its edge. */
function SlabGrid({ wire }: { wire: boolean }) {
  const geometry = useMemo(() => {
    const v: number[] = [], step = .5
    for (let x = -8; x <= 8 + 1e-6; x += step) v.push(x, 0, -4.5, x, 0, 4.5)
    for (let z = -4.5; z <= 4.5 + 1e-6; z += step) v.push(-8, 0, z, 8, 0, z)
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); return g
  }, [])
  return <lineSegments geometry={geometry} position={[0,.004,0]}><lineBasicMaterial color={wire ? C.wireGrid : C.grid}/></lineSegments>
}
function FitCamera({ revision, wire }: { revision:number; wire:boolean }) {
  const {camera,size}=useThree()
  useEffect(()=>{ if(camera instanceof T.OrthographicCamera){camera.zoom=Math.min(size.width/(wire?18:17),size.height/(wire?11:10));camera.updateProjectionMatrix()} },[camera,size.width,size.height,revision,wire])
  return null
}
export const GridScene = memo(function GridScene({ state, wire, onInteract, resetView }: { state: React.RefObject<SceneState>; wire:boolean; onInteract:()=>void; resetView:number }) {
  return <Canvas shadows dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'low-power'}}>
    <color attach="background" args={[C.bg]}/>
    <OrthographicCamera key={`camera:${wire}:${resetView}`} makeDefault position={wire?[0,18,3]:[12,10,15]} zoom={50} near={.1} far={90}/>
    <FitCamera revision={resetView} wire={wire}/>
    <ambientLight intensity={.35}/>
    <hemisphereLight args={['#c9d5e2','#07090b',.7]}/>
    <directionalLight position={[-5,12,7]} intensity={2.6} color="#fff3e2" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-.001}/>
    <directionalLight position={[9,5,-11]} intensity={1.8} color="#9fc6ff"/>
    <group position={[0,-.6,0]}>
      <mesh position={[0,-.1,0]} receiveShadow>
        <boxGeometry args={[16,.2,9]}/>
        <meshStandardMaterial color={wire ? C.wireSlab : C.slab} roughness={1}/>
        <Edges color={wire ? C.wireGrid : C.slabEdge}/>
      </mesh>
      <SlabGrid wire={wire}/>
      {[[-5.4,0,-2.8],[-5.4,0,.1],[-5.4,0,3]].map((p,i)=><Generator key={i} position={p as V3} index={i} state={state} wire={wire}/>)}
      <Circuit state={state} wire={wire}/>
      <Tower x={.1} z={-.3} wire={wire}/><Tower x={2.2} z={-.3} wire={wire}/><City state={state} wire={wire}/>
    </group>
    <OrbitControls key={`orbit:${wire}:${resetView}`} target={[0,.1,0]} minZoom={10} maxZoom={130} minPolarAngle={.1} maxPolarAngle={Math.PI*.47} enableDamping={false} onStart={onInteract}/>
  </Canvas>
})
