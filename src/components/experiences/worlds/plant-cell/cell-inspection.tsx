import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { PhysiologyState } from './model'
import { useCutaway } from './cutaway'

const ORGANELLES = {
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
    if (['cell-er', 'cell-saline-gap', 'cell-hechtian-strands'].includes(selection.kind)) point.fromArray(selection.position)
    anchor.current.position.copy(point)
  })
  useEffect(() => { if (!enabled) setSelection(null) }, [enabled])
  const pick = (event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => {
    if (!enabled || !cut) return
    for (const hit of event.intersections) {
      point.copy(hit.point).applyMatrix4(cut.fromWorld)
      if (point.dot(cut.normal) > cut.offset + .03) continue
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
  const activity = selection?.kind === 'cell-saline-gap' ? '原生质体收缩后，外面的盐水填入壁与膜之间；不是空气。'
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
        <small>{ORGANELLES[selection.kind][2]} · {tx('参照尺寸')}</small>
        <span>{tx(activity)}</span>
      </div><i className="pc-label-leader" />
    </Html></group>}
  </group>
}
