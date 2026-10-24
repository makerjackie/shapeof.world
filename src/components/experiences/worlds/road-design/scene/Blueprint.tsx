import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import type { Network, Vec3 } from '../sim/types'
import { StretchAnchor } from './DisplayStretch'
import { offsetPath } from '../designs/kit'
import { mergeGeometry, samplePath, strip } from './mesh-kit'

const LAYERS = ['#527ca6', '#55b5b0', '#b59ae5', '#e0bc77', '#e0eaf5']
interface Stroke { a: Vec3; b: Vec3; color: string; drift?: Vec3; phase?: number }
export function screenLines(strokes: Stroke[], width: number, opacity = 1) {
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
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{resolution:{value:new T.Vector2(1600,1000)},width:{value:width},opacity:{value:opacity},time:{value:0}},
    vertexShader:`attribute vec3 end;attribute vec2 corner;attribute vec3 ink;attribute vec3 drift;attribute float phase;uniform vec2 resolution;uniform float width;uniform float time;varying vec3 color;varying float alpha;
      void main(){float cycle=fract(time*.12+phase);vec3 shift=drift*(cycle-.5)*18.;vec4 a=projectionMatrix*modelViewMatrix*vec4(position+shift,1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(end+shift,1.);if(a.w<=.3||b.w<=.3){gl_Position=vec4(2.,2.,2.,1.);color=ink;alpha=0.;return;}vec2 delta=(b.xy/b.w-a.xy/a.w)*resolution;vec2 normal=normalize(vec2(-delta.y,delta.x)+vec2(.00001));vec4 p=mix(a,b,corner.x);p.xy+=normal*corner.y*width/resolution*p.w;gl_Position=p;color=ink;alpha=length(drift)>.01?smoothstep(0.,.12,cycle)*(1.-smoothstep(.88,1.,cycle)):1.;}`,
    fragmentShader:`varying vec3 color;varying float alpha;uniform float opacity;void main(){gl_FragColor=vec4(color,alpha*opacity);}`})
  return {geometry,material}
}

/** Screen-width drafting strokes, layer fills and animated one-way chevrons. */
export function Blueprint({ network }: { network: Network }) {
  const tx=useExperienceI18n()
  const assets=useMemo(()=>{
    const edges:Stroke[]=[],separators:Stroke[]=[],arrows:Stroke[]=[],fills:T.BufferGeometry[][]=LAYERS.map(()=>[])
    const append=(paths:Vec3[],color:string,target:Stroke[])=>{for(let i=1;i<paths.length;i++)target.push({a:paths[i-1],b:paths[i],color})}
    for(const road of network.carriageways){
      const width=road.laneCount*road.laneWidth+(road.medianWidth??0)+2*(road.shoulder??0),level=Math.min(4,Math.max(0,road.level)),color=LAYERS[level]
      fills[level].push(strip(road.points,width,0,.025,road.superelevation))
      for(const side of[-1,1])append(offsetPath(road.points,side*width/2),color,edges)
      for(let lane=1;lane<road.laneCount;lane++)append(offsetPath(road.points,(lane-road.laneCount/2)*road.laneWidth),color,separators)
    }
    let sequence=0
    for(const lane of network.lanes){
      if(lane.kind==='connector')append(lane.points,LAYERS[Math.min(4,Math.max(0,lane.level))],separators)
      for(const{position:p,tangent:t}of samplePath(lane.points,38)){
        if(Math.hypot(p.x,p.z)>(network.id==='huangjuewan'?1400:600))continue
        const local=(along:number,side:number):Vec3=>({x:p.x+t.x*along-t.z*side,y:p.y+.2,z:p.z+t.z*along+t.x*side})
        const phase=sequence++*.61803399,color='#a6c6dc'
        arrows.push({a:local(-2.3,-1.5),b:local(1.2,0),color,drift:t,phase},{a:local(-2.3,1.5),b:local(1.2,0),color,drift:t,phase})
      }
    }
    const lines=[screenLines(edges,1.5,.95),screenLines(separators,.8,.55),screenLines(arrows,1.25,.72)]
    const surfaces=fills.map((items,level)=>({geometry:mergeGeometry(items),material:new T.MeshBasicMaterial({color:LAYERS[level],transparent:true,opacity:.18+level*.035,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1})}))
    const labels=[...new Set(network.carriageways.map(r=>r.level).filter(level=>level>=0))].sort().map(level=>{
      const radius=network.id==='huangjuewan'?180:110, angle=level*2.4+.4
      const anchor={x:Math.cos(angle)*radius,z:Math.sin(angle)*radius}
      const points=network.carriageways.filter(r=>r.level===level).flatMap(r=>samplePath(r.points,24).map(sample=>sample.position)).filter(p=>Math.hypot(p.x,p.z)<400)
      const distance=(p:Vec3)=>Math.hypot(p.x-anchor.x,p.z-anchor.z)
      const point=points.reduce<Vec3>((best,p)=>distance(p)<distance(best)?p:best,points[0]??{x:0,y:0,z:0})
      return {level,point}
    })

    return{lines,surfaces,labels}
  },[network])
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
  const material = useMemo(() => new T.ShaderMaterial({uniforms:{base:{value:new T.Color('#07121f')},ink:{value:new T.Color('#12263d')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 p;uniform vec3 base;uniform vec3 ink;void main(){vec2 q=p.xy/20.;vec2 a=abs(fract(q-.5)-.5)/max(fwidth(q),vec2(.0001));float line=1.-min(1.,min(a.x,a.y));gl_FragColor=vec4(mix(base,ink,line*exp(-length(p.xy)*.00035)*.65),1.);}`}), [])
  useEffect(() => () => material.dispose(), [material])
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,network.terrain?Math.min(...network.terrain.values)-2:-.22,0]} material={material}><planeGeometry args={[20000,20000]}/></mesh>
}
