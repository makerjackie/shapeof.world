import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { BufferGeometry, Color, Group, LineBasicMaterial, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Texture } from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { maskGeometry } from './geometry'
import { grainTexture } from './textures'
import { PALETTE, maskVisible, type Layout, type Mask } from './model'
const MASKS: Mask[] = ['nwell', 'diff', 'poly', 'licon', 'li', 'mcon', 'm1', 'v1', 'm2', 'v2', 'm3', 'v3', 'm4']
const HEIGHTS: Record<Mask, number> = { nwell: .006, diff: .035, poly: .12, licon: .19, li: .6, mcon: .68, m1: 1.4, v1: 1.49, m2: 2.4, v2: 2.49, m3: 3.4, v3: 3.49, m4: 4.4 }
const UPPER: Partial<Record<Mask, Mask>> = { licon: 'li', mcon: 'm1', v1: 'm2', v2: 'm3', v3: 'm4' }
/** In the tilted view each wiring level turns see-through, so the levels below show and the stack reads as stacked sheets. */
const TILT_ALPHA: Partial<Record<Mask, number>> = { li: .72, m1: .6, m2: .6, m3: .6, m4: .58 }
type LayoutProps = { layout: Layout; view: 'layers' | 'cell'; peeled: number; spacing: number; labels?: boolean; light?: number; field?: number; tilt?: number }
const ease = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

function MaskLayer({ mask, polygons, bounds, peeled, spacing, light, contacts, tiltMix, sheet, grain }: {
  mask: Mask; polygons: number[][]; bounds: number[]; peeled: number; spacing: number; light: number; contacts: number
  tiltMix: MutableRefObject<number>; sheet: boolean; grain: Texture
}) {
  const group = useRef<Group>(null!)
  const material = useRef<MeshPhysicalMaterial>(null!)
  const fill = useRef<MeshBasicMaterial>(null)
  const edge = useRef<LineBasicMaterial>(null)
  const isContact = !!UPPER[mask]
  const scale = 10 / ((bounds[2] - bounds[0]) / 1000)
  const depth = 10 * (bounds[3] - bounds[1]) / (bounds[2] - bounds[0])
  const geometry = useMemo(() => maskGeometry(polygons, [(bounds[0] + bounds[2]) / 2000, (bounds[1] + bounds[3]) / 2000], scale, isContact ? 1 : mask === 'nwell' ? .012 : mask.startsWith('m') ? .035 : .075), [polygons, bounds, scale, isContact, mask])
  const outline = useMemo(() => new BufferGeometry().setFromPoints([new Vector3(-5, 0, -depth / 2), new Vector3(5, 0, -depth / 2), new Vector3(5, 0, depth / 2), new Vector3(-5, 0, depth / 2)]), [depth])
  useEffect(() => () => { geometry.dispose(); outline.dispose() }, [geometry, outline])
  const visible = maskVisible(mask, peeled)
  const baseY = HEIGHTS[mask] * spacing
  const height = isContact ? (HEIGHTS[UPPER[mask]!] - HEIGHTS[mask]) * spacing : 1
  const metal = mask.startsWith('m') && !isContact
  const color = mask === 'nwell' ? PALETTE.well : isContact ? PALETTE.via : PALETTE[mask as 'diff' | 'poly' | 'li' | 'm1' | 'm2' | 'm3' | 'm4']
  const base = useMemo(() => new Color(color), [color])
  const glow = metal ? .07 : isContact ? .12 : mask === 'nwell' ? 0 : .04, env = metal || isContact ? 1.15 : 1
  useFrame((_, dt) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const factor = reduced ? 1 : 1 - Math.exp(-Math.min(dt, .1) * 9)
    const m = material.current, tilt = tiltMix.current
    group.current.position.y += (baseY + (visible ? 0 : 2.4) - group.current.position.y) * factor
    // Fade through dark, never through a pale wash: brightness drops first, transparency only once the layer is already dark.
    const alpha = 1 - tilt * (1 - (TILT_ALPHA[mask] ?? 1))
    const target = visible ? Math.min(1, light * 3) * alpha * (isContact ? contacts : 1) : 0
    m.opacity += (target - m.opacity) * factor
    m.color.copy(base).multiplyScalar(light)
    m.emissiveIntensity = glow * light
    m.envMapIntensity = env * light
    // The white sheen of a flat dielectric under a directional light is uniform in a top view; it must dim with the colour.
    m.specularIntensity = light * (metal || isContact ? 1 : .45)
    m.depthWrite = m.opacity > .98
    const shown = m.opacity / Math.max(alpha, .01)
    if (fill.current) fill.current.opacity = sheet ? shown * tilt * .07 * light : 0
    if (edge.current) edge.current.opacity = sheet ? shown * tilt * .7 * light : 0
    group.current.visible = m.opacity > .015
  })
  return <group ref={group} position={[0, baseY, 0]} scale={[1, height, 1]}>
    <mesh geometry={geometry}>
      {/* Aluminium wiring: grainy metal that catches the key and rim lights. Plugs and vias: warm tungsten-like pillars. */}
      <meshPhysicalMaterial ref={material} color={color} roughness={metal ? .5 : isContact ? .3 : mask === 'diff' || mask === 'nwell' ? .8 : .6} roughnessMap={metal ? grain : null} bumpMap={metal ? grain : null} bumpScale={metal ? .8 : 1} metalness={metal ? .85 : isContact ? .9 : .12} envMapIntensity={env} emissive={color} emissiveIntensity={glow} transparent opacity={0} />
    </mesh>
    {sheet && <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.002, 0]} renderOrder={-1}><planeGeometry args={[10, depth]} /><meshBasicMaterial ref={fill} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>
      <lineLoop geometry={outline}><lineBasicMaterial ref={edge} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} /></lineLoop>
    </>}
  </group>
}

export function LayoutModel({ layout, view, peeled, spacing, labels = true, light = 1, field = 1e-3, tilt = 0 }: LayoutProps) {
  const tx = useExperienceI18n()
  const dataset = view === 'cell' ? layout.cell : layout
  const aspect = (dataset.bounds[3] - dataset.bounds[1]) / (dataset.bounds[2] - dataset.bounds[0])
  const grain = useMemo(grainTexture, [])
  useEffect(() => () => grain.dispose(), [grain])
  const substrate = useRef<MeshStandardMaterial>(null!), tiltMix = useRef(tilt)
  const substrateColor = useMemo(() => new Color(PALETTE.substrate), [])
  // Contacts and vias are sub-pixel needles in the 150 μm overview; they appear once the field narrows below ~40 μm.
  const contacts = 1 - ease(Math.log10(22e-6), Math.log10(40e-6), Math.log10(field))
  useFrame((_, dt) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    tiltMix.current += ((view === 'layers' ? tilt : 0) - tiltMix.current) * (reduced ? 1 : 1 - Math.exp(-Math.min(dt, .1) * 5))
    substrate.current.color.copy(substrateColor).multiplyScalar(light)
    substrate.current.opacity = Math.min(1, light * 3)
    substrate.current.depthWrite = light > .33
  })
  return <group visible={light > .004}>
    <mesh position={[0, -.25, 0]}>
      <boxGeometry args={[10.15, .5, aspect * 10 + .15]} />
      <meshStandardMaterial ref={substrate} color={PALETTE.substrate} roughness={.55} metalness={.35} transparent opacity={1} />
    </mesh>
    {MASKS.map(mask => <MaskLayer key={`${view}-${mask}`} mask={mask} polygons={dataset.layers[mask]} bounds={dataset.bounds} peeled={peeled} spacing={spacing} light={light} contacts={contacts} tiltMix={tiltMix} sheet={view === 'layers' && !!TILT_ALPHA[mask]} grain={grain} />)}
    {labels && view === 'cell' && peeled === 5 && light > .9 && <>
      <Html zIndexRange={[4,0]} position={[-3.5, .7, -5.5]} center className="cz-part-label cz-cell-label"><b>{tx('NMOS 栅指')}</b></Html>
      <Html zIndexRange={[4,0]} position={[-3.5, .7, 3.6]} center className="cz-part-label cz-cell-label"><b>{tx('PMOS 栅指')}</b></Html>
    </>}
  </group>
}
