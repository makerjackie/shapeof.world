import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCutaway } from './cutaway'
import * as T from 'three'

const vertex = `
varying vec3 vNormal; varying vec3 vView; varying vec3 vLocal; varying vec3 vObject; varying vec2 vUv; varying vec3 vWorld;
void main(){
 vLocal=position; vUv=uv;
 vec4 p=vec4(position,1.0); vec3 n=normal;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
 #endif
 vObject=p.xyz; vWorld=(modelMatrix*p).xyz;
 vec4 mv=modelViewMatrix*p; vView=-mv.xyz; vNormal=normalize(normalMatrix*n);
 gl_Position=projectionMatrix*mv;
}`

export function Membrane({ opacity = 1, color = '#cfe2e6', strength = 0.3, base = 0.015, fibers = false }: {
  opacity?: number; color?: string; strength?: number; base?: number; fibers?: boolean
}) {
  const cut = useCutaway()
  const uniforms = useMemo(() => ({
    clip: { value: new T.Vector4(0,0,0,1) },
    tint: { value: new T.Color(color) }, alpha: { value: opacity }, edge: { value: strength }, face: { value: base }, fibers: { value: fibers ? 1 : 0 },
  }), [color, opacity, strength, base, fibers])
  useFrame(() => { if(cut) uniforms.clip.value.set(cut.plane.normal.x,cut.plane.normal.y,cut.plane.normal.z,cut.plane.constant) })
  return <shaderMaterial transparent depthWrite={false} side={T.DoubleSide} uniforms={uniforms} vertexShader={vertex} fragmentShader={`
    varying vec3 vNormal; varying vec3 vView; varying vec3 vLocal; varying vec2 vUv; varying vec3 vWorld; uniform vec4 clip;
    uniform vec3 tint; uniform float alpha; uniform float edge; uniform float face; uniform float fibers;
    void main(){
      if(dot(clip,vec4(vWorld,1.0))<0.0) discard;
      float rim=pow(clamp(1.0-abs(dot(normalize(vNormal),normalize(vView))),0.0,1.0),2.8);
      float f1=pow(0.5+0.5*sin(vUv.x*780.0+vUv.y*460.0),24.0);
      float f2=pow(0.5+0.5*sin(vUv.x*720.0-vUv.y*380.0),26.0);
      float grain=fract(sin(dot(vLocal.xy,vec2(127.1,311.7)))*43758.5453);
      gl_FragColor=vec4(tint*(0.75+0.25*grain),alpha*(face+edge*rim+fibers*(f1+f2)*0.004));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`} />
}

export function ParticleMaterial({ opacity=0.3, diameter=0.045 }: { opacity?: number; diameter?: number }) {
  const cut=useCutaway(), { size }=useThree()
  const uniforms=useMemo(()=>({alpha:{value:opacity},diameter:{value:diameter},focal:{value:1000},clip:{value:new T.Vector4(0,0,0,1)}}),[opacity,diameter])
  useFrame(()=>{uniforms.focal.value=size.height/(2*Math.tan(Math.PI/12)); if(cut) uniforms.clip.value.set(cut.plane.normal.x,cut.plane.normal.y,cut.plane.normal.z,cut.plane.constant)})
  return <shaderMaterial transparent depthWrite={false} uniforms={uniforms}
    vertexShader={`uniform float diameter; uniform float focal; varying vec3 world; varying float coverage;
      void main(){vec4 w=modelMatrix*vec4(position,1.0);world=w.xyz;vec4 mv=viewMatrix*w;
      float pixels=diameter*length(modelMatrix[0].xyz)*focal/max(0.1,-mv.z);coverage=min(1.0,pixels*pixels);
      gl_PointSize=clamp(pixels,1.0,14.0);gl_Position=projectionMatrix*mv;}`}
    fragmentShader={`uniform vec4 clip; uniform float alpha; varying vec3 world; varying float coverage;
      void main(){if(dot(clip,vec4(world,1.0))<0.0) discard;float d=length(gl_PointCoord-0.5)*2.0;if(d>1.0)discard;
      gl_FragColor=vec4(vec3(0.47,0.54,0.41),alpha*coverage*(1.0-smoothstep(0.2,1.0,d)));}`} />
}

export function LightSheet({ intensity }: { intensity: number }) {
  const cut = useCutaway()
  const uniforms = useMemo(() => ({ intensity: { value: intensity }, alpha: { value: 1 }, clip: { value: new T.Vector4(0,0,0,1) } }), [intensity])
  useFrame(() => { if(cut) uniforms.clip.value.set(cut.plane.normal.x,cut.plane.normal.y,cut.plane.normal.z,cut.plane.constant) })
  return <shaderMaterial transparent depthWrite={false} blending={T.AdditiveBlending} side={T.DoubleSide} uniforms={uniforms}
    vertexShader={`varying vec2 vUv; varying vec3 vWorld; void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
    fragmentShader={`varying vec2 vUv; varying vec3 vWorld; uniform vec4 clip; uniform float intensity; uniform float alpha;
      void main(){
        if(dot(clip,vec4(vWorld,1.0))<0.0) discard;
        float x=vUv.x+(1.0-vUv.y)*0.28;
        float beams=exp(-pow((x-0.38)*13.0,2.0))+0.6*exp(-pow((x-0.7)*24.0,2.0))+0.25*exp(-pow((x-0.52)*28.0,2.0));
        float mask=smoothstep(0.0,0.16,vUv.y)*(1.0-smoothstep(0.85,1.0,vUv.y))*exp(-(1.0-vUv.y)*2.2);
        float shadow=0.78+0.22*sin(x*70.0+vUv.y*6.0);
        gl_FragColor=vec4(vec3(0.63,0.57,0.32),beams*mask*shadow*intensity*alpha*0.055);
      }`} />
}
