import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { Network } from '../sim/types'
type SignalClock = { time: number }
import { signalState } from '../sim/control'
import { sampleLane } from '../sim/geometry'
import { fillInstances } from './mesh-kit'
import { litMaterial } from './NightWorld'
import { unpackRoadGeometry, type PackedRoadGeometry } from './road-geometry'
import { UrbanGround } from './UrbanGround'

export const RoadMeshes = memo(function RoadMeshes({ network, atlas, prepared, simulation, roof }: { network: Network; atlas: T.Texture; prepared: PackedRoadGeometry; simulation: SignalClock; roof: T.Texture }) {
  const urban = network.carriageways.every(road => road.kind === 'urban')
  const hasUrban = urban || Boolean(network.urbanJunctions?.length)
  const assets = useMemo(() => {
    return { ...unpackRoadGeometry(prepared), asphalt: litMaterial(atlas, urban ? '#1d1f23' : '#2b2d30', urban ? 1.3 : 2.4, .9, roof), cement: litMaterial(atlas, '#5d6166', .85, .9, roof), edgeMaterial: litMaterial(atlas, '#9a9c9e', 1.7, .9, roof), underside: litMaterial(atlas, '#1b2028', 0.16, .9, roof) }
  }, [prepared, atlas, urban, roof])
  useEffect(() => () => { assets.pavement.dispose(); assets.concrete.dispose(); assets.edgeCaps.dispose(); assets.soffits.dispose(); assets.paint.dispose(); assets.yellow.dispose(); assets.asphalt.dispose(); assets.cement.dispose(); assets.edgeMaterial.dispose(); assets.underside.dispose() }, [assets])
  return <>
    <mesh geometry={assets.pavement} material={assets.asphalt} />
    {hasUrban && <UrbanGround network={network} atlas={atlas} />}
    <mesh geometry={assets.concrete} material={assets.cement} />
    <mesh geometry={assets.edgeCaps} material={assets.edgeMaterial} />
    <mesh geometry={assets.soffits} material={assets.underside} />
    <mesh geometry={assets.paint}><meshStandardMaterial color="#d9d6cc" emissive="#c8bd9b" emissiveIntensity={0.12} roughness={0.8} side={T.DoubleSide} /></mesh>
    <mesh geometry={assets.yellow}><meshStandardMaterial color="#d4a72c" emissive="#9f7200" emissiveIntensity={0.15} side={T.DoubleSide} /></mesh>
    <instancedMesh args={[undefined, assets.cement, assets.piers.length]} ref={m => { if (m) fillInstances(m, assets.piers) }}><cylinderGeometry args={[0.5, 0.64, 1, 12]} /></instancedMesh>
    <instancedMesh args={[undefined, assets.cement, assets.caps.length]} ref={m => { if (m) fillInstances(m, assets.caps) }}><boxGeometry /></instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.lampPoles.length]} ref={m => { if (m) fillInstances(m, assets.lampPoles) }}><cylinderGeometry args={[0.5, 0.7, 1, 8]} /><meshStandardMaterial color="#5e666c" metalness={0.6} roughness={0.45} /></instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.lampArms.length]} ref={m => { if (m) fillInstances(m, assets.lampArms) }}><boxGeometry /><meshStandardMaterial color="#505a64" metalness={0.6} roughness={0.4} /></instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.luminaires.length]} ref={m => { if (m) fillInstances(m, assets.luminaires) }}><boxGeometry /><meshBasicMaterial color={[4, 3.8, 3.5]} toneMapped={false} /></instancedMesh>
    {network.control.kind === 'signal' && <SignalLights network={network} simulation={simulation} />}
  </>
})

function SignalLights({ network, simulation }: { network: Network; simulation: SignalClock }) {
  const bulb = useRef<T.InstancedMesh>(null)
  const heads = useMemo(() => {
    const seen = new Set<string>()
    return network.lanes.filter(lane => lane.stopLine !== undefined && (lane.signalGroups?.length || lane.entry)).flatMap(lane => {
      if ((lane.signalGroups?.length ?? 0) > 1) return []
      const movement = network.movements.find(m => m.lanes.includes(lane.id))
      const groups = lane.signalGroups ?? [movement?.signalGroup ?? movement?.from ?? '']
      const sample = sampleLane(lane, lane.stopLine ?? lane.length), p = sample.position, { x: tx, z: tz } = sample.tangent
      const angle = Math.atan2(tx, tz)
      const node = network.urbanJunctions?.reduce((best, item) => Math.hypot(p.x - item.position.x, p.z - item.position.z) < Math.hypot(p.x - best.position.x, p.z - best.position.z) ? item : best)
      const key = `${node?.id ?? movement?.from}-${angle.toFixed(1)}-${groups.join('|')}`
      if (seen.has(key)) return []
      seen.add(key)
      let x = p.x + tx * 9 - tz * 6, z = p.z + tz * 9 + tx * 6
      if (node) {
        const fromNorthSouth = Math.abs(tz) > Math.abs(tx)
        const direction = fromNorthSouth ? tz > 0 ? 'north' : 'south' : tx > 0 ? 'west' : 'east'
        const arm = node.arms.find(arm => arm.direction === direction), half = arm?.halfWidth ?? 4
        const edge = Math.max(20, half + (node.cornerRadius ?? 12)) + 2
        const lateral = half + 1.3 + (lane.waitingArea ? 1.4 : 0)
        x = node.position.x - tx * edge - tz * lateral
        z = node.position.z - tz * edge + tx * lateral
      }
      return [{ x, z, angle, groups }]
    })
  }, [network])
  const o = useMemo(() => new T.Object3D(), [])
  const halos = useMemo(() => {
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(heads.flatMap(head => [0, 1, 2].flatMap(n => [head.x, 6.8 - n * 0.45, head.z])), 3))
    geometry.setAttribute('signalColor', new T.Float32BufferAttribute(new Float32Array(heads.length * 9), 3))
    const material = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute vec3 signalColor; varying vec3 glowColor; void main(){
        glowColor=signalColor; vec4 p=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*p; gl_PointSize=clamp(1000.0/max(1.0,-p.z),4.0,16.0);
      }`,
      fragmentShader: `varying vec3 glowColor; void main(){
        float r=length(gl_PointCoord-0.5)*2.0;
        float halo=exp(-r*r*5.5)*(1.0-smoothstep(0.7,1.0,r));
        gl_FragColor=vec4(glowColor,halo*0.4);
      }`,
    })
    return { geometry, material }
  }, [heads])
  useEffect(() => () => { halos.geometry.dispose(); halos.material.dispose() }, [halos])
  const signalColor = useMemo(() => new T.Color(), [])
  useFrame(() => {
    if (!bulb.current) return
    heads.forEach((head, i) => {
      const colors = head.groups.map(group => signalState(network.control, simulation.time, group))
      const state = colors.includes('green') ? 'green' : colors.includes('yellow') ? 'yellow' : 'red'
      for (let n = 0; n < 3; n++) {
        o.position.set(head.x, 6.8 - n * 0.45, head.z); o.rotation.set(0, head.angle, 0); o.scale.set(0.25, 0.25, 0.25); o.updateMatrix()
        bulb.current!.setMatrixAt(i * 3 + n, o.matrix)
        const active = state === (['red', 'yellow', 'green'] as const)[n]
        signalColor.set(active ? [0xff3022, 0xffb622, 0x5cffa0][n] : 0x091014).multiplyScalar(active ? 5 : 0.5)
        bulb.current!.setColorAt(i * 3 + n, signalColor)
        halos.geometry.getAttribute('signalColor').setXYZ(i * 3 + n, active ? signalColor.r : 0, active ? signalColor.g : 0, active ? signalColor.b : 0)
      }
    })
    halos.geometry.getAttribute('signalColor').needsUpdate = true
    bulb.current.instanceMatrix.needsUpdate = true
    if (bulb.current.instanceColor) bulb.current.instanceColor.needsUpdate = true
  })
  return <group>{heads.map((h, i) => <group key={i} position={[h.x, 0, h.z]} rotation={[0, h.angle, 0]}>
    <mesh position={[0.6, 3.4, 0.2]}><cylinderGeometry args={[0.1, 0.14, 6.8, 8]} /><meshStandardMaterial color="#7d8386" /></mesh>
    <mesh position={[0, 6.35, 0.2]}><boxGeometry args={[0.55, 1.65, 0.35]} /><meshStandardMaterial color="#12181b" /></mesh>
  </group>)}<points geometry={halos.geometry} material={halos.material} frustumCulled={false} /><instancedMesh ref={bulb} args={[undefined, undefined, heads.length * 3]} frustumCulled={false}><sphereGeometry args={[0.5, 8, 6]} /><meshBasicMaterial toneMapped={false} /></instancedMesh></group>
}
