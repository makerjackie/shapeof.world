import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Line, OrbitControls } from '@react-three/drei'
import * as T from 'three'
import { isWorldPaused } from '~/lib/world-playback'
import { bladeGeometry, CORE_PROFILE, NACELLE_PROFILE, shellGeometry } from './geometry'
import { type EngineView, type PartId } from './content'
import { engineFrame } from './framing'
import type { engineCycle } from './model'

type Cycle = ReturnType<typeof engineCycle>
type Clock = RefObject<number>

function Ring({ x, radius, width = .07, color = '#7c8e9c', arc = Math.PI * 2 }: { x: number; radius: number; width?: number; color?: string; arc?: number }) {
  return <mesh position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
    <torusGeometry args={[radius, width, 8, 80, arc]} />
    <meshStandardMaterial color={color} metalness={.78} roughness={.3} />
  </mesh>
}

function Shaft({ x, length, radius, color }: { x: number; length: number; radius: number; color: string }) {
  return <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[radius, radius, length, 48]} /><meshStandardMaterial color={color} metalness={.8} roughness={.28} /></mesh>
}

function BladeRow({ x, root, tip, count, chord, phase, clock, rpm = 0, slowdown, color, stator = false, selected = false }: {
  x: number; root: number; tip: number; count: number; chord: number; phase: number; clock: Clock
  rpm?: number; slowdown: number; color: string; stator?: boolean; selected?: boolean
}) {
  const ref = useRef<T.Group>(null)
  const blades = useRef<T.InstancedMesh>(null)
  const geometry = useMemo(() => bladeGeometry(root, tip, chord, stator ? -.6 : .7, chord * .22), [root, tip, chord, stator])
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    const object = new T.Object3D()
    for (let i = 0; i < count; i++) {
      object.rotation.x = i / count * Math.PI * 2
      object.updateMatrix()
      blades.current?.setMatrixAt(i, object.matrix)
    }
    if (blades.current) blades.current.instanceMatrix.needsUpdate = true
  }, [count, geometry])
  useFrame(() => { if (ref.current) ref.current.rotation.x = phase + (stator ? 0 : clock.current * rpm * Math.PI / 30 / slowdown) })
  return <group position={[x, 0, 0]} ref={ref}>
    <instancedMesh ref={blades} args={[geometry, undefined, count]} castShadow>
      <meshStandardMaterial color={selected ? '#e4d4af' : color} metalness={.8} roughness={stator ? .38 : .26} side={T.DoubleSide} />
    </instancedMesh>
    <Shaft x={0} length={chord * .65} radius={root} color={stator ? '#495460' : '#85939c'} />
  </group>
}

function Bolts({ x, radius, count = 20 }: { x: number; radius: number; count?: number }) {
  return <group>{Array.from({ length: count }, (_, i) => {
    const a = i / count * Math.PI * 2
    return <mesh key={i} position={[x, Math.cos(a) * radius, Math.sin(a) * radius]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.025, .025, .05, 6]} /><meshStandardMaterial color="#bec8cb" metalness={.85} roughness={.27} /></mesh>
  })}</group>
}

function Burner({ selected }: { selected: boolean }) {
  const liner = useMemo(() => shellGeometry([[-.35, .75], [.9, .8], [1.2, .66], [1.2, .62], [.9, .76], [-.35, .71], [-.35, .75]]), [])
  useEffect(() => () => liner.dispose(), [liner])
  return <group>
    <mesh geometry={liner} rotation={[0, 0, -Math.PI / 2]}><meshStandardMaterial color="#b4a18b" metalness={.73} roughness={.32} side={T.DoubleSide} /></mesh>
    {Array.from({ length: 18 }, (_, i) => {
      const a = i / 18 * Math.PI * 2, y = Math.cos(a) * .52, z = Math.sin(a) * .52
      return <group key={i}>
        <mesh position={[-.26, y, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.045, .065, .32, 10]} /><meshStandardMaterial color="#cdad77" metalness={.8} roughness={.3} /></mesh>
        <mesh position={[.22, y, z]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[.12, .72, 12, 1, true]} /><meshBasicMaterial color={selected ? '#ffc174' : '#d5884c'} transparent opacity={.22} depthWrite={false} side={T.DoubleSide} /></mesh>
      </group>
    })}
    {[0, .22, .44, .66, .88].map(x => <Ring key={x} x={x} radius={.785} width={.012} color="#6f615b" arc={Math.PI * 1.4} />)}
  </group>
}

function CutEdges({ profile }: { profile: readonly (readonly [number, number])[] }) {
 return <>{[-.29,.29].map(side => { const a=side*Math.PI; return <Line key={side} points={profile.map(([x,r])=>[x,-r*Math.sin(a),r*Math.cos(a)] as [number,number,number])} color="#cabba0" lineWidth={1.1} transparent opacity={.72} /> })}</>
}

function Assembly({ cycle, clock, slowdown, view, explode, selected, onSelect, compressorStage, onCompressorStage }: { cycle: Cycle; clock: Clock; slowdown: number; view: EngineView; explode: number; selected: PartId | null; onSelect: (id: PartId) => void; compressorStage: number; onCompressorStage: (i: number) => void }) {
  const cutaway = view !== 'assembled' && view !== 'front'
  const nacelle = useMemo(() => shellGeometry(NACELLE_PROFILE, cutaway), [cutaway])
  const core = useMemo(() => shellGeometry(CORE_PROFILE, cutaway), [cutaway])
  useEffect(() => () => { nacelle.dispose(); core.dispose() }, [nacelle, core])
  const shaftMode = view === 'shafts'
  const coreOpacity = shaftMode ? .08 : 1
  return <>
    <group position={[0, explode * 2.4, -explode * .6]}>
      <mesh geometry={nacelle} rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow><meshPhysicalMaterial color="#9aadb8" metalness={.45} roughness={.4} envMapIntensity={1.6} emissive="#17242c" emissiveIntensity={.12} transparent={shaftMode} opacity={shaftMode ? .04 : 1} side={T.DoubleSide} depthWrite={false} /></mesh>
      {cutaway && !shaftMode && <CutEdges profile={NACELLE_PROFILE} />}
      {!shaftMode && <>
        <Ring x={-5.12} radius={2.12} width={.045} color="#dce0dd" />
        <Ring x={-3.7} radius={2.35} width={.025} color="#8495a3" arc={cutaway ? Math.PI * 1.4 : Math.PI * 2} />
        <Ring x={2.48} radius={1.27} width={.025} color="#aebac0" arc={cutaway ? Math.PI * 1.4 : Math.PI * 2} />
      </>}
    </group>
    <group position={[0, -explode * 1.7, 0]}>
      <mesh geometry={core} rotation={[0, 0, -Math.PI / 2]} castShadow><meshStandardMaterial color="#7c919f" metalness={.5} roughness={.42} envMapIntensity={1.5} emissive="#15222b" emissiveIntensity={.1} transparent={shaftMode} opacity={coreOpacity} side={T.DoubleSide} depthWrite={!shaftMode} /></mesh>
      {cutaway && !shaftMode && <CutEdges profile={CORE_PROFILE} />}
      {[-3.3, -.5, 1.45, 3.65].map(x => <group key={x}><Ring x={x} radius={x === 3.65 ? .9 : .9} width={.045} arc={cutaway ? Math.PI * 1.4 : Math.PI * 2} /><Bolts x={x} radius={.91} /></group>)}
    </group>
    <Shaft x={-.05} length={8.15 + explode * 3} radius={.115} color="#79bcc6" />
    <Shaft x={.05} length={4.15} radius={.17} color="#d4b16d" />
    <group position={[-explode * 2, 0, 0]} onClick={e => { e.stopPropagation(); onSelect('fan') }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <BladeRow x={-4.24} root={.36} tip={2.05} count={22} chord={.82} phase={0} clock={clock} rpm={cycle.lowRpm} slowdown={slowdown} color="#a4b6c2" selected={selected === 'fan'} />
      <mesh position={[-4.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[.36, .95, 64]} /><meshStandardMaterial color="#d5d8d3" metalness={.75} roughness={.24} /></mesh>
      <BladeRow x={-3.65} root={.8} tip={2.05} count={28} chord={.4} phase={.1} clock={clock} slowdown={slowdown} stator color="#667888" />
    </group>
    <group position={[-explode * .7, 0, explode * .35]} onClick={e => { e.stopPropagation(); onSelect('compressor') }}>
      {Array.from({ length: 9 }, (_, i) => <group key={i} onClick={e => { e.stopPropagation(); onCompressorStage(i) }}>
        <BladeRow x={-3.04 + i * .285} root={.38 + i * .023} tip={.87 - i * .012} count={30 + i * 2} chord={.22} phase={i * .07} clock={clock} rpm={cycle.highRpm} slowdown={slowdown} color={i < 3 ? '#93a8b5' : '#b3b0a5'} selected={selected === 'compressor' && compressorStage === i} />
        <BladeRow x={-2.9 + i * .285} root={.4 + i * .023} tip={.86 - i * .012} count={34 + i * 2} chord={.16} phase={i * .09} clock={clock} slowdown={slowdown} stator color="#687582" />
      </group>)}
    </group>
    <group position={[explode * .4, explode * .45, explode * .35]} onClick={e => { e.stopPropagation(); onSelect('combustor') }}><Burner selected={selected === 'combustor'} /></group>
    <group position={[explode * 1.2, 0, 0]} onClick={e => { e.stopPropagation(); onSelect('turbine') }}>
      {[0, 1].map(i => <group key={i}>
        <BladeRow x={1.38 + i * .28} root={.34} tip={.8} count={42} chord={.22} phase={i * .07} clock={clock} rpm={cycle.highRpm} slowdown={slowdown} color="#c3aa8b" selected={selected === 'turbine'} />
        <BladeRow x={1.25 + i * .28} root={.35} tip={.8} count={40} chord={.16} phase={.02} clock={clock} slowdown={slowdown} stator color="#8d817c" />
      </group>)}
      {[0, 1, 2, 3].map(i => <group key={i}>
        <BladeRow x={2.12 + i * .35} root={.32} tip={.82 + i * .02} count={46} chord={.27} phase={i * .07} clock={clock} rpm={cycle.lowRpm} slowdown={slowdown} color="#9a9d9f" selected={selected === 'turbine'} />
        <BladeRow x={1.98 + i * .35} root={.33} tip={.82 + i * .02} count={44} chord={.17} phase={i * .1} clock={clock} slowdown={slowdown} stator color="#6d737a" />
      </group>)}
    </group>
    <group position={[explode * 2.2, 0, 0]} onClick={e => { e.stopPropagation(); onSelect('nozzle') }}>
      <mesh position={[4.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[.31, 1.6, 48]} /><meshStandardMaterial color="#6a7380" metalness={.8} roughness={.32} /></mesh>
      <Ring x={4.45} radius={.67} width={.035} color="#a2a7a9" />
    </group>
    {!shaftMode && <>
      {[-1, 1].map(side => <group key={side} position={[-.5, side * .95, -.35]}>
        <mesh><boxGeometry args={[1.6, .24, .7]} /><meshStandardMaterial color="#4d5a66" metalness={.68} roughness={.4} /></mesh>
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[-.6 + i * .3, 0, .4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.08, .08, .18, 12]} /><meshStandardMaterial color="#c2a777" metalness={.7} roughness={.35} /></mesh>)}
      </group>)}
      <mesh position={[1.25, 1.2, -.7]} rotation={[0, 0, .18]}><boxGeometry args={[2.2, .18, .7]} /><meshStandardMaterial color="#a5adb3" metalness={.75} roughness={.33} /></mesh>
    </>}
  </>
}

function Airflow({ clock, cycle, enabled, thermal }: { clock: Clock; cycle: Cycle; enabled: boolean; thermal: boolean }) {
  const ref = useRef<T.InstancedMesh>(null)
  const dummy = useMemo(() => new T.Object3D(), [])
  const color = useMemo(() => new T.Color(), [])
  const hot = useMemo(() => new T.Color('#f2a56b'), [])
  const cold = useMemo(() => new T.Color('#77bfd1'), [])
  useFrame(() => {
    if (!ref.current || !enabled) return
    const count = 420, coreCount = Math.max(25, Math.round(count / (1 + cycle.bypassFlow / cycle.coreFlow)))
    for (let i = 0; i < count; i++) {
      const core = i < coreCount
      const phase = (clock.current * (core ? .11 : .14) + i * .618033) % 1
      const x = -6.2 + phase * 13
      const theta = i * 2.399963
      const r = core ? .47 + .11 * Math.sin(i * 17) : 1.16 + .72 * ((i * .7123) % 1)
      const bypassTaper = x < -3.5 ? 1 : 1 - Math.min(1, (x + 3.5) / 6) * .26
      dummy.position.set(x, Math.cos(theta) * r * (core ? 1 : bypassTaper), Math.sin(theta) * r * (core ? 1 : bypassTaper))
      dummy.scale.set(core ? .075 : .095, .014, .014)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      const heat = core ? Math.max(0, Math.min(1, (x + 3.5) / 4)) * (x > 1 ? Math.max(.2, 1 - (x - 1) / 8) : 1) : .02
      color.copy(cold).lerp(hot, thermal ? heat : core ? 1 : 0)
      ref.current.setColorAt(i, color)
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })
  return enabled ? <instancedMesh ref={ref} args={[undefined, undefined, 420]} frustumCulled={false}><sphereGeometry args={[1, 5, 4]} /><meshBasicMaterial transparent opacity={.8} toneMapped={false} /></instancedMesh> : null
}

function CameraRig({ view, selected, explode, compressorStage, reset, onInteraction }: { view: EngineView; selected: PartId | null; explode: number; compressorStage: number; reset: number; onInteraction: () => void }) {
 const { camera, size } = useThree()
 const orbit = useRef<React.ComponentRef<typeof OrbitControls>>(null)
 const pose = useRef<ReturnType<typeof engineFrame> | null>(null)
 const transitioning=useRef(false), initialized=useRef(false)
 useLayoutEffect(() => {
  const next=engineFrame(view,explode,selected,compressorStage,size.width/Math.max(1,size.height))
  pose.current=next
  if(!initialized.current||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(next.position);orbit.current?.target.copy(next.target);orbit.current?.update();initialized.current=true;transitioning.current=false}
  else transitioning.current=true
 },[camera,view,selected,explode,compressorStage,reset,size.width,size.height])
 useFrame((_,dt)=>{
  const next=pose.current, controls=orbit.current
  if(!transitioning.current||!next||!controls)return
  const mix=1-Math.exp(-Math.min(dt,.05)*9)
  camera.position.lerp(next.position,mix);controls.target.lerp(next.target,mix)
  if(camera.position.distanceToSquared(next.position)<.00001&&controls.target.distanceToSquared(next.target)<.00001)transitioning.current=false
  controls.update()
 },-2)
 return <OrbitControls ref={orbit} minDistance={1.3} maxDistance={80} enableDamping dampingFactor={.08} onStart={()=>{transitioning.current=false;onInteraction()}} maxPolarAngle={Math.PI*.85}/>
}

function World({ cycle, playing, slowdown, view, explode, selected, streams, thermal, reset, onSelect, onInteraction, compressorStage, onCompressorStage }: SceneProps) {
  const clock = useRef(0)
  useFrame((_, dt) => { if (playing && !document.hidden && !isWorldPaused()) clock.current += Math.min(dt, .05) })
  return <>
    <CameraRig view={view} selected={selected} explode={explode} compressorStage={compressorStage} reset={reset} onInteraction={onInteraction} />
    <ambientLight intensity={.5} />
    <pointLight position={[0,1,6]} intensity={22} distance={25} decay={2} color="#e2e8e8" />
    <directionalLight position={[-3, 8, 5]} intensity={3.8} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.0006} />
    <directionalLight position={[6, 2, -6]} intensity={3} color="#b4d3ef" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={3} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 5, 1]} />
      <Lightformer form="rect" intensity={2} position={[-4, 1, -5]} rotation={[0, 0, 0]} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#aacbdf" position={[4, 0, 5]} rotation={[0, Math.PI, 0]} scale={[8, 4, 1]} />
    </Environment>
    <Assembly cycle={cycle} clock={clock} slowdown={slowdown} view={view} explode={explode} selected={selected} onSelect={onSelect} compressorStage={compressorStage} onCompressorStage={onCompressorStage} />
    <Airflow clock={clock} cycle={cycle} enabled={streams && explode < .1 && view !== 'shafts'} thermal={thermal} />
    <mesh position={[0, -2.65 - explode * 1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 80]} /><meshBasicMaterial color="#10161d" toneMapped={false} /></mesh>
    <mesh position={[0, -2.645 - explode * 1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 80]} /><shadowMaterial opacity={.25} /></mesh>
    <gridHelper args={[30, 60, '#34434f', '#25343f']} position={[0, -2.64 - explode * 1.3, 0]} material-transparent material-opacity={.1} />
  </>
}

type SceneProps = {
  cycle: Cycle; playing: boolean; slowdown: number; view: EngineView; explode: number
  selected: PartId | null; streams: boolean; thermal: boolean; reset: number
  onSelect: (id: PartId) => void; onInteraction: () => void
  compressorStage: number; onCompressorStage: (i: number) => void
}

export function EngineScene(props: SceneProps) {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [-6, 4, 11], fov: 38, near: .05, far: 150 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerMissed={props.onInteraction}>
    <color attach="background" args={['#10161d']} />
    <fog attach="fog" args={['#10161d', 27, 65]} />
    <World {...props} />
  </Canvas>
}
