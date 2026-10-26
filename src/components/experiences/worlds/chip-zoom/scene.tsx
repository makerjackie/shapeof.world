import { memo, useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { Color, Group, MeshStandardMaterial, Vector3 } from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { maskGeometry } from './geometry'
import { PALETTES, maskVisible, transistorState, type Layout, type Mask, type Palette, type View } from './model'

const MASKS: Mask[] = ['nwell', 'diff', 'poly', 'licon', 'li', 'mcon', 'm1', 'v1', 'm2', 'v2', 'm3', 'v3', 'm4']
const HEIGHTS: Record<Mask, number> = { nwell: .006, diff: .035, poly: .12, licon: .19, li: .6, mcon: .68, m1: 1.4, v1: 1.49, m2: 2.4, v2: 2.49, m3: 3.4, v3: 3.49, m4: 4.4 }
const UPPER: Partial<Record<Mask, Mask>> = { licon: 'li', mcon: 'm1', v1: 'm2', v2: 'm3', v3: 'm4' }
type SceneProps = {
  layout: Layout; view: View; peeled: number; spacing: number; palette: Palette
  gate: number; drain: number; playing: boolean; speed: number; touched: boolean
  revision: number; onInteract: () => void; onReady: () => void
}

function MaskLayer({ mask, polygons, bounds, peeled, spacing, palette }: {
  mask: Mask; polygons: number[][]; bounds: number[]; peeled: number; spacing: number; palette: Palette
}) {
  const group = useRef<Group>(null!)
  const material = useRef<MeshStandardMaterial>(null!)
  const isContact = !!UPPER[mask]
  const scale = 10 / ((bounds[2] - bounds[0]) / 1000)
  const geometry = useMemo(() => maskGeometry(polygons, [(bounds[0] + bounds[2]) / 2000, (bounds[1] + bounds[3]) / 2000], scale, isContact ? 1 : mask === 'nwell' ? .012 : .075), [polygons, bounds, scale, isContact, mask])
  useEffect(() => () => geometry.dispose(), [geometry])
  const visible = maskVisible(mask, peeled)
  const baseY = HEIGHTS[mask] * spacing
  const height = isContact ? (HEIGHTS[UPPER[mask]!] - HEIGHTS[mask]) * spacing : 1
  const colors = PALETTES[palette]
  const color = mask === 'nwell' ? colors.well : isContact ? colors.via : colors[mask as 'diff' | 'poly' | 'li' | 'm1' | 'm2' | 'm3' | 'm4']
  useFrame((_, dt) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const factor = reduced ? 1 : 1 - Math.exp(-Math.min(dt, .1) * 9)
    group.current.position.y += (baseY + (visible ? 0 : 2.4) - group.current.position.y) * factor
    material.current.opacity += ((visible ? 1 : 0) - material.current.opacity) * factor
    group.current.visible = material.current.opacity > .015
  })
  return <group ref={group} position={[0, baseY, 0]} scale={[1, height, 1]}>
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={material} color={color} roughness={mask === 'diff' || mask === 'nwell' ? .85 : .38} metalness={mask === 'poly' ? .15 : isContact ? .55 : .28} transparent opacity={visible ? 1 : 0} />
    </mesh>
  </group>
}

function LayoutModel({ layout, view, peeled, spacing, palette }: Pick<SceneProps, 'layout' | 'view' | 'peeled' | 'spacing' | 'palette'>) {
  const tx = useExperienceI18n()
  const dataset = view === 'cell' ? layout.cell : layout
  const aspect = (dataset.bounds[3] - dataset.bounds[1]) / (dataset.bounds[2] - dataset.bounds[0])
  const colors = PALETTES[palette]
  return <group>
    <mesh position={[0, -.25, 0]}>
      <boxGeometry args={[10.15, .5, aspect * 10 + .15]} />
      <meshStandardMaterial color={colors.substrate} roughness={.64} metalness={.2} />
    </mesh>
    {MASKS.map(mask => <MaskLayer key={`${view}-${mask}`} mask={mask} polygons={dataset.layers[mask]} bounds={dataset.bounds} peeled={peeled} spacing={spacing} palette={palette} />)}
    {view === 'cell' && peeled === 5 && <>
      <Html position={[-3.5, .7, -5.5]} center className="cz-part-label cz-cell-label"><b>{tx('NMOS 栅指')}</b></Html>
      <Html position={[-3.5, .7, 3.6]} center className="cz-part-label cz-cell-label"><b>{tx('PMOS 栅指')}</b></Html>
    </>}
  </group>
}

function Block({ position, size, color, opacity = 1 }: { position: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return <mesh position={position}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.46} metalness={.12} transparent={opacity < 1} opacity={opacity} /></mesh>
}

function Electrons({ flowing, current, playing, speed }: { flowing: boolean; current: number; playing: boolean; speed: number }) {
  const group = useRef<Group>(null!)
  const elapsed = useRef(0)
  useFrame((_, dt) => {
    if (playing && !isWorldPaused() && !document.hidden) elapsed.current += Math.min(dt, .05) * speed
    group.current.children.forEach((child, i) => {
      // Electrons drift from source (left, 0 V) to positive drain (right).
      child.position.set(-4.8 + ((elapsed.current * (1 + current * 2) + i * .61) % 9.6), 1.05, 1.55 + (i % 3 - 1) * .2)
    })
  })
  return <group ref={group} visible={flowing}>{Array.from({ length: 16 }, (_, i) => <mesh key={i}><sphereGeometry args={[.075, 8, 6]} /><meshBasicMaterial color="#f8fffb" /></mesh>)}</group>
}

function Transistor({ gate, drain, playing, speed, palette }: Pick<SceneProps, 'gate' | 'drain' | 'playing' | 'speed' | 'palette'>) {
  const tx = useExperienceI18n()
  const state = transistorState(gate, drain)
  const color = PALETTES[palette]
  const channelColor = useMemo(() => new Color('#788c8e').lerp(new Color('#45b7a1'), state.relativeCurrent), [state.relativeCurrent])
  return <group position={[0, -.6, 0]}>
    <Block position={[0, -.1, 0]} size={[12, 2.1, 5.8]} color={color.well} />
    <Block position={[-3.9, .55, 0]} size={[3.5, .85, 4.2]} color={color.diff} />
    <Block position={[3.9, .55, 0]} size={[3.5, .85, 4.2]} color={color.diff} />
    <Block position={[0, .98, 0]} size={[4.4, .1, 4.2]} color={channelColor.getStyle()} opacity={state.channel ? .95 : .13} />
    <Block position={[0, 1.13, -.85]} size={[4.65, .2, 2.9]} color="#e7e9ee" opacity={.85} />
    <Block position={[0, 1.7, -.85]} size={[4.4, .9, 2.5]} color={color.poly} />
    <Block position={[-4.2, 1.5, -.9]} size={[1.6, 1.05, 1.9]} color={color.m4} />
    <Block position={[4.2, 1.5, -.9]} size={[1.6, 1.05, 1.9]} color={color.m4} />
    {state.channel && [-1.4, 0, 1.4].map(x => <group key={x} position={[x, 1.45, 1.2]}>
      <mesh><cylinderGeometry args={[.025, .025, .55, 6]} /><meshBasicMaterial color="#d18ba7" /></mesh>
      <mesh position={[0, -.3, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[.09, .17, 8]} /><meshBasicMaterial color="#d18ba7" /></mesh>
    </group>)}
    <Electrons flowing={state.flowing} current={state.relativeCurrent} playing={playing} speed={speed} />
    <Html position={[0, 3, -.8]} center className="cz-part-label"><b>{tx('栅极')}</b><span>{state.vgs.toFixed(2)} V</span></Html>
    <Html position={[-4.5, 2.8, -.9]} center className="cz-part-label"><b>{tx('源极')}</b><span>0 V</span></Html>
    <Html position={[4.5, 2.8, -.9]} center className="cz-part-label"><b>{tx('漏极')}</b><span>{state.vds.toFixed(1)} V</span></Html>
    <Html position={[0, 1, 3.1]} center className="cz-part-label cz-channel-label"><b>{state.channel ? tx('沟道已形成') : tx('沟道尚未形成')}</b></Html>
  </group>
}

function Camera({ view, revision, touched, playing, onInteract }: Pick<SceneProps, 'view' | 'revision' | 'touched' | 'playing' | 'onInteract'>) {
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null!)
  const { camera, size } = useThree()
  useEffect(() => {
    const isCell = view === 'cell'
    const capture = new URLSearchParams(window.location.search).get('capture') === '1'
    const fit = capture ? Math.max(1, .95 / (size.width / size.height)) : 1
    camera.position.set((isCell ? 19 : 13) * fit, (isCell ? 19 : 12) * fit, (isCell ? 24 : 17) * fit)
    orbit.current.target.set(0, view === 'transistor' ? .5 : 1.5, 0)
    orbit.current.update()
  }, [camera, view, revision, size.width, size.height])
  return <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.1} minDistance={3} maxDistance={65} maxPolarAngle={Math.PI * .48} autoRotate={!touched && playing} autoRotateSpeed={.22} onStart={onInteract} target={new Vector3(0, 1.5, 0)} />
}

function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  useFrame(() => { if (++frames.current === 3) onReady() })
  return null
}

export const ChipScene = memo(function ChipScene(props: SceneProps) {
  const colors = PALETTES[props.palette]
  return <Canvas dpr={[1, 1.5]} camera={{ position: [16, 14, 20], fov: 38, near: .05, far: 200 }} gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}>
    <color attach="background" args={[colors.background]} />
    <ambientLight intensity={.6} />
    <hemisphereLight args={['#ffffff', '#61738b', .9]} />
    <directionalLight position={[-9, 17, 10]} intensity={2.1} color="#ffffff" />
    <directionalLight position={[12, 6, -8]} intensity={.65} color="#c4daff" />
    {props.view === 'transistor' ? <Transistor {...props} /> : <LayoutModel {...props} />}
    <Camera {...props} />
    <Ready onReady={props.onReady} />
  </Canvas>
})
