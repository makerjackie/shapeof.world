import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { getWaterReadings } from './water-model'
import { cellRadius } from './cell-geometry'
import { useCutaway } from './cutaway'
import type { PhysiologyState } from './model'

/** Bounded cortical proteins, outside the clear vacuole. Shapes and population
 * are illustrative families, not a tomographic reconstruction. */
export function CorticalCrowding({mobile,physiology,clock}:{mobile:boolean;physiology:MutableRefObject<PhysiologyState>;clock:MutableRefObject<number>}) {
  const cut=useCutaway(),count=mobile?100000:240000
  const geometry=useMemo(()=>{
    let seed=76211;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    const position=new Float32Array(count*3),colors=new Float32Array(count*3),diameters=new Float32Array(count)
    const palette=['#789eac','#a889b1','#c69c6b','#76a895'].map(h=>new T.Color(h))
    for(let i=0;i<count;i++){
      const y=(random()-.5)*62,a=random()*Math.PI*2,r=cellRadius(y)-.3-random()*1.7
      position.set([Math.cos(a)*r,y,Math.sin(a)*r],i*3)
      palette[i%4].toArray(colors,i*3);diameters[i]=i%11===0?.025:.009+random()*.008
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(position,3));g.setAttribute('color',new T.BufferAttribute(colors,3));g.setAttribute('diameter',new T.BufferAttribute(diameters,1));return g
  },[count])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  const uniforms=useMemo(()=>({alpha:{value:1},clip:{value:new T.Vector4(0,0,0,1)},time:{value:0},fold:{value:0},pixels:{value:1}}),[])
  useFrame(({size,camera})=>{
    if(cut)uniforms.clip.value.set(cut.plane.normal.x,cut.plane.normal.y,cut.plane.normal.z,cut.plane.constant)
    uniforms.time.value=clock.current;uniforms.fold.value=getWaterReadings(physiology.current.water).wrinkles
    uniforms.pixels.value=size.height/(2*Math.tan((camera as T.PerspectiveCamera).fov*Math.PI/360))
  })
  return <points name="cortical-protein-crowding" geometry={geometry} frustumCulled={false}>
    <shaderMaterial uniforms={uniforms} vertexColors transparent depthWrite={false} vertexShader={`
      uniform float time;uniform float fold;uniform float pixels;attribute float diameter;
      varying vec3 pigment;varying vec3 world;varying float coverage;
      void main(){
        vec3 p=position;p.xz*=1.-fold*.035*(.5+.5*sin(p.y*1.2));
        p+=vec3(sin(time*.5+p.y),cos(time*.7+p.z),sin(time*.6+p.x))*.009;
        vec4 w=modelMatrix*vec4(p,1.);world=w.xyz;vec4 mv=viewMatrix*w;
        float px=diameter*length(modelMatrix[0].xyz)*pixels/max(.01,-mv.z);
        coverage=min(1.,px*px);pigment=color;gl_PointSize=clamp(px,1.,9.);gl_Position=projectionMatrix*mv;
      }`} fragmentShader={`
      uniform float alpha;uniform vec4 clip;varying vec3 pigment;varying vec3 world;varying float coverage;
      void main(){if(dot(clip,vec4(world,1.))<0.)discard;float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
        vec3 c=mix(pigment,pigment*.55,smoothstep(.65,1.,r)*.45);gl_FragColor=vec4(c,alpha*coverage*.8);
        #include <colorspace_fragment>
      }`} />
  </points>
}
