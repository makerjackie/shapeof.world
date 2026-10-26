import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { PhysiologyState } from './model'
import { cellRadius } from './cell-geometry'
import { useCutaway } from './cutaway'

const ORGANELLES = {
  'cell-wall': ['细胞壁', 'Cell wall', '≈ 0.2 μm'],
  'cell-membrane': ['细胞膜', 'Plasma membrane', '≈ 7 nm'],
  'cell-cytoplasm': ['胞质', 'Cytoplasm', '≈ 2–3 μm'],
  'cell-vacuole': ['液泡', 'Vacuole', '≈ 80%'],
  'cell-saline-gap': ['外液间隙', 'Extracellular saline gap', '0.5 M NaCl'],
  'cell-hechtian-strands': ['赫氏丝', 'Hechtian strands', '50–100 nm'],
  'wall-chloroplasts': ['叶绿体', 'Chloroplast', '5.2–6 × 3.3–3.8 × 2–2.3 μm'],
  'cell-nucleus': ['细胞核', 'Nucleus', '8 μm'],
  'streaming-mitochondria': ['线粒体', 'Mitochondrion', '0.5–1.5 μm'],
  'streaming-peroxisomes': ['过氧化物酶体', 'Peroxisome', '1 μm'],
  'streaming-golgi': ['高尔基体', 'Golgi apparatus', '≈ 1 μm'],
  'cell-er': ['内质网', 'Endoplasmic reticulum', '60–100 nm'],
} as const
type Organelle = keyof typeof ORGANELLES
type Selection = { kind: Organelle; position: [number, number, number]; instance?: number; object: T.Object3D }

/** Pick only exposed surfaces: Three's raycaster cannot see shader clipping. */
export function CellInspection({ children, enabled, physiology }: { children: ReactNode; enabled: boolean; physiology: MutableRefObject<PhysiologyState> }) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const cut = useCutaway(), point = useMemo(() => new T.Vector3(), []), tx = useExperienceI18n()
  const anchor = useRef<T.Group>(null), matrix = useMemo(() => new T.Matrix4(), [])
  useFrame(() => {
    if (!enabled || !selection || !anchor.current || !cut) return
    point.set(0, 0, 0)
    if (selection.object instanceof T.InstancedMesh && selection.instance !== undefined) {
      selection.object.getMatrixAt(selection.instance, matrix); point.applyMatrix4(matrix)
    }
    selection.object.localToWorld(point); point.applyMatrix4(cut.fromWorld)
    // ER is an extended network; retain its actual picked point.
    if (['cell-er', 'cell-saline-gap', 'cell-hechtian-strands', 'cell-wall', 'cell-membrane', 'cell-cytoplasm', 'cell-vacuole'].includes(selection.kind)) point.fromArray(selection.position)
    anchor.current.position.copy(point)
  })
  useEffect(() => { if (!enabled) setSelection(null) }, [enabled])
  const pick = (event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => {
    if (!enabled || !cut) return
    for (const hit of event.intersections) {
      point.copy(hit.point).applyMatrix4(cut.fromWorld)
      // Wall and retracting protoplast have independent clipping planes. Use
      // the hit material's actual world plane; one inspector owns all labels.
      if (hit.object instanceof T.Mesh) {
        const materials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material]
        const clipped = materials.some(material => {
          if (material.clippingPlanes?.some((plane: T.Plane) => plane.distanceToPoint(hit.point) < -.001)) return true
          const plane = (material as T.ShaderMaterial).uniforms?.clip?.value
          return plane instanceof T.Vector4 && plane.x * hit.point.x + plane.y * hit.point.y + plane.z * hit.point.z + plane.w < -.001
        })
        if (clipped) continue
      }
      if (hit.object.name.startsWith('cell-cut-')) {
        const local = hit.object.worldToLocal(hit.point.clone())
        const radius = cellRadius(local.y), boundary = Math.sqrt(Math.max(0, radius*radius-1.44))-Math.abs(local.x)
        let kind: Organelle = 'cell-wall'
        if (hit.object.name === 'cell-cut-contents') {
          if (boundary < .65) continue
          const inside = Math.min(cellRadius(local.y/.94)*.80-Math.abs(local.x), Math.hypot(local.x+8.9,local.y+12)-4.7)
          kind = boundary < .84 ? 'cell-membrane' : inside > 0 ? 'cell-vacuole' : 'cell-cytoplasm'
        }
        setSelection({kind,position:point.toArray(),object:hit.object})
        return
      }
      let object: T.Object3D | null = hit.object
      while (object && !(object.name in ORGANELLES)) object = object.parent
      if (!object) continue
      const kind = object.name as Organelle
      setSelection(old => old?.kind === kind && old.instance === hit.instanceId ? old : { kind, instance: hit.instanceId, position: point.toArray(), object: hit.object })
      return
    }
    setSelection(null)
  }
  const state = physiology.current
  const activity = selection?.kind === 'cell-wall' ? '最外面的纤维壁支撑细胞。'
    : selection?.kind === 'cell-membrane' ? '紧贴壁内侧，控制物质进出。'
    : selection?.kind === 'cell-cytoplasm' ? '细胞器和蛋白挤在壁与液泡之间。'
    : selection?.kind === 'cell-vacuole' ? '中央浅蓝区域储存水，膨压帮助细胞撑起来。'
    : selection?.kind === 'cell-saline-gap' ? '原生质体收缩后，外面的盐水填入壁与膜之间；不是空气。'
    : selection?.kind === 'cell-hechtian-strands' ? '质膜仍在这些点连接细胞壁，被拉成细丝。'
    : selection?.kind === 'wall-chloroplasts'
    ? state.actualPPFD === 0 ? '黑暗中消耗淀粉，缓慢移向底部和侧壁。' : state.chloroplasts.modeWeights.avoidance > .5 ? '缓慢移向侧壁，减少强光照射。' : '进行光合作用，缓慢调整向光位置。'
    : selection?.kind === 'streaming-mitochondria' ? '进行呼吸作用，随胞质流移动并翻转。'
    : selection?.kind === 'streaming-peroxisomes' ? '参与光呼吸和氧化物代谢，常在叶绿体旁停留。'
    : selection?.kind === 'streaming-golgi' ? '加工和分拣分子，沿胞质索走走停停。'
    : selection?.kind === 'cell-er' ? '在膜网络上合成和运输蛋白与脂质。'
    : '保存遗传信息，核孔连接核内外运输。'
  return <group onPointerMove={pick} onClick={pick} onPointerLeave={() => setSelection(null)} onPointerMissed={() => setSelection(null)}>
    {children}
    {enabled && selection && <group ref={anchor} position={selection.position}><Html center zIndexRange={[20, 15]} style={{ pointerEvents: 'none' }}>
      <div className="pc-organelle-label" data-organelle-label={selection.kind}>
        <b>{tx(ORGANELLES[selection.kind][0])}</b><em>{ORGANELLES[selection.kind][1]}</em>
        <small>{ORGANELLES[selection.kind][2]} · {tx(selection.kind === 'cell-saline-gap' ? '外液浓度' : '参照尺寸')}</small>
        <span>{tx(activity)}</span>
      </div><i className="pc-label-leader" />
    </Html></group>}
  </group>
}
