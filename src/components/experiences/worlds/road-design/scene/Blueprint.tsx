import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { Network } from '../sim/types'
import { StretchAnchor } from './DisplayStretch'
import { LAYERS, screenLineMaterial } from './screen-lines'
import { unpackBlueprint } from './blueprint-data'
import type { WorkerTrafficRuntime } from './worker-runtime'
export {screenLines} from './screen-lines'

/** Screen-width drafting strokes, layer fills and animated one-way chevrons. */
export function Blueprint({ runtime }: { network: Network; runtime:WorkerTrafficRuntime }) {
  const prepared=runtime.blueprint
  const tx=useExperienceI18n()
  const assets=useMemo(()=>{
    const data=unpackBlueprint(prepared)
    return {
      labels:data.labels,
      lines:data.lines.map((geometry,i)=>({geometry,material:screenLineMaterial([1.5,.8,1.25][i],[.95,.55,.72][i])})),
      surfaces:data.surfaces.map((geometry,level)=>({geometry,material:new T.MeshBasicMaterial({color:LAYERS[level],transparent:true,opacity:.18+level*.035,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1})})),
    }
  },[prepared])
  useFrame(({size,clock})=>assets.lines.forEach(({material})=>{material.uniforms.resolution.value.set(size.width,size.height);material.uniforms.time.value=clock.elapsedTime}))
  useEffect(()=>()=>{for(const item of [...assets.lines,...assets.surfaces]){item.geometry.dispose();item.material.dispose()}},[assets])
  return <>
    {assets.surfaces.map((item,i)=><mesh key={`fill-${i}`} geometry={item.geometry} material={item.material}/>)}
    {assets.lines.map((item,i)=><mesh key={i} geometry={item.geometry} material={item.material} frustumCulled={false}/>)}
    {assets.labels.map(({level,point})=><StretchAnchor key={level} position={[point.x,point.y+3,point.z]}><Html center zIndexRange={[5,1]}><span className="rd-layer-label" style={{color:LAYERS[Math.min(4,level)]}}>{tx('层')} {level}</span></Html></StretchAnchor>)}
  </>
}

/** The drawing floor stays at physical height when infrastructure is stretched. */
export function BlueprintGround({ network }: { network: Network }) {
  const material = useMemo(() => new T.ShaderMaterial({uniforms:{base:{value:new T.Color('#191d23')},ink:{value:new T.Color('#2a3d52')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 p;uniform vec3 base;uniform vec3 ink;void main(){vec2 q=p.xy/20.;vec2 a=abs(fract(q-.5)-.5)/max(fwidth(q),vec2(.0001));float line=1.-min(1.,min(a.x,a.y));gl_FragColor=vec4(mix(base,ink,line*exp(-length(p.xy)*.00035)*.65),1.);}`}), [])
  useEffect(() => () => material.dispose(), [material])
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,network.terrain?Math.min(...network.terrain.values)-2:-.22,0]} material={material}><planeGeometry args={[20000,20000]}/></mesh>
}
