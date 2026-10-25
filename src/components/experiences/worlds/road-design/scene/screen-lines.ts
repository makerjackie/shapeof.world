import * as T from 'three'
import type { Vec3 } from '../sim/types'
export const LAYERS = ['#527ca6', '#55b5b0', '#b59ae5', '#e0bc77', '#e0eaf5']
export interface Stroke { a: Vec3; b: Vec3; color: string; drift?: Vec3; phase?: number }
export function screenLineGeometry(strokes: Stroke[]) {
  const positions:number[]=[],ends:number[]=[],corners:number[]=[],colors:number[]=[],drifts:number[]=[],phases:number[]=[],indices:number[]=[]
  for(const [i,line] of strokes.entries()) {
    const color=new T.Color(line.color), drift=line.drift??{x:0,y:0,z:0}
    for(const [along,side]of [[0,-1],[0,1],[1,-1],[1,1]]) {
      positions.push(line.a.x,line.a.y+.12,line.a.z);ends.push(line.b.x,line.b.y+.12,line.b.z);corners.push(along,side)
      colors.push(color.r,color.g,color.b);drifts.push(drift.x,drift.y,drift.z);phases.push(line.phase??0)
    }
    const n=i*4;indices.push(n,n+2,n+1,n+1,n+2,n+3)
  }
  const geometry=new T.BufferGeometry()
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('end',new T.Float32BufferAttribute(ends,3));geometry.setAttribute('corner',new T.Float32BufferAttribute(corners,2));geometry.setAttribute('ink',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('drift',new T.Float32BufferAttribute(drifts,3));geometry.setAttribute('phase',new T.Float32BufferAttribute(phases,1));geometry.setIndex(indices)
  return geometry
}
export function screenLineMaterial(width:number,opacity=1) {
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{resolution:{value:new T.Vector2(1600,1000)},width:{value:width},opacity:{value:opacity},time:{value:0}},
    vertexShader:`attribute vec3 end;attribute vec2 corner;attribute vec3 ink;attribute vec3 drift;attribute float phase;uniform vec2 resolution;uniform float width;uniform float time;varying vec3 color;varying float alpha;
      void main(){float cycle=fract(time*.12+phase);vec3 shift=drift*(cycle-.5)*18.;vec4 a=projectionMatrix*modelViewMatrix*vec4(position+shift,1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(end+shift,1.);if(a.w<=.3||b.w<=.3){gl_Position=vec4(2.,2.,2.,1.);color=ink;alpha=0.;return;}vec2 delta=(b.xy/b.w-a.xy/a.w)*resolution;vec2 normal=normalize(vec2(-delta.y,delta.x)+vec2(.00001));vec4 p=mix(a,b,corner.x);p.xy+=normal*corner.y*width/resolution*p.w;gl_Position=p;color=ink;alpha=length(drift)>.01?smoothstep(0.,.12,cycle)*(1.-smoothstep(.88,1.,cycle)):1.;}`,
    fragmentShader:`varying vec3 color;varying float alpha;uniform float opacity;void main(){gl_FragColor=vec4(color,alpha*opacity);}`})
  return material
}


export function screenLines(strokes:Stroke[],width:number,opacity=1){return {geometry:screenLineGeometry(strokes),material:screenLineMaterial(width,opacity)}}
