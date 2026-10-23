import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network } from '../sim/types'
import { strip } from './mesh-kit'

const LAYERS = ['#2b4a6f', '#3f6f9f', '#5b97c9', '#85c0e8', '#bfe3ff']
/** Same DesignSpec geometry, shown as drafting lines instead of night materials. */
export function Blueprint({ network }: { network: Network }) {
  const assets = useMemo(() => {
    const lines: { geometry: T.BufferGeometry; material: T.MeshBasicMaterial }[] = []
    for (const road of network.carriageways) {
      const width = road.laneCount * road.laneWidth + (road.medianWidth ?? 0) + 2 * (road.shoulder ?? 0)
      const color = LAYERS[Math.min(4, Math.max(0, road.level))]
      for (const side of [-1, 1]) lines.push({ geometry: strip(road.points, 0.34, side * width / 2, 0.04, road.superelevation), material: new T.MeshBasicMaterial({ color, side: T.DoubleSide }) })
      for (let lane = 1; lane < road.laneCount; lane++) {
        const base = (lane - road.laneCount / 2) * road.laneWidth, median = road.medianWidth ?? 0
        const offsets = base === 0 && median ? [-median / 2, median / 2] : [base + Math.sign(base) * median / 2]
        for (const offset of offsets) lines.push({ geometry: strip(road.points, 0.13, offset, 0.05), material: new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: T.DoubleSide }) })
      }
    }
    for (const lane of network.lanes.filter(lane => lane.kind === 'connector')) lines.push({ geometry: strip(lane.points, 0.10, 0, 0.06), material: new T.MeshBasicMaterial({ color: LAYERS[Math.min(4, lane.level)], transparent: true, opacity: 0.32, side: T.DoubleSide }) })
    const grid = new T.ShaderMaterial({
      uniforms: { base: { value: new T.Color('#07121f') }, ink: { value: new T.Color('#12263d') } },
      vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec3 p; uniform vec3 base; uniform vec3 ink; void main(){
        vec2 q=p.xy/20.0;vec2 a=abs(fract(q-0.5)-0.5)/max(fwidth(q),vec2(0.0001));
        float line=1.0-min(1.0,min(a.x,a.y)); float fade=exp(-length(p.xy)*0.00035);
        gl_FragColor=vec4(mix(base,ink,line*fade*0.65),1.0);
      }`,
    })
    return { lines, grid }
  }, [network])
  useEffect(() => () => { assets.lines.forEach(line => { line.geometry.dispose(); line.material.dispose() }); assets.grid.dispose() }, [assets])
  return <>
    <color attach="background" args={['#07121f']} />
    <fogExp2 attach="fog" args={['#07121f', 0.00025]} />
    <ambientLight intensity={0.65} color="#8ab4ff" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} material={assets.grid}><planeGeometry args={[20000, 20000]} /></mesh>
    {assets.lines.map((line, index) => <mesh key={index} geometry={line.geometry} material={line.material} />)}
  </>
}
