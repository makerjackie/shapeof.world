import { useMemo } from 'react'
import * as T from 'three'

const vertex = `
varying vec3 vNormal; varying vec3 vView; varying vec3 vLocal; varying vec3 vObject; varying vec2 vUv;
void main(){
 vLocal=position; vUv=uv;
 vec4 p=vec4(position,1.0); vec3 n=normal;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
 #endif
 vObject=p.xyz;
 vec4 mv=modelViewMatrix*p; vView=-mv.xyz; vNormal=normalize(normalMatrix*n);
 gl_Position=projectionMatrix*mv;
}`

export function Membrane({ opacity = 1, color = '#cfe2e6', strength = 0.3, base = 0.015, fibers = false }: {
  opacity?: number; color?: string; strength?: number; base?: number; fibers?: boolean
}) {
  const uniforms = useMemo(() => ({
    tint: { value: new T.Color(color) }, alpha: { value: opacity }, edge: { value: strength }, face: { value: base }, fibers: { value: fibers ? 1 : 0 },
  }), [color, opacity, strength, base, fibers])
  return <shaderMaterial transparent depthWrite={false} side={T.DoubleSide} uniforms={uniforms} vertexShader={vertex} fragmentShader={`
    varying vec3 vNormal; varying vec3 vView; varying vec3 vLocal; varying vec2 vUv;
    uniform vec3 tint; uniform float alpha; uniform float edge; uniform float face; uniform float fibers;
    void main(){
      float rim=pow(clamp(1.0-abs(dot(normalize(vNormal),normalize(vView))),0.0,1.0),2.8);
      float f1=pow(0.5+0.5*sin(vUv.x*780.0+vUv.y*460.0),24.0);
      float f2=pow(0.5+0.5*sin(vUv.x*720.0-vUv.y*380.0),26.0);
      float grain=fract(sin(dot(vLocal.xy,vec2(127.1,311.7)))*43758.5453);
      gl_FragColor=vec4(tint*(0.75+0.25*grain),alpha*(face+edge*rim+fibers*(f1+f2)*0.025));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`} />
}

export function ChloroplastMaterial({ opacity, light }: { opacity: number; light: number }) {
  const uniforms = useMemo(() => ({ alpha: { value: opacity }, illumination: { value: light } }), [opacity, light])
  return <shaderMaterial transparent depthWrite={false} side={T.FrontSide} uniforms={uniforms} vertexShader={vertex} fragmentShader={`
  varying vec3 vNormal; varying vec3 vView; varying vec3 vLocal; varying vec3 vObject;
  uniform float alpha; uniform float illumination;
  float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  void main(){
    if(vObject.z>1.3) discard;
    vec3 n=normalize(vNormal); vec3 eye=normalize(vView);
    float rim=pow(clamp(1.0-abs(dot(n,eye)),0.0,1.0),2.2);
    float diffuse=max(0.0,dot(n,normalize(vec3(-0.4,0.8,0.6))));
    vec2 p=vLocal.xy*1.4;
    vec2 q=fract(p)-0.5+vec2(hash(vec3(floor(p),2.0)),hash(vec3(floor(p),7.0)))*0.3-0.15;
    float granum=1.0-smoothstep(0.1,0.28,length(q));
    float layers=0.78+0.22*sin(vLocal.y*70.0);
    float grain=hash(floor(vLocal*110.0));
    vec3 core=mix(vec3(0.014,0.029,0.009),vec3(0.065,0.115,0.025),diffuse);
    core*=1.0-granum*0.72*layers;
    vec3 scatter=vec3(0.15,0.24,0.065)*rim*0.7;
    vec3 col=(core+scatter)*(0.19+illumination*1.5)*(0.91+0.12*grain);
    gl_FragColor=vec4(col,alpha*(0.25+rim*0.6));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`} />
}

export function LightSheet({ intensity }: { intensity: number }) {
  const uniforms = useMemo(() => ({ intensity: { value: intensity }, alpha: { value: 1 } }), [intensity])
  return <shaderMaterial transparent depthWrite={false} blending={T.AdditiveBlending} side={T.DoubleSide} uniforms={uniforms}
    vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
    fragmentShader={`varying vec2 vUv; uniform float intensity; uniform float alpha;
      void main(){
        float x=vUv.x+(1.0-vUv.y)*0.28;
        float beams=exp(-pow((x-0.38)*13.0,2.0))+0.6*exp(-pow((x-0.7)*24.0,2.0))+0.25*exp(-pow((x-0.52)*28.0,2.0));
        float mask=smoothstep(0.0,0.16,vUv.y)*smoothstep(1.0,0.85,vUv.y);
        float shadow=0.78+0.22*sin(x*70.0+vUv.y*6.0);
        gl_FragColor=vec4(vec3(0.63,0.57,0.32),beams*mask*shadow*intensity*alpha*0.055);
      }`} />
}
