import { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { ConflictPoint, Network } from '../sim/types'
import { strip } from './mesh-kit'

/** Conflicts are one warm family, so none reads as the chosen route's cyan. */
const COLORS = { crossing: '#ff3d5a', merge: '#ffc23d', diverge: '#ff8a3d' }
const NAMES = { crossing: '交叉', merge: '合流', diverge: '分流' }
function Marker({ conflict, active, hovered, dim, onHover }: { conflict: ConflictPoint; active: boolean; hovered:boolean; dim:boolean; onHover: (id: string | null) => void }) {
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
    const radius = Math.max(0.3, metresPerPixel * (active ? 8 : dim?3:5))
    group.quaternion.copy(camera.quaternion)
    group.scale.setScalar(radius * (!conflict.separatedBySignal && conflict.type === 'crossing' ? 1 + Math.sin(clock.elapsedTime * 2) * 0.04 : 1))
  })
  return <group ref={face}>
    {!dim&&<mesh material={glow}><planeGeometry args={[4, 4]} /></mesh>}
    <mesh onPointerOver={e => { e.stopPropagation(); onHover(conflict.id) }} onPointerOut={() => onHover(null)} onClick={e => { e.stopPropagation(); onHover(hovered ? null : conflict.id) }}>
      <circleGeometry args={[1.3, 24]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {conflict.type==='crossing'?<><Line points={[[-.8,-.8,0],[.8,.8,0]]} color={COLORS.crossing} lineWidth={active?2.4:1.4} transparent opacity={dim?.16:1} depthTest={false}/><Line points={[[.8,-.8,0],[-.8,.8,0]]} color={COLORS.crossing} lineWidth={active?2.4:1.4} transparent opacity={dim?.16:1} depthTest={false}/></>:<>
      <Line points={[[-.8,conflict.type==='merge'?.8:-.8,0],[0,0,0],[.8,conflict.type==='merge'?.8:-.8,0]]} color={COLORS[conflict.type]} lineWidth={active?2.4:1.4} transparent opacity={dim?.16:1} depthTest={false}/>
      <Line points={[[0,0,0],[0,conflict.type==='merge'?-.9:.9,0]]} color={COLORS[conflict.type]} lineWidth={active?2.4:1.4} transparent opacity={dim?.16:1} depthTest={false}/>
    </>}
  </group>
}
export function ConflictMarkers({ network, conflicts, showWeaving = true, selected }: { network: Network; conflicts: ConflictPoint[]; showWeaving?: boolean; selected?:ConflictPoint[] }) {
  const tx = useExperienceI18n(), [hover, setHover] = useState<string | null>(null)
  const weaving = useMemo(() => network.weaving.map(w => strip(w.points, w.width, 0, 0.15)), [network])
  useEffect(() => () => weaving.forEach(g => g.dispose()), [weaving])
  const chosen=selected?.filter(c=>conflicts.some(other=>other.id===c.id))
  return <group>{chosen&&<RouteConflictLabels conflicts={chosen}/>} {conflicts.map(conflict => {
    const p = conflict.position, chosen=selected?.some(c=>c.id===conflict.id)??false, active = hover === conflict.id||chosen
    return <group key={conflict.id} position={[p.x, p.y + 0.85, p.z]}>
      <Marker conflict={conflict} active={active} hovered={hover===conflict.id} dim={!!selected&&!chosen} onHover={setHover} />
      {hover===conflict.id && <Html center position={[0, 6, 0]} zIndexRange={[12, 8]}><div className="rd-conflict-tooltip" data-experience-overlay="true"><strong>{tx(NAMES[conflict.type])}</strong>{conflict.movements.map(id => <span key={id}>{(network.schematicMovements.find(m => m.id === id)?.name ?? id).split(' → ').map(part => tx(part)).join(' → ')}</span>)}{conflict.separatedBySignal && <small>{tx('由信号相位分开')}</small>}</div></Html>}
    </group>
  })}{showWeaving && weaving.map((geometry, i) => <mesh key={i} geometry={geometry}><meshBasicMaterial color="#c77dff" transparent opacity={0.25} side={T.DoubleSide} depthWrite={false} /></mesh>)}</group>
}

/** Keep close geometric points distinct without moving their world locations.
 * Leaders terminate at the exact road position; only the small badges spread. */
function RouteConflictLabels({conflicts}:{conflicts:ConflictPoint[]}) {
  const {size}=useThree(),root=useRef<SVGSVGElement>(null),v=useMemo(()=>new T.Vector3(),[])
  useFrame(({camera,size})=>{
    const points=conflicts.map(c=>{v.set(c.position.x,c.position.y+.85,c.position.z).project(camera);return {x:(v.x+1)*size.width/2,y:(1-v.y)*size.height/2,visible:v.z<1}})
    const labels=points.map(p=>({x:p.x+25,y:p.y-20}))
    for(let pass=0;pass<20;pass++)for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j],dx=b.x-a.x,dy=b.y-a.y
      if(Math.abs(dx)<47&&Math.abs(dy)<30){
        // Separate along the smaller required displacement, with a stable tie.
        if(47-Math.abs(dx)<30-Math.abs(dy)){const d=(47-Math.abs(dx))/2,s=dx<0?-1:1;a.x-=d*s;b.x+=d*s}
        else {const d=(30-Math.abs(dy))/2,s=dy<0?-1:1;a.y-=d*s;b.y+=d*s}
      }
    }
    points.forEach((p,i)=>{
      const group=root.current?.children[i] as SVGGElement|undefined
      if(!group)return
      const label=labels[i]
      group.style.display=p.visible?'':'none'
      group.children[0].setAttribute('d',`M${p.x},${p.y}L${label.x},${label.y}`)
      group.children[1].setAttribute('cx',String(p.x));group.children[1].setAttribute('cy',String(p.y))
      group.children[2].setAttribute('transform',`translate(${label.x},${label.y})`)
    })
  })
  return <Html calculatePosition={()=>[0,0]} zIndexRange={[6,5]} style={{pointerEvents:'none'}}><svg ref={root} width={size.width} height={size.height} style={{overflow:'hidden'}}>{conflicts.map(c=>{
    const n=conflicts.filter(p=>p.type===c.type).findIndex(p=>p.id===c.id)+1
    return <g key={c.id} color={COLORS[c.type]}><path stroke="currentColor" strokeWidth="1" opacity=".7"/><circle r="2" fill="currentColor"/><g data-route-conflict={c.type} data-conflict-id={c.id} data-world-position={JSON.stringify(c.position)}>
      <rect x="-19" y="-11" width="38" height="22" rx="3" fill="#0e1114" stroke="currentColor"/>
      <path d={c.type==='crossing'?'M-12-4L-4 4M-4-4L-12 4':c.type==='merge'?'M-12-4L-8 0L-4-4M-8 0V5':'M-12 4L-8 0L-4 4M-8 0V-5'} fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <text x="7" y="4" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="sans-serif">{n}</text>
    </g></g>
  })}</svg></Html>
}
