import { useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { ConflictPoint, Network } from '../sim/types'
import { strip } from './mesh-kit'

const COLORS = { crossing: '#ff3d5a', merge: '#ffc23d', diverge: '#3dd6ff' }
const NAMES = { crossing: '交叉', merge: '合流', diverge: '分流' }
function Marker({ conflict, active, onHover }: { conflict: ConflictPoint; active: boolean; onHover: (id: string | null) => void }) {
  const face = useRef<T.Group>(null), world = useMemo(() => new T.Vector3(), [])
  const glow = useMemo(() => new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
    uniforms: { color: { value: new T.Color(COLORS[conflict.type]).multiplyScalar(1.5) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform vec3 color; void main(){float r=length(vUv-0.5)*2.0; gl_FragColor=vec4(color,exp(-r*r*5.0)*0.45*smoothstep(1.0,0.3,r));}',
  }), [conflict.type])
  useEffect(() => () => glow.dispose(), [glow])
  useFrame(({ camera, size, clock }) => {
    const group = face.current
    if (!group) return
    group.getWorldPosition(world)
    const metresPerPixel = 2 * camera.position.distanceTo(world) * Math.tan((camera as T.PerspectiveCamera).fov * Math.PI / 360) / size.height
    const radius = Math.max(0.65, metresPerPixel * (active ? 6.5 : 5))
    group.quaternion.copy(camera.quaternion)
    group.scale.setScalar(radius * (!conflict.separatedBySignal && conflict.type === 'crossing' ? 1 + Math.sin(clock.elapsedTime * 2) * 0.04 : 1))
  })
  return <group ref={face}>
    <mesh material={glow}><planeGeometry args={[4, 4]} /></mesh>
    <mesh onPointerOver={e => { e.stopPropagation(); onHover(conflict.id) }} onPointerOut={() => onHover(null)} onClick={e => { e.stopPropagation(); onHover(active ? null : conflict.id) }}>
      {conflict.separatedBySignal ? <ringGeometry args={[0.68, 1, 32]} /> : <circleGeometry args={[1, 24]} />}
      <meshBasicMaterial color={new T.Color(COLORS[conflict.type]).multiplyScalar(1.7)} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
}
export function ConflictMarkers({ network, conflicts, showWeaving = true }: { network: Network; conflicts: ConflictPoint[]; showWeaving?: boolean }) {
  const tx = useExperienceI18n(), [hover, setHover] = useState<string | null>(null)
  const weaving = useMemo(() => network.weaving.map(w => strip(w.points, w.width, 0, 0.15)), [network])
  useEffect(() => () => weaving.forEach(g => g.dispose()), [weaving])
  return <group>{conflicts.map(conflict => {
    const p = conflict.position, active = hover === conflict.id
    return <group key={conflict.id} position={[p.x, p.y + 0.85, p.z]}>
      <Marker conflict={conflict} active={active} onHover={setHover} />
      {active && <Html center position={[0, 6, 0]} zIndexRange={[12, 8]}><div className="rd-conflict-tooltip" data-experience-overlay="true"><strong>{tx(NAMES[conflict.type])}</strong>{conflict.movements.map(id => <span key={id}>{(network.schematicMovements.find(m => m.id === id)?.name ?? id).split(' → ').map(part => tx(part)).join(' → ')}</span>)}{conflict.separatedBySignal && <small>{tx('由信号相位分开')}</small>}</div></Html>}
    </group>
  })}{showWeaving && weaving.map((geometry, i) => <mesh key={i} geometry={geometry}><meshBasicMaterial color="#c77dff" transparent opacity={0.25} side={T.DoubleSide} depthWrite={false} /></mesh>)}</group>
}
