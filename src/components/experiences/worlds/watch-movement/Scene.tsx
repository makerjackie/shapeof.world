import { memo, useEffect, useMemo, useRef, type ComponentRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei'
import * as T from 'three'
import { isWorldPaused } from '~/lib/world-playback'
import { advance, BALANCE, balanceAngle, FORK, forkAngle, indicationSeconds, TAU, WHEELS, wheelAngle, wind, type PartId, type Settings, type ViewId, type WatchState, type Wheel } from './model'
import { escapementFraming, fitWatchDistance } from './framing'
import { bridgeGeometry, mainplateGeometry, PLATE_POCKETS, escapeGeometry, gearGeometry, spiralGeometry, updateMainspring, updateSpiral } from './geometry'

type SceneProps = {
  state: MutableRefObject<WatchState>; settings: Settings; paused: boolean; speed: number; explode: number;
  view: ViewId; reset: number; bridges: boolean; labels: boolean; path: boolean; selected: PartId | null;
  winding: MutableRefObject<boolean>; select: (id: PartId) => void; sample: (s: WatchState) => void;
  onBeat: () => void; names: Record<string, string>; onInteract: () => void;
}
const GOLD = '#bca16a', STEEL = '#a0b1c2', RUBY = '#ad315b'
const CYL_ROT: [number, number, number] = [Math.PI / 2, 0, 0]
function Metal({ color = GOLD, roughness = .32, glow = 0, transparent = false, opacity = 1 }: { color?: string; roughness?: number; glow?: number; transparent?: boolean; opacity?: number }) {
  return <meshPhysicalMaterial color={color} metalness={.86} roughness={roughness} clearcoat={.16} clearcoatRoughness={.34} emissive={color} emissiveIntensity={glow} transparent={transparent} opacity={opacity} />
}
function Cylinder({ r, h, z = 0, color = STEEL, sides = 48 }: { r: number; h: number; z?: number; color?: string; sides?: number }) {
  return <mesh position={[0, 0, z]} rotation={CYL_ROT} castShadow receiveShadow><cylinderGeometry args={[r, r, h, sides]} /><Metal color={color} /></mesh>
}
function Ring({ r, width, z = 0, color = STEEL }: { r: number; width: number; z?: number; color?: string }) {
  return <mesh position={[0, 0, z]}><torusGeometry args={[r, width, 8, 96]} /><Metal color={color} roughness={.23} /></mesh>
}
function Screw({ at, r = .28 }: { at: [number, number, number]; r?: number }) {
  return <group position={at}>
    <Cylinder r={r} h={.18} color="#788ca7" />
    <mesh position={[0, 0, .105]} rotation={[0, 0, .3]}><boxGeometry args={[r * 1.55, r * .19, .04]} /><meshStandardMaterial color="#18212b" roughness={.8} /></mesh>
  </group>
}
function Jewel({ at, select }: { at: [number, number, number]; select?: () => void }) {
  return <group position={at} onClick={e => { if (select) { e.stopPropagation(); select() } }}>
    <Ring r={.36} width={.1} color="#bf9e63" />
    <mesh><torusGeometry args={[.23, .12, 8, 32]} /><meshStandardMaterial color={RUBY} metalness={.28} roughness={.2} /></mesh>
    <Cylinder r={.065} h={.3} color="#d1d8df" />
  </group>
}
function Hit({ r, h = .7, onSelect }: { r: number; h?: number; onSelect: (e: ThreeEvent<MouseEvent>) => void }) {
  return <mesh onClick={onSelect} rotation={CYL_ROT}><cylinderGeometry args={[r, r, h, 32]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
}
function Clock({ state, settings, paused, speed, winding, sample, onBeat }: SceneProps) {
  const counter = useRef(0)
  useFrame((_, dt) => {
    if (document.hidden || isWorldPaused()) return
    if (winding.current) state.current = wind(state.current, Math.min(dt, .05) * 4)
    if (!paused) {
      const before = state.current.beats
      state.current = advance(state.current, Math.min(dt, .05) * speed, settings)
      if (state.current.beats > before && speed <= 1) onBeat()
    }
    counter.current += dt
    if (counter.current > .12) { sample({ ...state.current }); counter.current = 0 }
  })
  return null
}
const TrainWheel = memo(function TrainWheel({ wheel, state, explode, selected, onSelect, path }: { wheel: Wheel; state: MutableRefObject<WatchState>; explode: number; selected: PartId | null; onSelect: () => void; path: boolean }) {
  const ref = useRef<T.Group>(null)
  const index = WHEELS.indexOf(wheel)
  const geometry = useMemo(() => wheel.id === 'escape' ? escapeGeometry() : gearGeometry(wheel.teeth, wheel.module, .24, wheel.id !== 'barrel'), [wheel])
  const barrelSpring = useMemo(() => wheel.id === 'barrel' ? spiralGeometry(.38, 4.05, 7, .09, 0) : null, [wheel])
  const inputModule = index ? [.1, .075, .065, .035][index - 1] : .1
  const pinion = useMemo(() => wheel.pinion ? gearGeometry(wheel.pinion, inputModule, .55, false) : null, [wheel, inputModule])
  const z = wheel.z + explode * (1.3 + index * 2.1)
  const isSelected = selected === wheel.id, color = wheel.id === 'escape' ? '#85a6b8' : isSelected ? '#e0bb6d' : GOLD
  useFrame(() => { if (ref.current) ref.current.rotation.z = wheelAngle(wheel, state.current); if (barrelSpring) updateMainspring(barrelSpring, state.current.reserve) })
  useEffect(() => () => { geometry.dispose(); pinion?.dispose(); barrelSpring?.dispose() }, [geometry, pinion, barrelSpring])
  return <group position={[wheel.x, wheel.y, z]}>
    <group ref={ref}>
      <mesh geometry={geometry} castShadow receiveShadow onPointerOver={e => { e.stopPropagation(); (e.nativeEvent.target as HTMLElement).style.cursor = 'pointer' }} onPointerOut={e => { (e.nativeEvent.target as HTMLElement).style.cursor = 'grab' }} onClick={e => { e.stopPropagation(); onSelect() }}><Metal color={color} glow={path ? .08 : 0} /></mesh>
      {wheel.id !== 'escape' && <><Ring r={wheel.teeth * wheel.module * .43} width={.022} z={.275} color={isSelected ? '#ead097' : '#d1b77c'} /><Ring r={wheel.teeth * wheel.module * .155} width={.035} z={.265} color="#8f784b" /></>}
      {pinion && <mesh geometry={pinion} position={[0, 0, -.75]} castShadow><Metal color="#99abbc" /></mesh>}
      {wheel.id === 'barrel' && <>
        <Cylinder r={4.32} h={.52} z={-.28} color="#7d6949" />
        <Ring r={4.28} width={.055} z={.34} color="#dbbf86" />
        <mesh geometry={barrelSpring!} position={[0, 0, .32]}><Metal color="#c4b99f" /></mesh>
        <Cylinder r={.5} h={.65} z={.16} color="#c5b180" />
      </>}
      <Cylinder r={.13} h={1.5 + explode * .2} z={.12} color="#c6d1db" />
      <Cylinder r={Math.min(.45, wheel.teeth * wheel.module * .1)} h={.3} z={.19} color={color} />
      {isSelected && <Ring r={wheel.teeth * wheel.module / 2 + wheel.module * 2} width={.04} z={.18} color="#c7e1ee" />}
    </group>
    <Hit r={wheel.teeth * wheel.module / 2} onSelect={e => { e.stopPropagation(); onSelect() }} />
  </group>
})
function Balance({ state, settings, explode, selected, select }: Pick<SceneProps, 'state' | 'settings' | 'explode' | 'selected' | 'select'>) {
  const rotor = useRef<T.Group>(null)
  const spring = useMemo(() => spiralGeometry(.35, 2.6, 7, .045, 0, 320), [])
  const z = 3.75 + explode * 12
  useEffect(() => () => spring.dispose(), [spring])
  useFrame(() => {
    const angle = balanceAngle(state.current, settings)
    if (rotor.current) rotor.current.rotation.z = angle
    updateSpiral(spring, .35, 2.6, 7, .045, angle)
  })
  return <group position={[BALANCE[0], BALANCE[1], z]}>
    <group ref={rotor}>
      <Ring r={3.42} width={.19} color={selected === 'balance' ? '#e4bc7b' : '#b48e59'} />
      <Ring r={3.19} width={.055} z={.07} color="#d7bd89" />
      {[0, TAU / 3, TAU * 2 / 3].map(a => <group key={a} rotation={[0, 0, a]}><mesh position={[1.65, 0, 0]} castShadow><boxGeometry args={[3.2, .23, .18]} /><Metal color="#c2a16b" /></mesh></group>)}
      {Array.from({ length: 16 }, (_, i) => <group key={i} rotation={[0, 0, i * TAU / 16]}><mesh position={[3.43, 0, .05]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[.29, .25, .22]} /><Metal color="#b89b6b" /></mesh></group>)}
      <Cylinder r={.45} h={.27} color="#b19c79" />
      <Cylinder r={.095} h={2} z={.25} color="#d9e2e9" />
      <mesh position={[0, .58, -.32]}><sphereGeometry args={[.12, 12, 8]} /><meshStandardMaterial color="#b44c73" roughness={.19} /></mesh>
    </group>
    <mesh geometry={spring} position={[0, 0, .5]} onClick={e => { e.stopPropagation(); select('spring') }}><meshStandardMaterial color="#5689bd" metalness={.74} roughness={.25} side={T.DoubleSide} /></mesh>
    <group position={[Math.cos(7 * TAU) * 2.6, 0, .5]}><Cylinder r={.16} h={.65} z={-.2} color="#aaa894" /></group>
    <Hit r={3.5} h={1} onSelect={e => { e.stopPropagation(); select('balance') }} />
    {selected === 'balance' && <Ring r={3.75} width={.035} color="#b9d7e7" />}
  </group>
}
function Fork({ state, explode, select }: Pick<SceneProps, 'state' | 'explode' | 'select'>) {
  const ref = useRef<T.Group>(null)
  const geometry = useMemo(() => bridgeGeometry([[-.14, -3.6], [-.27, -3.3], [-.16, .25], [-1.05, .68], [-1.03, .94], [-.73, .88], [0, .47], [.77, .88], [1.12, .96], [1.13, .68], [.19, .24], [.26, -3.3], [.12, -3.6], [.1, -3.06], [-.08, -3.06]]), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(() => { if (ref.current) ref.current.rotation.z = -.82 + forkAngle(state.current) })
  return <group position={[FORK[0], FORK[1], 3.8 + explode * 9.5]}>
    <group ref={ref} onClick={e => { e.stopPropagation(); select('fork') }}>
      <mesh geometry={geometry} castShadow><Metal color="#9ba8b5" /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.03, .8, .24]} rotation={[0, 0, side * -.38]}><boxGeometry args={[.28, .44, .23]} /><meshStandardMaterial color="#b84063" roughness={.24} metalness={.28} /></mesh>)}
      <Cylinder r={.12} h={1.7} z={.1} />
    </group>
    <Jewel at={[0, 0, .6]} select={() => select('jewel')} />
    <Hit r={1.25} onSelect={e => { e.stopPropagation(); select('fork') }} />
  </group>
}
function Plate({ explode, bridges, selected, select }: Pick<SceneProps, 'explode' | 'bridges' | 'selected' | 'select'>) {
  const plate = useMemo(() => mainplateGeometry(), [])
  useEffect(() => () => plate.dispose(), [plate])
  const finish = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#747474'; ctx.fillRect(0, 0, 512, 512)
    for (let row = -1; row < 18; row++) for (let col = -1; col < 18; col++) {
      const x = col * 32 + row % 2 * 16, y = row * 32
      for (let r = 3; r < 22; r += 1.7) { ctx.strokeStyle = `rgba(192,192,192,${.08 + (r % 3) * .02})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke() }
    }
    const texture = new T.CanvasTexture(canvas); texture.anisotropy = 4; return texture
  }, [])
  useEffect(() => () => finish.dispose(), [finish])
  const trainBridge = useMemo(() => bridgeGeometry([[-3, 4.4], [-1.7, 4.8], [1.8, 4.35], [5.3, 1.8], [5.2, -.1], [3.3, -.6], [2.8, 1.1], [.8, 2.7], [-1.4, 3.25], [-2.7, 2.9]], [[-1.4, 2.2, .57]]), [])
  const barrelBridge = useMemo(() => bridgeGeometry([[-9, 8.5], [-6.2, 10], [-2.9, 8.2], [-2.1, 6], [-3.6, 4.7], [-5.8, 4.8], [-8.2, 6.1]], [[WHEELS[0].x, WHEELS[0].y, .6]]), [])
  const balanceBridge = useMemo(() => bridgeGeometry([[-7, -5.5], [-6.1, -4.7], [-1.7, -4.45], [-1.15, -5.2], [-1.8, -5.9], [-5.9, -5.85]], [[BALANCE[0], BALANCE[1], .47]]), [])
  useEffect(() => () => { trainBridge.dispose(); barrelBridge.dispose(); balanceBridge.dispose() }, [trainBridge, barrelBridge, balanceBridge])
  return <>
    <group onClick={e => { e.stopPropagation(); select('bridge') }}>
      <mesh geometry={plate} receiveShadow castShadow><meshStandardMaterial color="#64717b" metalness={.8} roughness={.4} bumpMap={finish} bumpScale={.012} /></mesh>
      {PLATE_POCKETS.map(([x,y,r])=><group key={x} position={[x,y,-.07]}><Ring r={r+.1} width={.025} color="#8b969c" /></group>)}
      <Ring r={12.75} width={.1} z={-.04} color="#697784" />
      <Ring r={12.25} width={.035} z={-.02} color="#596774" />
      {Array.from({ length: 7 }, (_, i) => { const a = i * TAU / 7 + .2; return <Screw key={i} at={[Math.cos(a) * 11.5, Math.sin(a) * 11.5, .02]} r={.39} /> })}
    </group>
    {WHEELS.map(w => <Jewel key={w.id} at={[w.x, w.y, .05]} select={() => select('jewel')} />)}
    <Jewel at={[BALANCE[0], BALANCE[1], .05]} select={() => select('jewel')} />
    {bridges && <>
      <group position={[0, 0, 4.8 + explode * 18]} onClick={e => { e.stopPropagation(); select('bridge') }}>
        <mesh geometry={trainBridge} castShadow receiveShadow><Metal color={selected === 'bridge' ? '#9dafbd' : '#617281'} roughness={.38} /></mesh>
        {[[-2.45, 3.8], [4.55, .87], [1.4, 3.6]].map(([x, y], i) => <Screw key={i} at={[x, y, .58]} />)}
        {WHEELS.slice(1, 4).map(w => <Jewel key={w.id} at={[w.x, w.y, .56]} select={() => select('jewel')} />)}
        {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[.2 + i * .29, 3.5 - i * .18, .47]} rotation={[0, 0, -.4]}><boxGeometry args={[.07, 1.1, .006]} /><meshStandardMaterial color="#7b8b98" metalness={.6} roughness={.7} /></mesh>)}
      </group>
      <group position={[0, 0, 2.45 + explode * 15.5]} onClick={e => { e.stopPropagation(); select('bridge') }}>
        <mesh geometry={barrelBridge} castShadow><Metal color="#65717a" roughness={.38} /></mesh>
        {[[-7.2, 8.5], [-3.4, 6.4]].map(([x, y], i) => <Screw key={i} at={[x, y, .58]} />)}
        <Jewel at={[WHEELS[0].x, WHEELS[0].y, .55]} select={() => select('jewel')} />
      </group>
      <group position={[0, 0, 5.05 + explode * 19.5]}>
        <mesh geometry={balanceBridge} castShadow onClick={e => { e.stopPropagation(); select('bridge') }}><Metal color="#687a8a" /></mesh>
        <Screw at={[-6.2, -5.25, .57]} />
        <Jewel at={[BALANCE[0], BALANCE[1], .56]} select={() => select('jewel')} />
        <Ring r={.45} width={.045} z={.65} color="#d8c29a" />
      </group>
    </>}
  </>
}
function Winding({ state, explode, select, view }: Pick<SceneProps, 'state' | 'explode' | 'select' | 'view'>) {
  const groups = useRef<(T.Group | null)[]>([]), crown = useRef<T.Group>(null)
  const y = WHEELS[0].y
  const wheels = useMemo(() => [
    { x: WHEELS[0].x, teeth: 60, ratio: -2 / 3, phase: 0 },
    { x: WHEELS[0].x + 4.4, teeth: 50, ratio: .8, phase: Math.PI / 50 },
    { x: WHEELS[0].x + 8.4, teeth: 50, ratio: -.8, phase: 0 },
    { x: WHEELS[0].x + 12, teeth: 40, ratio: 1, phase: Math.PI / 40 },
  ], [])
  const geometries = useMemo(() => wheels.map(w => gearGeometry(w.teeth, .08, .2, true)), [wheels])
  useEffect(() => () => geometries.forEach(g => g.dispose()), [geometries])
  useFrame(() => {
    groups.current.forEach((g, i) => { if (g) g.rotation.z = state.current.winding * TAU * wheels[i].ratio + wheels[i].phase })
    if (crown.current) crown.current.rotation.x = state.current.winding * TAU
  })
  return <group position={[0, 0, explode * 14]} onClick={e => { e.stopPropagation(); select('crown') }}>
    <group position={[10.4, y, 3.7]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.19, .19, 6.8, 16]} /><Metal /></mesh>
      <group position={[3.8, 0, 0]} ref={crown}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.95, .95, 1.25, 48]} /><Metal color="#9daeba" /></mesh>
        {Array.from({ length: 30 }, (_, i) => <mesh key={i} position={[0, Math.cos(i * TAU / 30) * .94, Math.sin(i * TAU / 30) * .94]} rotation={[i * TAU / 30, 0, 0]}><boxGeometry args={[1.15, .1, .1]} /><Metal color="#72889b" /></mesh>)}
      </group>
      <mesh position={[-2.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.7, .35, .6, 20]} /><Metal color="#c4aa75" /></mesh>
    </group>
    {wheels.map((w, i) => <group key={i} position={[w.x, y, 3.7]} visible={i > 0 || view !== 'spring'}>
      <group ref={g => { groups.current[i] = g }}><mesh geometry={geometries[i]} castShadow><Metal color={i ? '#8c9daa' : '#c0a36e'} /></mesh><Cylinder r={.26} h={.48} z={.1} color="#c2cbd1" /></group>
      <Jewel at={[0, 0, -.3]} select={() => select('jewel')} />
    </group>)}
    <mesh position={[WHEELS[0].x - 2.2, y - 1.2, 3.95]} rotation={[0, 0, -.6]}><boxGeometry args={[1.1, .28, .15]} /><Metal color="#9babb8" /></mesh>
    <Screw at={[WHEELS[0].x - 2.7, y - 1.6, 4.05]} r={.2} />
  </group>
}
function MotionWorks({ state, visible }: Pick<SceneProps, 'state'> & { visible: boolean }) {
  const minute = useRef<T.Group>(null), intermediate = useRef<T.Group>(null), hour = useRef<T.Group>(null)
  const geometry = useMemo(() => [gearGeometry(10, .045, .18, false), gearGeometry(40, .045, .18, false), gearGeometry(12, .046875, .23, false), gearGeometry(36, .046875, .18, false)], [])
  useEffect(() => () => geometry.forEach(g => g.dispose()), [geometry])
  useFrame(() => {
    const angle = -indicationSeconds(state.current) / 3600 * TAU
    if (minute.current) minute.current.rotation.z = angle
    if (intermediate.current) intermediate.current.rotation.z = -angle / 4 + .1
    if (hour.current) hour.current.rotation.z = angle / 12
  })
  if (!visible) return null
  const x = WHEELS[1].x, y = WHEELS[1].y
  return <group>
    <group ref={minute} position={[x, y, 5.8]}><mesh geometry={geometry[0]}><Metal color="#c0ac7f" /></mesh></group>
    <group ref={intermediate} position={[x - .7, y - Math.sqrt(1.125 ** 2 - .7 ** 2), 5.8]}><mesh geometry={geometry[1]}><Metal color="#9bafc0" /></mesh><mesh geometry={geometry[2]} position={[0, 0, .32]}><Metal color="#b5c5d0" /></mesh></group>
    <group ref={hour} position={[x, y, 6.12]}><mesh geometry={geometry[3]}><Metal color="#bba476" /></mesh></group>
  </group>
}
function Hands({ state, visible, select }: Pick<SceneProps, 'state' | 'select'> & { visible: boolean }) {
  const minute = useRef<T.Group>(null), hour = useRef<T.Group>(null), second = useRef<T.Group>(null)
  useFrame(() => {
    const t = indicationSeconds(state.current) + 10 * 3600 + 8 * 60
    if (minute.current) minute.current.rotation.z = -t / 3600 * TAU
    if (hour.current) hour.current.rotation.z = -t / (12 * 3600) * TAU
    if (second.current) second.current.rotation.z = -t / 60 * TAU
  })
  if (!visible) return null
  return <group position={[WHEELS[1].x, WHEELS[1].y, 6.5]} onClick={e => { e.stopPropagation(); select('motion') }}>
    <mesh><ringGeometry args={[8.9, 10.3, 128]} /><meshStandardMaterial color="#111c25" metalness={.45} roughness={.45} side={T.DoubleSide} /></mesh>
    <Ring r={10.4} width={.1} color="#b8c3cc" />
    {Array.from({ length: 60 }, (_, i) => <group key={i} rotation={[0, 0, i * TAU / 60]}><mesh position={[0, 9.7, .08]}><boxGeometry args={[i % 5 ? .065 : .18, i % 5 ? .38 : .75, .07]} /><Metal color={i % 5 ? '#657887' : '#c6d2db'} /></mesh></group>)}
    <group ref={hour}><mesh position={[0, 2.6, .2]}><boxGeometry args={[.4, 5.7, .16]} /><Metal color="#ced9df" /></mesh></group>
    <group ref={minute}><mesh position={[0, 4, .45]}><boxGeometry args={[.24, 8.8, .12]} /><Metal color="#b3c8d5" /></mesh></group>
    <Cylinder r={.43} h={.7} z={.45} color="#bd9865" />
    <group position={[WHEELS[3].x - WHEELS[1].x, WHEELS[3].y - WHEELS[1].y, .8]}>
      <mesh><circleGeometry args={[1.65, 64]} /><meshStandardMaterial color="#18252f" /></mesh>
      <Ring r={1.7} width={.045} color="#738c9d" />
      {Array.from({ length: 12 }, (_, i) => <group key={i} rotation={[0, 0, i * TAU / 12]}><mesh position={[0, 1.45, .03]}><boxGeometry args={[.035, .15, .03]} /><Metal /></mesh></group>)}
      <group ref={second}><mesh position={[0, .58, .08]}><boxGeometry args={[.07, 1.6, .035]} /><Metal color="#d8a761" /></mesh></group>
      <Cylinder r={.14} h={.2} z={.1} color="#c5aa7e" />
    </group>
  </group>
}
function PowerPath({ state, explode, visible }: Pick<SceneProps, 'state' | 'explode'> & { visible: boolean }) {
  const ref = useRef<T.Group>(null)
  useFrame(() => { if (ref.current) ref.current.visible = visible && state.current.reserve > 0 })
  return <group ref={ref}>{WHEELS.map((w, i) => <mesh key={w.id} position={[w.x, w.y, w.z + explode * (1.3 + i * 2.1) + .55]}><ringGeometry args={[w.teeth * w.module / 2 + .2, w.teeth * w.module / 2 + .24, 96]} /><meshBasicMaterial color={i === 4 ? '#7fb9dd' : '#a8996e'} transparent opacity={.65} side={T.DoubleSide} depthWrite={false} /></mesh>)}</group>
}
function CameraRig({ view, reset, explode, onInteract }: Pick<SceneProps, 'view' | 'reset' | 'explode' | 'onInteract'>) {
  const { camera, size } = useThree(), orbit = useRef<ComponentRef<typeof OrbitControls>>(null), lastFrame = useRef('')
  useEffect(() => {
    const fov = 43, aspect = size.width / Math.max(1, size.height)
    const target = new T.Vector3(0, 1.1, 2 + explode * 7)
    let radius = 14.2 + explode * 5, direction = new T.Vector3(0, -.38, .925)
    if (view === 'escapement') { const frame = escapementFraming(explode); target.set(.3, -3, frame.z); radius = frame.radius; direction.set(0, -.25, .968) }
    if (view === 'spring') { target.set(-3, 4.2, 2 + explode * 5); radius = 10.8 + explode * 4; direction.set(-.1, -.32, .942) }
    if (view === 'dial') { target.set(-1.4, 2.2, 3); radius = 13.3 + explode * 4; direction.set(0, -.04, 1) }
    const frame = [view, reset, size.width, size.height].join(':')
    if (frame === lastFrame.current && orbit.current) direction.copy(camera.position).sub(orbit.current.target)
    lastFrame.current = frame
    if (camera instanceof T.PerspectiveCamera) { camera.fov = fov; camera.updateProjectionMatrix() }
    camera.position.copy(target).addScaledVector(direction.normalize(), fitWatchDistance(radius, aspect, fov))
    camera.lookAt(target)
    if (orbit.current) { orbit.current.target.copy(target); orbit.current.update() }
  }, [view, reset, explode, size.width, size.height, camera])
  return <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.08} minDistance={7} maxDistance={95} minPolarAngle={.1} maxPolarAngle={Math.PI * .92} onStart={onInteract} />
}
function Labels({ names, select, explode, view }: Pick<SceneProps, 'names' | 'select' | 'explode' | 'view'>) {
  const points: { id: PartId; at: [number, number, number]; side: string }[] = view === 'escapement' ? [
    { id: 'escape', at: [4.6, -.3, 4.8 + explode * 9.7], side: 'right' },
    { id: 'fork', at: [2.2, -2.8, 4.3 + explode * 9.5], side: 'right' },
    { id: 'balance', at: [-5.4, -6.2, 4 + explode * 12], side: 'left' },
  ] : [
    { id: 'barrel', at: [-9, 8.4, 1.5 + explode * 1.3], side: 'left' },
    { id: 'center', at: [-1.3, 5.4, 2.2 + explode * 3.4], side: 'right' },
    { id: 'balance', at: [-5.8, -6.6, 4 + explode * 12], side: 'left' },
    { id: 'escape', at: [4, -1.5, 4.7 + explode * 9.7], side: 'right' },
  ]
  return <>{points.map(p => <Html key={p.id} position={p.at} zIndexRange={[7, 1]}><button className={`wm-pin wm-pin-${p.side}`} onClick={() => select(p.id)}>{names[p.id]}</button></Html>)}</>
}
export const WatchScene = memo(function WatchScene(props: SceneProps) {
  return <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, -20, 38], fov: 43, near: .05, far: 250 }} gl={{ antialias: true, alpha: false }} onPointerMissed={() => {}}>
    <color attach="background" args={['#080d13']} />
    <ambientLight intensity={.4} />
    <hemisphereLight args={['#c2d2e8', '#15110c', .7]} />
    <directionalLight position={[-14, 15, 28]} intensity={2.6} color="#e7e8e5" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-.0005} />
    <directionalLight position={[15, -8, 12]} intensity={2.7} color="#b6cee0" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={3} position={[-12, 8, 15]} scale={[18, 10, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.8} position={[8, -8, 8]} scale={[4, 18, 1]} target={[0, 0, 0]} color="#b6cee4" />
      <Lightformer form="rect" intensity={1.5} position={[0, 15, 6]} scale={[10, 4, 1]} target={[0, 0, 0]} color="#efd6b0" />
    </Environment>
    <CameraRig {...props} />
    <Clock {...props} />
    {props.view !== 'escapement' && <Plate {...props} />}
    {WHEELS.filter(w => props.view !== 'escapement' || w.id === 'escape' || w.id === 'fourth').map(w => <TrainWheel key={w.id} wheel={w} state={props.state} explode={props.explode} selected={props.selected} onSelect={() => props.select(w.id)} path={props.path} />)}
    <Balance {...props} />
    <Fork {...props} />
    {props.view !== 'escapement' && <Winding {...props} />}
    {props.view !== 'escapement' && <PowerPath {...props} visible={props.path} />}
    <MotionWorks state={props.state} visible={props.view === 'dial'} />
    <Hands state={props.state} select={props.select} visible={props.view === 'dial'} />
    {props.labels && props.view !== 'dial' && <Labels {...props} />}
  </Canvas>
})
