import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as T from 'three'
import { fibonacciSphere, frameAt, type Part, type Route, type View } from './model'

type SceneProps = { progress: number; route: Route; view: View; section: boolean; explode: number; selected: Part; reset: number; onSelect: (id: Part) => void; onInteraction: () => void }
const Y = new T.Vector3(0, 1, 0)

function Instances({ points, color, radius, selected = false }: { points: [number, number, number][]; color: string; radius: number; selected?: boolean }) {
  const ref = useRef<T.InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new T.Object3D()
    points.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix) })
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [points])
  return <instancedMesh ref={ref} args={[undefined, undefined, points.length]} frustumCulled={false}>
    <sphereGeometry args={[radius, 8, 6]} /><meshStandardMaterial color={selected ? '#efd4a5' : color} metalness={.22} roughness={.38} />
  </instancedMesh>
}

function Chain({ release = 0, onSelect, selected }: { release?: number; onSelect: () => void; selected: boolean }) {
  const points = useMemo(() => Array.from({ length: 280 }, (_, i) => {
    const t = i / 279, a = t * Math.PI * 22
    return new T.Vector3(Math.sin(a) * (.43 + .12 * Math.cos(t * 19)), -.5 + t + .07 * Math.cos(a * 2), Math.cos(a) * (.43 + .12 * Math.cos(t * 19)))
  }), [])
  const geometry = useMemo(() => new T.TubeGeometry(new T.CatmullRomCurve3(points), 600, .018, 6, false), [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group position={[release * .9, -release * 2.8, release * .5]} rotation={[0, release * .6, release * .7]} onClick={e => { e.stopPropagation(); onSelect() }}>
    <mesh geometry={geometry}><meshStandardMaterial color={selected ? '#ffd4a5' : '#c99c80'} roughness={.47} metalness={.12} /></mesh>
    <Instances points={points.filter((_, i) => i % 5 === 0).map(p => p.toArray() as [number, number, number])} radius={.026} color="#dcc09c" />
  </group>
}

function Particle({ progress, route, section, explode, selected, onSelect, anatomy = false }: SceneProps & { anatomy?: boolean }) {
  const f = frameAt(progress, route)
  const offset = anatomy ? explode : 0
  const points = useMemo(() => fibonacciSphere(1100).filter(p => !section || !(p[2] > .13 && p[0] > -.35)), [section])
  const heads = useMemo(() => points.map(p => p.map(x => x * (1 + offset * .65)) as [number, number, number]), [points, offset])
  const inner = useMemo(() => points.map(p => p.map(x => x * (.94 + offset * .65)) as [number, number, number]), [points, offset])
  const proteins = useMemo(() => fibonacciSphere(34).filter(p => !section || !(p[2] > .13 && p[0] > -.35)), [section])
  const coat = useMemo(() => fibonacciSphere(180, .76).filter(p => !section || !(p[2] > .13 && p[0] > -.35)), [section])
  const pos: [number, number, number] = anatomy ? [0, .5, 0] : [0, f.virusY, 0]
  return <group position={pos} scale={anatomy ? 1.65 : 1}>
    <group onClick={e => { e.stopPropagation(); onSelect('envelope') }}>
      <Instances points={heads} color="#709a9f" radius={.036} selected={selected === 'envelope'} />
      <Instances points={inner} color="#426e79" radius={.028} />
      {!section && <mesh><sphereGeometry args={[.97 + offset * .65, 64, 48]} /><meshPhysicalMaterial color="#799fa3" roughness={.45} transparent opacity={.32} depthWrite={false} side={T.DoubleSide} /></mesh>}
    </group>
    <group onClick={e => { e.stopPropagation(); onSelect('surface') }}>{proteins.map((p, i) => {
      const n = new T.Vector3(...p), q = new T.Quaternion().setFromUnitVectors(Y, n)
      return <group key={i} position={n.multiplyScalar(1.01 + offset).toArray()} quaternion={q}>
        <mesh position={[0, .1, 0]}><cylinderGeometry args={[.025, .04, .23, 8]} /><meshStandardMaterial color="#a58c74" roughness={.4} /></mesh>
        {[0, 1, 2].map(j => <mesh key={j} position={[Math.sin(j * Math.PI * 2 / 3) * .07, .25, Math.cos(j * Math.PI * 2 / 3) * .07]} rotation={[.2, j * 2.1, .15]} scale={[.08, .105, .07]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={selected === 'surface' ? '#f0d5a6' : '#c0ad8b'} roughness={.36} metalness={.12} /></mesh>)}
      </group>
    })}</group>
    <group rotation={[0, offset * .2, 0]} position={[offset * -1.6, 0, 0]} onClick={e => { e.stopPropagation(); onSelect('coat') }}>
      <Instances points={coat} radius={.057} color="#8d829f" selected={selected === 'coat'} />
    </group>
    <Chain selected={selected === 'genome'} release={anatomy ? 0 : f.release} onSelect={() => onSelect('genome')} />
  </group>
}

function Membrane({ progress, route, selected, onSelect, closeup = false }: { progress: number; route: Route; selected: Part; onSelect: (id: Part) => void; closeup?: boolean }) {
  const heads = useRef<T.InstancedMesh>(null), tails = useRef<T.InstancedMesh>(null)
  const points = useMemo(() => Array.from({ length: 64 * 40 }, (_, i) => [-6.3 + i % 64 * .2, 0, -3.9 + Math.floor(i / 64) * .2] as [number, number, number]), [])
  const dummy = useMemo(() => new T.Object3D(), [])
  useFrame(() => {
    if (!heads.current || !tails.current) return
    const f = frameAt(progress, route)
    const depression = route === 'endosome' && f.uptake < .95 ? Math.sin(f.uptake * Math.PI) * 1.7 : 0
    let headIndex = 0, tailIndex = 0
    for (const [x, , z] of points) {
      const r = Math.hypot(x, z)
      const gap = route === 'surface' && f.fusion > .05 && r < f.pore
      const y = -depression * Math.exp(-(r * r) / 1.9)
      for (const side of [-1, 1]) {
        dummy.position.set(x, y + side * .065, z)
        dummy.scale.setScalar(gap ? 0 : 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix()
        heads.current.setMatrixAt(headIndex++, dummy.matrix)
        dummy.position.y = y + side * .025
        dummy.scale.set(gap ? 0 : .013, gap ? 0 : .045, gap ? 0 : .013); dummy.updateMatrix()
        tails.current.setMatrixAt(tailIndex++, dummy.matrix)
      }
    }
    heads.current.instanceMatrix.needsUpdate = true; tails.current.instanceMatrix.needsUpdate = true
  })
  return <group scale={closeup ? 1.3 : 1} onClick={e => { e.stopPropagation(); onSelect('cell') }}>
    <instancedMesh ref={heads} args={[undefined, undefined, points.length * 2]} frustumCulled={false}><sphereGeometry args={[.054, 8, 6]} /><meshStandardMaterial color={selected === 'cell' ? '#c6d4c7' : '#6b95ab'} roughness={.42} metalness={.18} /></instancedMesh>
    <instancedMesh ref={tails} args={[undefined, undefined, points.length * 2]} frustumCulled={false}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#a8aca0" roughness={.7} /></instancedMesh>
    {Array.from({ length: 22 }, (_, i) => {
      const x = (i % 6 - 2.5) * 1.75, z = (Math.floor(i / 6) - 1.5) * 1.8
      return <group key={i} position={[x, 0, z]} rotation={[0, i * 2.4, .1 * Math.sin(i)]}>
        <mesh position={[0, .1, 0]}><cylinderGeometry args={[.025, .025, .6, 8]} /><meshStandardMaterial color="#b4b39e" /></mesh>
        <mesh position={[0, .4, 0]} rotation={[0, 0, .3]} scale={[.15, .12, .08]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#d0bf9b" roughness={.45} /></mesh>
      </group>
    })}
  </group>
}

function Vesicle({ progress, route, onSelect }: { progress: number; route: Route; onSelect: (id: Part) => void }) {
  const f = frameAt(progress, route)
  if (!f.vesicleVisible) return null
  const opening = .6 + f.uptake * 4.1
  return <group position={[0, f.virusY, 0]} onClick={e => { e.stopPropagation(); onSelect('vesicle') }}>
    <mesh rotation={[0, 0, Math.PI]}><sphereGeometry args={[1.43, 64, 48, 0, Math.PI * 1.55, 0, Math.min(Math.PI, opening)]} /><meshPhysicalMaterial color="#86ada2" transparent opacity={.25} depthWrite={false} side={T.DoubleSide} roughness={.3} /></mesh>
    <mesh rotation={[0, 0, Math.PI]}><sphereGeometry args={[1.41, 32, 24, 0, Math.PI * 1.55, 0, Math.min(Math.PI, opening)]} /><meshBasicMaterial color="#7cae9f" wireframe transparent opacity={.07} /></mesh>
  </group>
}

function Interior() {
  const spheres = useMemo(() => Array.from({ length: 100 }, (_, i) => [Math.sin(i * 2.399) * (2.4 + i % 5 * .6), -1.7 - i % 7 * .35, Math.cos(i * 2.399) * (2 + i % 3)] as [number, number, number]), [])
  const tubes = useMemo(() => Array.from({ length: 7 }, (_, j) => new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => new T.Vector3(-5 + i, -3.3 - .18 * Math.sin(i + j), -3 + j + .2 * Math.cos(i * .6)))), 100, .025, 6, false)), [])
  useEffect(() => () => tubes.forEach(g => g.dispose()), [tubes])
  return <><Instances points={spheres} color="#657185" radius={.065} />{tubes.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#677f82" roughness={.55} /></mesh>)}</>
}

function Camera({ view, reset, onInteraction }: { view: View; reset: number; onInteraction: () => void }) {
  const { camera, size } = useThree()
  const orbit = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => {
    const mobile = size.width / size.height < 1
    const d = view === 'particle' ? (mobile ? 10.5 : 8) : view === 'membrane' ? 6 : mobile ? 18 : 13
    const target = view === 'particle' ? .5 : view === 'inside' ? -1.7 : .4
    camera.position.set(d * .42, view === 'membrane' ? 1.7 : d * .28 + target, d * .78)
    orbit.current?.target.set(0, target, 0); orbit.current?.update()
  }, [camera, view, reset, size.width, size.height])
  return <OrbitControls ref={orbit} minDistance={1.2} maxDistance={30} enableDamping dampingFactor={.08} onStart={onInteraction} />
}

export function VirusScene(props: SceneProps) {
  const f = frameAt(props.progress, props.route)
  return <Canvas dpr={[1, 1.5]} camera={{ position: [5, 4, 10], fov: 40, near: .03, far: 80 }} gl={{ antialias: true }}>
    <color attach="background" args={['#101820']} /><fog attach="fog" args={['#101820', 17, 40]} />
    <Camera view={props.view} reset={props.reset} onInteraction={props.onInteraction} />
    <ambientLight intensity={.5} /><directionalLight position={[-4, 7, 5]} intensity={3} /><directionalLight position={[4, 2, -5]} intensity={2} color="#8bc2d2" />
    <Environment resolution={64} frames={1}><Lightformer form="rect" intensity={2.5} position={[0, 7, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 6, 1]} /></Environment>
    {props.view === 'particle' ? <Particle {...props} anatomy /> : <>
      <Membrane progress={props.progress} route={props.route} selected={props.selected} onSelect={props.onSelect} closeup={props.view === 'membrane'} />
      {props.view !== 'membrane' && <><Particle {...props} /><Vesicle progress={props.progress} route={props.route} onSelect={props.onSelect} /><Interior /></>}
      {f.fusion > .1 && props.route === 'surface' && <mesh position={[0, -.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[f.pore, .045, 12, 64]} /><meshStandardMaterial color="#c6b08e" roughness={.42} /></mesh>}
    </>}
  </Canvas>
}
