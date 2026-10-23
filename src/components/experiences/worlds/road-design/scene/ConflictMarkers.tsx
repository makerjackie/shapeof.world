import { useEffect, useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { ConflictPoint, Network } from '../sim/types'
import { strip } from './mesh-kit'

const COLORS = { crossing: '#ff3d5a', merge: '#ffc23d', diverge: '#3dd6ff' }
const NAMES = { crossing: '交叉', merge: '合流', diverge: '分流' }
export function ConflictMarkers({ network, conflicts }: { network: Network; conflicts: ConflictPoint[] }) {
  const tx = useExperienceI18n(), [hover, setHover] = useState<string | null>(null)
  const weaving = useMemo(() => network.weaving.map(w => strip(w.points, w.width, 0, 0.11)), [network])
  useEffect(() => () => weaving.forEach(g => g.dispose()), [weaving])
  return <group>{conflicts.map(conflict => {
    const p = conflict.position, active = hover === conflict.id
    return <group key={conflict.id} position={[p.x, p.y + 0.22, p.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerOver={e => { e.stopPropagation(); setHover(conflict.id) }} onPointerOut={() => setHover(null)} onClick={e => { e.stopPropagation(); setHover(active ? null : conflict.id) }}>
        {conflict.separatedBySignal ? <ringGeometry args={[0.52, 0.75, 32]} /> : <circleGeometry args={[active ? 1 : 0.7, 24]} />}
        <meshBasicMaterial color={new T.Color(COLORS[conflict.type]).multiplyScalar(1.25)} toneMapped={false} transparent opacity={0.95} side={T.DoubleSide} depthWrite={false} />
      </mesh>
      {active && <Html center position={[0, 6, 0]} zIndexRange={[12, 8]}><div className="rd-conflict-tooltip" data-experience-overlay="true"><strong>{tx(NAMES[conflict.type])}</strong>{conflict.movements.map(id => <span key={id}>{tx(network.schematicMovements.find(m => m.id === id)?.name ?? id)}</span>)}{conflict.separatedBySignal && <small>{tx('由信号相位分开')}</small>}</div></Html>}
    </group>
  })}{weaving.map((geometry, i) => <mesh key={i} geometry={geometry}><meshBasicMaterial color="#c77dff" transparent opacity={0.22} side={T.DoubleSide} depthWrite={false} /></mesh>)}</group>
}
