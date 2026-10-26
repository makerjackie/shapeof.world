import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, Group, MeshStandardMaterial } from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { maskGeometry } from './geometry'
import { PALETTES, maskVisible, type Layout, type Mask, type Palette } from './model'
const MASKS: Mask[] = ['nwell', 'diff', 'poly', 'licon', 'li', 'mcon', 'm1', 'v1', 'm2', 'v2', 'm3', 'v3', 'm4']
const HEIGHTS: Record<Mask, number> = { nwell: .006, diff: .035, poly: .12, licon: .19, li: .6, mcon: .68, m1: 1.4, v1: 1.49, m2: 2.4, v2: 2.49, m3: 3.4, v3: 3.49, m4: 4.4 }
const UPPER: Partial<Record<Mask, Mask>> = { licon: 'li', mcon: 'm1', v1: 'm2', v2: 'm3', v3: 'm4' }
type LayoutProps = { layout: Layout; view: 'layers' | 'cell'; peeled: number; spacing: number; palette: Palette; labels?: boolean; fade?: number }

function MaskLayer({ mask, polygons, bounds, peeled, spacing, palette, fade }: {
  mask: Mask; polygons: number[][]; bounds: number[]; peeled: number; spacing: number; palette: Palette; fade: number
}) {
  const group = useRef<Group>(null!)
  const material = useRef<MeshStandardMaterial>(null!)
  const isContact = !!UPPER[mask]
  const scale = 10 / ((bounds[2] - bounds[0]) / 1000)
  const geometry = useMemo(() => maskGeometry(polygons, [(bounds[0] + bounds[2]) / 2000, (bounds[1] + bounds[3]) / 2000], scale, isContact ? 1 : mask === 'nwell' ? .012 : mask.startsWith('m') ? .035 : .075), [polygons, bounds, scale, isContact, mask])
  useEffect(() => () => geometry.dispose(), [geometry])
  const visible = maskVisible(mask, peeled)
  const baseY = HEIGHTS[mask] * spacing
  const height = isContact ? (HEIGHTS[UPPER[mask]!] - HEIGHTS[mask]) * spacing : 1
  const colors = PALETTES[palette]
  const maskColor = mask === 'nwell' ? colors.well : isContact ? colors.via : colors[mask as 'diff' | 'poly' | 'li' | 'm1' | 'm2' | 'm3' | 'm4']
  const color = isContact || mask.startsWith('m') ? new Color('#8b9ba7').lerp(new Color(maskColor), .35) : new Color(maskColor)
  useFrame((_, dt) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const factor = reduced ? 1 : 1 - Math.exp(-Math.min(dt, .1) * 9)
    group.current.position.y += (baseY + (visible ? 0 : 2.4) - group.current.position.y) * factor
    material.current.opacity += ((visible ? fade : 0) - material.current.opacity) * factor
    group.current.visible = material.current.opacity > .015
  })
  return <group ref={group} position={[0, baseY, 0]} scale={[1, height, 1]}>
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={material} color={color} roughness={mask === 'diff' || mask === 'nwell' ? .85 : .34} metalness={mask.startsWith('m') || isContact ? .75 : .15} transparent opacity={visible ? fade : 0} />
    </mesh>
  </group>
}

export function LayoutModel({ layout, view, peeled, spacing, palette, labels = true, fade = 1 }: LayoutProps) {
  const tx = useExperienceI18n()
  const dataset = view === 'cell' ? layout.cell : layout
  const aspect = (dataset.bounds[3] - dataset.bounds[1]) / (dataset.bounds[2] - dataset.bounds[0])
  const colors = PALETTES[palette]
  return <group>
    <mesh position={[0, -.25, 0]}>
      <boxGeometry args={[10.15, .5, aspect * 10 + .15]} />
      <meshStandardMaterial color={colors.substrate} roughness={.64} metalness={.2} transparent opacity={fade} />
    </mesh>
    {MASKS.map(mask => <MaskLayer key={`${view}-${mask}`} mask={mask} polygons={dataset.layers[mask]} bounds={dataset.bounds} peeled={peeled} spacing={spacing} palette={palette} fade={fade} />)}
    {labels && view === 'cell' && peeled === 5 && <>
      <Html zIndexRange={[4,0]} position={[-3.5, .7, -5.5]} center className="cz-part-label cz-cell-label"><b>{tx('NMOS 栅指')}</b></Html>
      <Html zIndexRange={[4,0]} position={[-3.5, .7, 3.6]} center className="cz-part-label cz-cell-label"><b>{tx('PMOS 栅指')}</b></Html>
    </>}
  </group>
}
