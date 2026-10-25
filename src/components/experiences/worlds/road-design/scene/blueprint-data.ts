import * as T from 'three'
import type { Network, Vec3 } from '../sim/types'
import { offsetPath } from '../designs/kit'
import { mergeGeometry, samplePath, strip } from './mesh-kit'
import { LAYERS, screenLineGeometry, type Stroke } from './screen-lines'
import { packGeometry, unpackGeometry, geometryBuffers } from './packed-geometry'

export function buildBlueprintData(network:Network) {
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
    const lines=[edges,separators,arrows].map(screenLineGeometry)
    const surfaces=fills.map(items=>mergeGeometry(items))
    const labels=[...new Set(network.carriageways.map(r=>r.level).filter(level=>level>=0))].sort().map(level=>{
      const radius=network.id==='huangjuewan'?180:110, angle=level*2.4+.4
      const anchor={x:Math.cos(angle)*radius,z:Math.sin(angle)*radius}
      const points=network.carriageways.filter(r=>r.level===level).flatMap(r=>samplePath(r.points,24).map(sample=>sample.position)).filter(p=>Math.hypot(p.x,p.z)<400)
      const distance=(p:Vec3)=>Math.hypot(p.x-anchor.x,p.z-anchor.z)
      const point=points.reduce<Vec3>((best,p)=>distance(p)<distance(best)?p:best,points[0]??{x:0,y:0,z:0})
      return {level,point}
    })

    return{lines,surfaces,labels}
}

export function packBlueprint(data:ReturnType<typeof buildBlueprintData>){return {...data,lines:data.lines.map(packGeometry),surfaces:data.surfaces.map(packGeometry)}}
export type PackedBlueprint=ReturnType<typeof packBlueprint>
export function unpackBlueprint(data:PackedBlueprint){return {...data,lines:data.lines.map(unpackGeometry),surfaces:data.surfaces.map(unpackGeometry)}}
export function blueprintBuffers(data:PackedBlueprint){return [...data.lines,...data.surfaces].flatMap(geometryBuffers)}
