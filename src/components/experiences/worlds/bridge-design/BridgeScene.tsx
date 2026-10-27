import { memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { DECK, type BridgeKind, type Member, type Point, type bridgeResponse } from './model'
import { COMPRESSION, PALETTE, TENSION } from './palette'

type Response = ReturnType<typeof bridgeResponse>
const UP = new T.Vector3(0, 1, 0)
const forceRadius = (force: number) => .18 + .8 * Math.sqrt(Math.abs(force) / 1700)
const FORCE_PLANE = 6.3

function Rod({ a, b, radius, color, opacity = 1, glow = 0 }: { a: Point; b: Point; radius: number; color: string; opacity?: number; glow?: number }) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b)
  const direction = end.sub(start)
  const q = new T.Quaternion().setFromUnitVectors(UP, direction.clone().normalize())
  return <mesh position={start.addScaledVector(direction, .5)} quaternion={q} scale={[radius, direction.length(), radius]} castShadow>
    <cylinderGeometry args={[1, 1, 1, 8]} />
    <meshStandardMaterial color={color} roughness={glow ? .5 : .88} emissive={color} emissiveIntensity={glow} transparent={opacity < 1} opacity={opacity} />
  </mesh>
}

function Block({ at, size, color = PALETTE.plaster }: { at: Point; size: Point; color?: string }) {
  return <mesh position={at} receiveShadow castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.92} /></mesh>
}

function Flow({ members, playing, phase }: { members: Member[]; playing: boolean; phase: React.MutableRefObject<number> }) {
  const ref = useRef<T.InstancedMesh>(null)
  const dummy = useMemo(() => new T.Object3D(), [])
  useFrame((_, dt) => {
    if (!ref.current) return
    if (playing && !document.hidden && !isWorldPaused()) phase.current += Math.min(dt, .05) * .4
    members.forEach((m, i) => {
      let t = (phase.current + i * .271) % 1
      if (m.reverse) t = 1 - t
      dummy.position.set(...m.a).lerp(new T.Vector3(...m.b), t)
      dummy.position.z += forceRadius(m.force) + .15
      dummy.scale.setScalar(.48)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, members.length]} frustumCulled={false}>
    <sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#fffaf0" />
  </instancedMesh>
}

function ForceMembers({ response, visible, playing, focus }: { response: Response; visible: boolean; playing: boolean; focus: Member['family'][] | null }) {
  const phase = useRef(0)
  const colored = response.members.map(m => ({ ...m, a: [m.a[0], m.a[1], FORCE_PLANE] as Point, b: [m.b[0], m.b[1], FORCE_PLANE] as Point }))
  return <group visible={visible}>
    {colored.map(m => { const dim = !!focus && !focus.includes(m.family); return <Rod key={m.id} a={m.a} b={m.b} color={dim ? PALETTE.dim : m.force < 0 ? COMPRESSION : TENSION} glow={dim ? 0 : .32} radius={forceRadius(m.force)} /> })}
    <Flow members={focus ? colored.filter(m => focus.includes(m.family)) : colored} playing={playing} phase={phase} />
  </group>
}

function Arrow({ at, direction, color, size = 1 }: { at: Point; direction: Point; color: string; size?: number }) {
  const q = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(...direction).normalize())
  return <group position={at} quaternion={q} scale={size}>
    <mesh position={[0, 3, 0]}><cylinderGeometry args={[.27, .27, 6, 8]} /><meshBasicMaterial color={color} /></mesh>
    <mesh position={[0, 7, 0]}><coneGeometry args={[1.1, 3, 12]} /><meshBasicMaterial color={color} /></mesh>
  </group>
}

function Truck({ position }: { position: number }) {
  return <group position={[-60 + position * 120, DECK + 1.3, 0]}>
    <Block at={[-1.5, 2.25, 0]} size={[6.6, 3.6, 3.1]} color={PALETTE.truck} />
    <Block at={[3, 1.65, 0]} size={[2.3, 2.8, 3]} color={PALETTE.truck} />
    <Block at={[3.5, 2.4, 1.54]} size={[1.3, 1, .06]} color="#22313a" />
    <Block at={[4.19, 2.4, 0]} size={[.06, 1, 2.4]} color="#22313a" />
    {[-3.5, -.5, 3].flatMap(x => [-1.55, 1.55].map(z => <mesh key={`${x}-${z}`} position={[x, .5, z]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[.8, .8, .5, 12]} /><meshStandardMaterial color="#15191e" /></mesh>))}
  </group>
}

function Label({ at, text, tone, onClick }: { at: Point; text: string; tone: string; onClick: () => void }) {
  return <Html position={at} center zIndexRange={[8, 1]}><button className={`bd-pin bd-pin-${tone}`} aria-label={text} onClick={onClick}>{text}</button></Html>
}

function Camera({ view, reset }: { view: string; reset: number }) {
  const { camera, size } = useThree()
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => {
    camera.position.set(view === 'section' ? 0 : 120, view === 'section' ? 20 : 100, view === 'section' ? 230 : 185)
    camera.lookAt(0, 20, 0)
    if (camera instanceof T.OrthographicCamera) {
      camera.zoom = Math.min(size.width / 235, size.height / 125)
      camera.updateProjectionMatrix()
    }
    ref.current?.target.set(0, 20, 0)
    ref.current?.update()
  }, [camera, size.width, size.height, view, reset])
  return <OrbitControls ref={ref} target={[0, 20, 0]} enablePan={false} enableDamping={false} minZoom={1} maxZoom={18} maxPolarAngle={Math.PI * .49} minPolarAngle={.08} />
}

const Structure = memo(function Structure({ kind, response }: { kind: BridgeKind; response: Response }) {
  const { plaster, plasterLow, bank, bankStep } = PALETTE
  return <>
    <Block at={[0, DECK - .6, 0]} size={[120, 1.2, 8.6]} />
    {[-1, 1].map(side => <group key={side}>
      <Block at={[side * 80, DECK - .6, 0]} size={[40, 1.2, 8.6]} />
      <Block at={[side * 85, 8, -14]} size={[50, 30, 27]} color={bank} />
      {[0, 1, 2].map(i => <Block key={i} at={[side * (68 + i * 5), -3 + i * 7, -14]} size={[12, 7, 27 - i * 2]} color={bankStep} />)}
      <Block at={[side * 60, -5, 0]} size={[12, 5, 17]} color={plasterLow} />
      {kind === 'suspension' && <>
        {[-4.4, 4.4].map(z => <Block key={z} at={[side * 60, 26, z]} size={[2.5, 65, 2.4]} />)}
        <Block at={[side * 60, 56, 0]} size={[2.5, 2.5, 11]} />
        <Block at={[side * 92, 25, 0]} size={[12, 6, 15]} />
      </>}
      {kind === 'beam' && <Block at={[side * 60, 10, 0]} size={[4, 30, 10]} />}
    </group>)}
    {kind === 'beam' && [-3.8, 3.8].map(z => <Block key={z} at={[0, DECK - 2.5, z]} size={[120, 4, .8]} />)}
    {kind === 'stayed' && <>
      <Block at={[0, -6, 0]} size={[12, 5, 17]} color={plasterLow} />
      {[-4.5, 4.5].map(z => <Block key={z} at={[0, 29, z]} size={[3.4, 71, 2.5]} />)}
      <Block at={[0, 61, 0]} size={[3.4, 3, 11]} />
    </>}
    {response.members.filter(m => m.family === 'arch' || m.family === 'cable' || m.family === 'hanger' || (m.family === 'anchor' && kind === 'suspension')).flatMap(m => [-4.4, 4.4].map(z => <Rod key={`${m.id}-${z}`} a={[m.a[0], m.a[1], z]} b={[m.b[0], m.b[1], z]} color={plaster} radius={m.family === 'arch' ? 1.2 : m.family === 'hanger' ? .25 : .48} />))}
    {Array.from({ length: 20 }, (_, i) => <Block key={i} at={[-95 + i * 10, DECK + .06, 0]} size={[3, .06, .16]} color="#cfd5dc" />)}
    <mesh position={[0, -5.9, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[240, 100]} /><meshStandardMaterial color={PALETTE.water} roughness={.42} /></mesh>
    {Array.from({ length: 16 }, (_, i) => <Block key={i} at={[-52 + i * 7, -5.8, -30 + i % 4 * 17]} size={[.12, .07, 8]} color={PALETTE.ripple} />)}
    <mesh position={[0, -8.8, 0]} receiveShadow><boxGeometry args={[240, 1, 100]} /><meshStandardMaterial color={PALETTE.bed} roughness={.95} /></mesh>
  </>
})

/** One key light, one cool rim light from behind-right, low ambient: dark plaster stays readable on the dark page. */
function SceneLights() {
  return <>
    <ambientLight intensity={.16} />
    <hemisphereLight args={['#c9d6e4', '#06080a', .85]} />
    <directionalLight position={[-80, 130, 75]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={130} shadow-camera-bottom={-100} shadow-bias={-.001} />
    <directionalLight position={[150, 55, -120]} intensity={1.15} color="#9cc2ff" />
  </>
}

export function BridgeScene({ kind, response, position, playing, forces, labels, view, reset, focus, onInspect }: { kind: BridgeKind; response: Response; position: number; playing: boolean; forces: boolean; labels: boolean; view: string; reset: number; focus: Member['family'][] | null; onInspect: (step: number) => void }) {
  const tx = useExperienceI18n()
  return <Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [120, 105, 185], zoom: 4, near: .1, far: 1200 }} gl={{ antialias: true }}>
    <color attach="background" args={[PALETTE.bg]} />
    <fog attach="fog" args={[PALETTE.bg, 290, 560]} />
    <SceneLights />
    <Camera view={view} reset={reset} />
    <Structure kind={kind} response={response} />
    <ForceMembers response={response} visible={forces} playing={playing} focus={focus} />
    <Truck position={position} />
    {forces && <Arrow at={[-60 + position * 120, DECK + 16, 0]} direction={[0, -1, 0]} color="#f5b83d" />}
    {forces && kind === 'arch' && <><Arrow at={[-70, 1, 10]} direction={[-1, 0, 0]} color={COMPRESSION} size={1.4} /><Arrow at={[70, 1, 10]} direction={[1, 0, 0]} color={COMPRESSION} size={1.4} /></>}
    {labels && forces && <>
      {kind === 'suspension' && <><Label at={[8, 48, 4]} text={tx('主缆受拉')} tone="tension" onClick={() => onInspect(1)} /><Label at={[-60, 15, 7]} text={tx('桥塔受压')} tone="compression" onClick={() => onInspect(2)} /><Label at={[92, 28, 5]} text={tx('锚碇拉住缆索')} tone="tension" onClick={() => onInspect(1)} /></>}
      {kind === 'arch' && <><Label at={[0, 17, 5]} text={tx('拱圈受压')} tone="compression" onClick={() => onInspect(1)} /><Label at={[77, -14, 10]} text={tx('向外推两岸')} tone="thrust" onClick={() => onInspect(2)} /></>}
      {kind === 'beam' && <><Label at={[-20, 34, 5]} text={tx('上缘受压')} tone="compression" onClick={() => onInspect(1)} /><Label at={[12, 20, 5]} text={tx('下缘受拉')} tone="tension" onClick={() => onInspect(1)} /></>}
      {kind === 'stayed' && <><Label at={[28, 52, 5]} text={tx('斜索受拉')} tone="tension" onClick={() => onInspect(1)} /><Label at={[-18, 24, 5]} text={tx('桥面受压')} tone="compression" onClick={() => onInspect(0)} /></>}
    </>}
  </Canvas>
}
