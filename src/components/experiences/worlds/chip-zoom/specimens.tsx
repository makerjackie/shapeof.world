import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line, RoundedBox } from '@react-three/drei'
import { BoxGeometry, Color, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Shape, SphereGeometry, type Texture } from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { PALETTE, transistorState } from './model'
import { siliconLattice, type TransistorKind } from './scale-model'
import { batteryTexture, boardTexture, dieTexture, displayBackTexture, floorTexture, roundedRect, screenTexture, shadowTexture } from './textures'

/** The one semantic colour of this world: a conducting path, a signal of 1, the current selection. */
export const SIGNAL = '#5fd3bf'
const STEEL = '#c3ccd6'
type Vec3 = [number, number, number]

function useOwnedTexture<T extends Texture>(make: () => T, deps: unknown[] = []) {
 const map = useMemo(make, deps) // make is a fresh closure each render; deps name what it reads
 useEffect(() => () => map.dispose(), [map])
 return map
}
export function Block({ position, size, color, metal = false, opacity = 1, roughness, emissive, emissiveIntensity = 0 }: { position: Vec3; size: Vec3; color: string; metal?: boolean | number; opacity?: number; roughness?: number; emissive?: string; emissiveIntensity?: number }) {
 const metalness = metal === true ? .85 : metal === false ? .08 : metal
 return <mesh position={position}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={roughness ?? (metalness > .5 ? .3 : .6)} metalness={metalness} emissive={emissive ?? '#000000'} emissiveIntensity={emissiveIntensity} transparent={opacity < 1} opacity={opacity} userData={{ baseOpacity: opacity }}/></mesh>
}
function Label({ position, children }: { position: Vec3; children: ReactNode }) { return <Html zIndexRange={[4, 0]} position={position} center className="cz-part-label">{children}</Html> }

/** A soft pool of light with a faint grid, so each specimen stands on something instead of floating. */
function Floor({ y, size, x = 0, z = 0 }: { y: number; size: number; x?: number; z?: number }) {
 const map = useOwnedTexture(floorTexture)
 return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]} renderOrder={-2}><planeGeometry args={[size, size]}/><meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} userData={{ fixedBlend: true }}/></mesh>
}
function Shadow({ position, width, length, opacity = .75 }: { position: Vec3; width: number; length: number; opacity?: number }) {
 const aspect = length / width
 const map = useOwnedTexture(() => shadowTexture(aspect), [aspect])
 return <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} renderOrder={-1}><planeGeometry args={[width * 256 / 168, length * 256 * aspect / (256 * aspect - 88)]}/><meshBasicMaterial map={map} color="#000" transparent opacity={opacity} depthWrite={false} toneMapped={false} userData={{ fixedBlend: true, baseOpacity: opacity }}/></mesh>
}
/** A rounded slab extruded upward from y, with a small bevel that catches the rim light. */
function Slab({ width, length, radius, height, position = [0, 0, 0], bevel = 0, hole, children }: { width: number; length: number; radius: number; height: number; position?: Vec3; bevel?: number; hole?: [number, number, number]; children: ReactNode }) {
 const args = useMemo(() => {
  const shape = roundedRect(width - 2 * bevel, length - 2 * bevel, Math.max(.02, radius - bevel))
  if (hole) shape.holes.push(roundedRect(hole[0] + 2 * bevel, hole[1] + 2 * bevel, hole[2] + bevel, new Shape()))
  return [shape, { depth: Math.max(.001, height - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 }] as const
 }, [width, length, radius, height, bevel, hole])
 return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], position[1] + bevel, position[2]]}><extrudeGeometry args={args as unknown as ConstructorParameters<typeof ExtrudeGeometry>}/>{children}</mesh>
}
/** A thin flat strip between two points, used for flex cables. */
function Strip({ from, to, width, color, metal = .2 }: { from: Vec3; to: Vec3; width: number; color: string; metal?: number }) {
 const dy = to[1] - from[1], dz = to[2] - from[2], length = Math.hypot(dy, dz)
 return <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} rotation={[Math.atan2(-dy, dz), 0, 0]}><boxGeometry args={[width, .025, length]}/><meshStandardMaterial color={color} roughness={.42} metalness={metal}/></mesh>
}
/** A flat strip in the x–y plane between two points at the same z (the display flex as the display swings). */
function Ribbon({ from, to, z, width, color }: { from: [number, number]; to: [number, number]; z: number; width: number; color: string }) {
 const dx = to[0] - from[0], dy = to[1] - from[1]
 return <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]} rotation={[0, 0, Math.atan2(dy, dx)]}><boxGeometry args={[Math.hypot(dx, dy) + .04, .025, width]}/><meshStandardMaterial color={color} roughness={.42} metalness={.2}/></mesh>
}
/** Many small parts in two draw calls. */
function Scatter({ items, color, metal = .1, roughness = .55 }: { items: { position: Vec3; size: Vec3 }[]; color: string; metal?: number; roughness?: number }) {
 const mesh = useRef<InstancedMesh>(null!)
 const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
 useEffect(() => () => geometry.dispose(), [geometry])
 useLayoutEffect(() => {
  const matrix = new Matrix4()
  items.forEach((item, i) => { matrix.makeScale(...item.size); matrix.setPosition(...item.position); mesh.current.setMatrixAt(i, matrix) })
  mesh.current.instanceMatrix.needsUpdate = true
 }, [items])
 return <instancedMesh ref={mesh} args={[geometry, undefined, items.length]}><meshStandardMaterial color={color} metalness={metal} roughness={roughness}/></instancedMesh>
}
const random = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x) }

/* ------------------------------------------------------------------ phone */
const W = 10, L = 20.8, Y0 = -.62, YT = .16, BOARD = -.5, BOARD_TOP = -.43
/** Opening is two phases: the display swings open like a book (0–0.75), then the parts lift apart (0.75–1). */
export const phoneHinge = (open: number) => ease(open / .75)
/** The phone slides right as its display folds out to the left, so the pair stays centred. */
export const phoneShift = (open: number) => 5.25 * phoneHinge(open)
const BOARD_PARTS: { x: number; z: number; w: number; d: number; h: number }[] = [
 { x: 2.75, z: -3.8, w: 1.45, d: 1.9, h: .13 }, { x: -3.05, z: -3.05, w: 1.6, d: 1.45, h: .13 }, { x: -3.2, z: -5.25, w: 1.15, d: 1.05, h: .11 },
 { x: 2.5, z: -7.7, w: 1.9, d: 1.55, h: .13 }, { x: .15, z: -7.15, w: .85, d: .85, h: .1 }, { x: .2, z: -8.8, w: .75, d: .6, h: .09 }, { x: 3.75, z: -9.25, w: .6, d: .55, h: .09 },
]
const FENCES: [number, number, number, number][] = [[-1.65, 3.65, -5.05, -2.55], [1.35, 3.7, -8.75, -6.7]]
const CONNECTORS = [{ x: -3.3, z: -1.55, w: 1.7, d: .5 }, { x: 1.5, z: -1.5, w: 1.2, d: .45 }]
function boardShape() {
 const s = new Shape()
 s.moveTo(-4.45, 1); s.lineTo(4.45, 1); s.lineTo(4.45, 9.75); s.lineTo(-.85, 9.75); s.lineTo(-.85, 6.35); s.lineTo(-4.45, 6.35); s.lineTo(-4.45, 1)
 return s
}
function passives() {
 const rand = random(11), tan: { position: Vec3; size: Vec3 }[] = [], dark: { position: Vec3; size: Vec3 }[] = []
 const blocked = (x: number, z: number) => x < -4.3 || x > 4.3 || z > -1.15 || z < -9.6 || (x < -.7 && z < -6.2) || (Math.abs(x) < 1.55 && Math.abs(z + 3.8) < 1.55)
  || BOARD_PARTS.some(p => Math.abs(x - p.x) < p.w / 2 + .14 && Math.abs(z - p.z) < p.d / 2 + .14)
  || FENCES.some(([x0, x1, z0, z1]) => (Math.abs(x - x0) < .14 || Math.abs(x - x1) < .14) && z > z0 - .1 && z < z1 + .1 || (Math.abs(z - z0) < .14 || Math.abs(z - z1) < .14) && x > x0 - .1 && x < x1 + .1)
  || CONNECTORS.some(c => Math.abs(x - c.x) < c.w / 2 + .14 && Math.abs(z - c.z) < c.d / 2 + .14)
 for (let tries = 0; tries < 1400 && tan.length + dark.length < 150; tries++) {
  const x = -4.3 + rand() * 8.6, z = -9.6 + rand() * 8.45
  if (blocked(x, z)) continue
  const turn = rand() < .5, small = rand() < .6
  const size: Vec3 = turn ? [small ? .09 : .14, .06, small ? .17 : .26] : [small ? .17 : .26, .06, small ? .09 : .14]
  ;(rand() < .62 ? tan : dark).push({ position: [x, BOARD_TOP + .03, z], size })
 }
 return { tan, dark }
}
function Lens({ x, z, y }: { x: number; z: number; y: number }) {
 return <group position={[x, y, z]}>
  <mesh position={[0, .2, 0]}><cylinderGeometry args={[.68, .7, .4, 40]}/><meshStandardMaterial color="#4b535d" metalness={1} roughness={.28}/></mesh>
  <mesh position={[0, .41, 0]}><cylinderGeometry args={[.52, .52, .02, 40]}/><meshPhysicalMaterial color="#020306" roughness={.05} clearcoat={1} clearcoatRoughness={.03}/></mesh>
  <mesh position={[0, .425, 0]}><cylinderGeometry args={[.24, .24, .01, 32]}/><meshStandardMaterial color="#1f3550" metalness={.6} roughness={.12}/></mesh>
 </group>
}
export function Phone({ open, onChip, labels }: { open: number; onChip: () => void; labels: boolean }) {
 const tx = useExperienceI18n()
 const hinge = phoneHinge(open), settle = ease((hinge - .55) / .45), explode = ease((open - .75) / .25)
 const boardLift = explode * .55, batteryLift = explode * 1.35, chipLift = explode * .55
 const board = useOwnedTexture(() => { const t = boardTexture(7); t.repeat.set(1 / 8.9, 1 / 8.75); t.offset.set(.5, -1 / 8.75); return t })
 const screen = useOwnedTexture(() => { const t = screenTexture(); t.repeat.set(1 / 8.7, 1 / 19.5); t.offset.set(.5, .5); return t })
 const back = useOwnedTexture(() => { const t = displayBackTexture(); t.repeat.set(1 / 9, 1 / 19.8); t.offset.set(.5, .5); return t })
 const pouch = useOwnedTexture(batteryTexture)
 const boardArgs = useMemo(() => [boardShape(), { depth: BOARD_TOP - BOARD, bevelEnabled: false }] as const, [])
 const screenShape = useMemo(() => roundedRect(8.7, 19.5, .82), [])
 const backShape = useMemo(() => roundedRect(9.0, 19.8, .9), [])
 const small = useMemo(passives, [])
 const pivotX = -5.04 - .45 * settle, pivotY = YT + (Y0 - YT) * settle
 const batteryTop = BOARD + .46 + batteryLift
 return <group>
  <Floor y={Y0 - .012} size={50}/>
  <group position={[phoneShift(open), 0, 0]}>
   <Shadow position={[0, Y0 - .008, 0]} width={W} length={L}/>
   <Shadow position={[pivotX - 5.04, Y0 - .006, 0]} width={9.3} length={20.1} opacity={.7 * settle}/>
   {/* aluminium frame and the dark inner tub */}
   <Slab width={W} length={L} radius={1.35} height={YT - Y0} position={[0, Y0, 0]} bevel={.07} hole={[9.3, 20.1, 1.0]}><meshStandardMaterial color="#68717c" metalness={1} roughness={.27} envMapIntensity={1.35}/></Slab>
   <Slab width={9.42} length={20.2} radius={1.05} height={.12} position={[0, Y0, 0]}><meshStandardMaterial color="#171b20" metalness={.35} roughness={.7}/></Slab>
   {[[5.04, -4.6, 2.0], [-5.04, -6.35, 1.25], [-5.04, -4.75, 1.25]].map(([x, z, length]) => <RoundedBox key={`${x}${z}`} args={[.12, .3, length]} radius={.05} smoothness={3} position={[x, -.23, z]}><meshStandardMaterial color="#8a939d" metalness={1} roughness={.3}/></RoundedBox>)}
   <Block position={[0, -.24, 10.33]} size={[1.25, .26, .2]} color="#030405" roughness={.9}/>
   {/* logic board */}
   <group position={[0, boardLift, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BOARD, 0]}><extrudeGeometry args={boardArgs as unknown as ConstructorParameters<typeof ExtrudeGeometry>}/><meshStandardMaterial map={board} roughness={.5} metalness={.25}/></mesh>
    {BOARD_PARTS.map((p, i) => <RoundedBox key={i} args={[p.w, p.h, p.d]} radius={.025} smoothness={2} position={[p.x, BOARD_TOP + p.h / 2, p.z]}><meshStandardMaterial color={i % 3 === 1 ? '#191c20' : '#111316'} roughness={.4} metalness={.35}/></RoundedBox>)}
    {FENCES.flatMap(([x0, x1, z0, z1], i) => [
     <Block key={`${i}a`} position={[(x0 + x1) / 2, BOARD_TOP + .1, z0]} size={[x1 - x0, .2, .05]} color={STEEL} metal/>,
     <Block key={`${i}b`} position={[(x0 + x1) / 2, BOARD_TOP + .1, z1]} size={[x1 - x0, .2, .05]} color={STEEL} metal/>,
     <Block key={`${i}c`} position={[x0, BOARD_TOP + .1, (z0 + z1) / 2]} size={[.05, .2, z1 - z0]} color={STEEL} metal/>,
     <Block key={`${i}d`} position={[x1, BOARD_TOP + .1, (z0 + z1) / 2]} size={[.05, .2, z1 - z0]} color={STEEL} metal/>,
    ])}
    {CONNECTORS.map((c, i) => <Block key={i} position={[c.x, BOARD_TOP + .07, c.z]} size={[c.w, .14, c.d]} color={STEEL} metal roughness={.4}/>)}
    {[[4.05, -1.3], [-.45, -9.45], [4.05, -5.9], [-4.1, -1.3]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, BOARD_TOP + .03, z]}><cylinderGeometry args={[.12, .12, .06, 16]}/><meshStandardMaterial color="#9aa3ad" metalness={1} roughness={.35}/></mesh>)}
    <Scatter items={small.tan} color="#b9a37a" roughness={.6}/>
    <Scatter items={small.dark} color="#202326" metal={.3} roughness={.45}/>
    <Strip from={[1.5, batteryTop - boardLift + .01, -.3]} to={[1.5, BOARD_TOP + .15, -1.5]} width={.95} color="#b7772f"/>
    {/* the processor package: the click target that leads inward */}
    <group position={[0, BOARD_TOP + chipLift - boardLift, -3.8]} onClick={e => { e.stopPropagation(); onChip() }}>
     <Block position={[0, .03, 0]} size={[2.75, .06, 2.75]} color="#24382f" roughness={.7}/>
     <RoundedBox args={[2.3, .17, 2.3]} radius={.04} smoothness={3} position={[0, .145, 0]}><meshStandardMaterial color="#0f1214" roughness={.34} metalness={.45}/></RoundedBox>
     <mesh position={[-.9, .232, -.9]}><cylinderGeometry args={[.07, .07, .01, 16]}/><meshStandardMaterial color="#5c636b" roughness={.6}/></mesh>
     <Line points={[[-1.55, .26, -1.55], [1.55, .26, -1.55], [1.55, .26, 1.55], [-1.55, .26, 1.55], [-1.55, .26, -1.55]]} color={SIGNAL} lineWidth={2.2}/>
     {labels && hinge > .7 && <Label position={[0, .35, 2.55]}>{tx('处理器封装')}</Label>}
    </group>
   </group>
   {/* cameras sit in the board notch */}
   <RoundedBox args={[3.3, .3, 3.1]} radius={.1} smoothness={3} position={[-2.67, BOARD + .15, -8.05]}><meshStandardMaterial color="#23282e" metalness={.7} roughness={.38}/></RoundedBox>
   <Lens x={-3.42} z={-8.82} y={-.46}/><Lens x={-1.9} z={-7.3} y={-.46}/>
   <mesh position={[-1.88, -.18, -9.05]}><cylinderGeometry args={[.2, .2, .06, 24]}/><meshStandardMaterial color="#e6dcc0" roughness={.3} emissive="#e6dcc0" emissiveIntensity={.08}/></mesh>
   {/* battery: an unmarked foil pouch */}
   <group position={[0, batteryLift, 4.05]}>
    <RoundedBox args={[8.8, .46, 9.15]} radius={.17} smoothness={4} position={[0, BOARD + .23, 0]}><meshStandardMaterial color="#1d2228" metalness={.6} roughness={.42}/></RoundedBox>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BOARD + .462, 0]}><planeGeometry args={[8.5, 8.85]}/><meshStandardMaterial map={pouch} metalness={.35} roughness={.55}/></mesh>
   </group>
   <Block position={[-2.05, BOARD + .17, 9.45]} size={[3.1, .34, .85]} color="#1e2227" roughness={.6} metal={.3}/>
   {Array.from({ length: 12 }, (_, i) => <Block key={i} position={[-3.3 + i * .23, BOARD + .345, 9.45]} size={[.09, .01, .5]} color="#0a0b0d" roughness={.9}/>)}
   <RoundedBox args={[3.1, .36, .85]} radius={.08} smoothness={3} position={[2.05, BOARD + .18, 9.45]}><meshStandardMaterial color="#9aa2ab" metalness={1} roughness={.34}/></RoundedBox>
   {/* the display flex stays plugged into the board as the display swings open */}
   {hinge > .3 && (() => {
    const t = hinge * Math.PI, ax = pivotX + .94 * Math.cos(t) + .16 * Math.sin(t), ay = pivotY + .94 * Math.sin(t) - .16 * Math.cos(t)
    const bend: [number, number] = [-4.86, YT + .05], plug: [number, number] = [-3.3, BOARD_TOP + .15 + boardLift]
    return <><Ribbon from={[ax, ay]} to={bend} z={-1.55} width={.75} color="#b7772f"/><Ribbon from={bend} to={plug} z={-1.55} width={.75} color="#b7772f"/></>
   })()}
   {/* display assembly: hinges open along the left edge like a book */}
   <group position={[pivotX, pivotY, 0]} rotation={[0, 0, hinge * Math.PI]}>
    <group position={[5.04, 0, 0]}>
     <Slab width={9.24} length={20.04} radius={1.0} height={.14} position={[0, -.14, 0]} bevel={.03}><meshPhysicalMaterial color="#05070a" roughness={.07} metalness={.1} clearcoat={1} clearcoatRoughness={.04} envMapIntensity={1.4}/></Slab>
     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .003, 0]}><shapeGeometry args={[screenShape]}/><meshStandardMaterial map={screen} emissiveMap={screen} emissive="#ffffff" emissiveIntensity={.75} roughness={.16} metalness={0}/></mesh>
     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, -9.05]}><circleGeometry args={[.19, 24]}/><meshBasicMaterial color="#000"/></mesh>
     <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.143, 0]}><shapeGeometry args={[backShape]}/><meshStandardMaterial map={back} metalness={.55} roughness={.42}/></mesh>
     <Block position={[-3.75, -.19, -1.55]} size={[.7, .08, .9]} color={STEEL} metal roughness={.4}/>
    </group>
   </group>
  </group>
 </group>
}

/* ------------------------------------------------------------------ package */
export function Package({ open, labels }: { open: number; labels: boolean }) {
 const tx = useExperienceI18n()
 const substrate = useOwnedTexture(() => boardTexture(23, 512)), silicon = useOwnedTexture(dieTexture)
 const balls = useMemo(() => { const out: { position: Vec3; size: Vec3 }[] = []; for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) out.push({ position: [(i - 5) * .86, -.98, (j - 5) * .86], size: [.5, .5, .5] }); return out }, [])
 return <group>
  <Floor y={-1.33} size={44}/>
  <Shadow position={[0, -1.325, 0]} width={10.4} length={10.4}/>
  <RoundedBox args={[10, .5, 10]} radius={.06} smoothness={2} position={[0, -.45, 0]}><meshStandardMaterial map={substrate} color="#9fb5ad" roughness={.55} metalness={.2}/></RoundedBox>
  <SphereScatter items={balls}/>
  <Block position={[0, -.17, 0]} size={[6.1, .08, 6.1]} color="#3b3f3a" roughness={.8}/>
  <mesh position={[0, 0, 0]}><boxGeometry args={[5.7, .3, 5.7]}/><meshStandardMaterial map={silicon} metalness={.55} roughness={.2}/></mesh>
  {[[-3.9, -3.9], [3.9, -3.9], [-3.9, 3.9], [3.9, 3.9], [0, -4.1], [0, 4.1], [-4.1, 0], [4.1, 0]].map(([x, z], i) => <Block key={i} position={[x, -.13, z]} size={i < 4 ? [.7, .14, .36] : [.36, .14, .7]} color="#b9a37a" roughness={.6}/>)}
  <RoundedBox args={[9.2, .5, 9.2]} radius={.12} smoothness={3} position={[0, .62 + open * 4, 0]}><meshStandardMaterial color="#8a939d" metalness={1} roughness={.4}/></RoundedBox>
  {labels && <><Label position={[0, .9, 0]}>{tx('硅片')}</Label><Label position={[-4, -.5, 4]}>{tx('封装基板与焊球')}</Label></>}
 </group>
}
function SphereScatter({ items }: { items: { position: Vec3; size: Vec3 }[] }) {
 const mesh = useRef<InstancedMesh>(null!)
 const geometry = useMemo(() => new SphereGeometry(.66, 16, 12), [])
 useEffect(() => () => geometry.dispose(), [geometry])
 useLayoutEffect(() => { const m = new Matrix4(); items.forEach((item, i) => { m.makeScale(...item.size); m.setPosition(...item.position); mesh.current.setMatrixAt(i, m) }); mesh.current.instanceMatrix.needsUpdate = true }, [items])
 return <instancedMesh ref={mesh} args={[geometry, undefined, items.length]}><meshStandardMaterial color="#c6cbd1" metalness={.95} roughness={.22}/></instancedMesh>
}

/* ------------------------------------------------------------------ die */
const regions = [{ id: 'cpu', name: 'CPU', x: -2.9, z: -2.2, w: 3.5, h: 4.3, color: '#1f6e68' }, { id: 'gpu', name: 'GPU', x: 1.4, z: -2.2, w: 4.5, h: 4.3, color: '#4a4489' }, { id: 'cache', name: '缓存', x: -2, z: 2.7, w: 5.3, h: 3.5, color: '#29507a' }, { id: 'npu', name: 'NPU', x: 2.8, z: 2.7, w: 3.2, h: 3.5, color: '#7a3e6c' }] as const
export function Die({ labels, selected, onRegion }: { labels: boolean; selected: string; onRegion: (id: string) => void }) {
 const tx = useExperienceI18n()
 return <group>
  <Floor y={-.42} size={40}/>
  <Block position={[0, -.2, 0]} size={[10, .4, 10]} color="#1a1f2d" metal={.6} roughness={.3}/>
  {regions.map(r => {
   const on = selected === r.id, tile = new Color(r.color).lerp(new Color('#cfd8e0'), .3).getStyle(), tw = (r.w - .9) / 3
   return <group key={r.id} position={[r.x, .1, r.z]} onClick={e => { e.stopPropagation(); onRegion(r.id) }}>
    <Block position={[0, 0, 0]} size={[r.w, .17, r.h]} color={r.color} metal={.3} roughness={.5} emissive={r.color} emissiveIntensity={on ? .5 : 0}/>
    {Array.from({ length: r.id === 'cache' ? 12 : 6 }, (_, i) => <Block key={i} position={[-r.w / 2 + .3 + tw / 2 + (i % 3) * (tw + .15), .11, -r.h / 2 + .4 + Math.floor(i / 3) * .8]} size={[tw, .03, .52]} color={tile} metal={.5} roughness={.4}/>)}
    {labels && <Label position={[0, .5, 0]}>{r.name === '缓存' ? tx('缓存') : r.name}</Label>}
    {on && <Line points={[[-r.w / 2, .2, -r.h / 2], [r.w / 2, .2, -r.h / 2], [r.w / 2, .2, r.h / 2], [-r.w / 2, .2, r.h / 2], [-r.w / 2, .2, -r.h / 2]]} color={SIGNAL} lineWidth={3}/>}
   </group>
  })}
  {Array.from({ length: 40 }, (_, i) => <Block key={i} position={[-4.8 + (i % 10) * 1.05, .12, i < 10 ? -4.85 : i < 20 ? 4.85 : -4.85]} size={[.25, .08, .18]} color="#d3d8de" metal roughness={.3}/>)}
 </group>
}

/* ------------------------------------------------------------------ transistor */
function Electrons({ flowing, current, playing, speed, kind }: { flowing: boolean; current: number; playing: boolean; speed: number; kind: TransistorKind }) {
 const group = useRef<Group>(null!), elapsed = useRef(0)
 useFrame((_, dt) => {
  if (playing && !isWorldPaused() && !document.hidden) elapsed.current += Math.min(dt, .05) * speed
  group.current.children.forEach((child, i) => child.position.set(-4.8 + ((elapsed.current * (1 + current * 2) + i * .61) % 9.6), kind === 'planar' ? 1.05 : kind === 'fin' ? 1.7 : .95 + (i % 3) * .85, kind === 'planar' ? 1.55 : 0))
 })
 return <group ref={group} visible={flowing}>{Array.from({ length: 18 }, (_, i) => <mesh key={i}><sphereGeometry args={[.085, 10, 8]}/><meshBasicMaterial color="#d9fff7" toneMapped={false}/></mesh>)}</group>
}
export function Transistor({ gate, drain, playing, speed, kind, cutaway, labels }: { gate: number; drain: number; playing: boolean; speed: number; kind: TransistorKind; cutaway: boolean; labels: boolean }) {
 const tx = useExperienceI18n(), state = transistorState(gate, drain), c = PALETTE
 const channel = new Color('#2f3d44').lerp(new Color('#2aa58e'), state.channel ? .95 : 0).getStyle(), glow = state.channel ? .1 + state.relativeCurrent * .22 : 0
 const oxide = '#a9b8c4', gateMetal = .35
 return <group position={[0, -1.3, 0]}>
  <Floor y={-.81} size={44}/>
  <Shadow position={[0, -.795, 0]} width={10.2} length={4.8} opacity={.8}/>
  <Block position={[0, -.2, 0]} size={[10, 1.2, 4.6]} color="#2a3346" roughness={.75} metal={.15}/>
  {kind === 'planar' ? <>
   <Block position={[-3.25, .65, 0]} size={[3.3, .85, 3.6]} color={c.diff}/><Block position={[3.25, .65, 0]} size={[3.3, .85, 3.6]} color={c.diff}/>
   <Block position={[0, 1, 0]} size={[3.5, .12, 3.6]} color={channel} opacity={state.channel ? 1 : .25} emissive={SIGNAL} emissiveIntensity={glow}/>
   <Block position={[0, 1.2, cutaway ? -.7 : 0]} size={[3.6, .18, cutaway ? 2.2 : 3.7]} color={oxide}/>
   <Block position={[0, 1.75, cutaway ? -.7 : 0]} size={[3.35, .9, cutaway ? 1.9 : 3.4]} color={c.poly} metal={gateMetal} roughness={.4}/>
  </> : <>
   {[-3.9, 3.9].map(x => <Block key={x} position={[x, 1.5, 0]} size={[2.2, 2.8, 2.1]} color={c.diff}/>)}
   {kind === 'fin' ? <>
    <Block position={[0, 1.45, 0]} size={[6, 2.1, .55]} color={channel} emissive={SIGNAL} emissiveIntensity={glow}/>
    <Block position={[0, 2.7, 0]} size={[2.5, .3, 1.45]} color={oxide}/>
    <Block position={[0, 2.95, 0]} size={[2.3, .25, 1.4]} color={c.poly} metal={gateMetal} roughness={.4}/>
    {[-.62, .62].map(z => <group key={z} userData={{ cutFace: cutaway && z > 0 }}><Block position={[0, 1.55, z]} size={[2.4, 2.2, .25]} color={oxide} opacity={cutaway && z > 0 ? .14 : 1}/><Block position={[0, 1.55, z * 1.35]} size={[2.3, 2.3, .25]} color={c.poly} metal={gateMetal} roughness={.4} opacity={cutaway && z > 0 ? .14 : 1}/></group>)}
   </> : <>
    {[.85, 1.7, 2.55].map(y => <group key={y}>
     <Block position={[0, y, 0]} size={[6, .3, 1.7]} color={channel} emissive={SIGNAL} emissiveIntensity={glow}/>
     <Block position={[0, y + .26, 0]} size={[2.6, .18, 2.2]} color={oxide}/><Block position={[0, y - .26, 0]} size={[2.6, .18, 2.2]} color={oxide}/>
     <Block position={[0, y + .4, 0]} size={[2.4, .15, 2.2]} color={c.poly} metal={gateMetal} roughness={.4}/><Block position={[0, y - .4, 0]} size={[2.4, .15, 2.2]} color={c.poly} metal={gateMetal} roughness={.4}/>
     {[-1.12, 1.12].map(z => <group key={z} userData={{ cutFace: cutaway && z > 0 }}><Block position={[0, y, z]} size={[2.6, .65, .15]} color={oxide} opacity={cutaway && z > 0 ? .14 : 1}/><Block position={[0, y, z * 1.17]} size={[2.4, .8, .15]} color={c.poly} metal={gateMetal} roughness={.4} opacity={cutaway && z > 0 ? .14 : 1}/></group>)}
    </group>)}
   </>}
  </>}
  {[-3.9, 3.9].map(x => <Block key={x} position={[x, kind === 'planar' ? 1.5 : 3.25, -.45]} size={[1.4, .65, 1.6]} color={STEEL} metal roughness={.28}/>)}
  <Electrons flowing={state.flowing} current={state.relativeCurrent} playing={playing} speed={speed} kind={kind}/>
  {labels && <><Label position={[0, 4.2, 0]}><b>{tx('栅极')}</b><span>{gate.toFixed(2)} V</span></Label><Label position={[-4.5, 3.8, -.2]}><b>{tx('源极')}</b><span>0 V</span></Label><Label position={[4.5, 3.8, -.2]}><b>{tx('漏极')}</b><span>{drain.toFixed(1)} V</span></Label><Label position={[0, .9, 3]}>{state.channel ? tx('沟道已形成') : tx('沟道尚未形成')}</Label></>}
 </group>
}

/* ------------------------------------------------------------------ atoms */
export function Atoms({ labels }: { labels: boolean }) {
 const tx = useExperienceI18n(), lattice = useMemo(() => siliconLattice(), [])
 return <group>
  <Floor y={-5.6} size={44}/>
  {lattice.atoms.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[.21, 14, 10]}/><meshStandardMaterial color={i % 8 < 4 ? '#b3c6d8' : '#93b2c8'} metalness={.3} roughness={.35}/></mesh>)}
  <Line segments points={lattice.bonds.flatMap(([a, b]) => [lattice.atoms[a], lattice.atoms[b]])} color="#6f8ea3" lineWidth={1.3}/>
  {labels && <Label position={[0, 6, 0]}>{tx('金刚石型硅晶格')}<span>a ≈ 0.543 nm</span></Label>}
 </group>
}
