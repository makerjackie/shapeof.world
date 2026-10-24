import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { RIVER_LEVEL, riverCenter } from './chongqing-context'

/** A dark distant water ribbon with restrained procedural shore-light glints. */
export function ChongqingRiver() {
  const assets = useMemo(() => {
    const positions: number[] = [], indices: number[] = []
    for (let i = 0; i <= 100; i++) {
      const z = -100 - i * 45
      for (const side of [-1, 1]) positions.push(riverCenter(z) + side * 245, RIVER_LEVEL, z)
      if (i) { const a = (i - 1) * 2; indices.push(a,a+1,a+2,a+1,a+3,a+2) }
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3)); geometry.setIndex(indices)
    const material = new T.ShaderMaterial({
      side: T.DoubleSide, uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec3 riverWorld; void main(){riverWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform float time; varying vec3 riverWorld;
        void main(){
          float shore=-2180.0+sin((riverWorld.z+200.0)/1100.0)*230.0;
          float edge=abs(riverWorld.x-shore)/245.0;
          float ripple=pow(max(0.0,sin(riverWorld.z*1.2+sin(riverWorld.x*.11+time*.2)*2.0)),18.0);
          float lights=pow(max(0.0,sin(riverWorld.z*.017+2.0)),12.0);
          vec3 water=vec3(.004,.008,.013)+vec3(.020,.013,.006)*ripple*lights*pow(edge,3.0);
          gl_FragColor=vec4(water,1.0);
        }`,
    })
    return { geometry, material }
  },[])
  useFrame(({ clock }) => { assets.material.uniforms.time.value=clock.elapsedTime })
  useEffect(()=>()=>{ assets.geometry.dispose(); assets.material.dispose() },[assets])
  return <mesh geometry={assets.geometry} material={assets.material}/>
}
