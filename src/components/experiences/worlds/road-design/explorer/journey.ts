import type { Network, Vec3 } from '../sim/types'
import { cumulativeLengths, projectToLane, sampleLane } from '../sim/geometry'
import { terrainHeight } from '../sim/terrain'
import type { ExploreRoute } from './routes'
import type { WhyPin } from './explanations'

export const LEFT_GROUPS = [
 {title:'等灯或让行',titleEn:'Wait or yield',ids:['t-junction','crossroads-yield','crossroads-signal','crossroads-channelized','diamond']},
 {title:'提前换到另一侧',titleEn:'Cross over first',ids:['continuous-flow','ddi']},
 {title:'绕圈转向',titleEn:'Turn by looping',ids:['roundabout','cloverleaf']},
 {title:'沿匝道直接飞过去',titleEn:'Fly over on a ramp',ids:['turbine','stack']},
 {title:'混合办法',titleEn:'Mix the methods',ids:['parclo','trumpet','huangjuewan']},
]
export const LEFT_STORIES:Record<string,{title:string;titleEn:string}>= {
 't-junction':{title:'先让主路的车过去，再左转。',titleEn:'Yield to the main road, then turn left.'},
 'crossroads-yield':{title:'先让行，等到空当再横穿对向车流。',titleEn:'Yield, then cross opposing traffic in a gap.'},
 'crossroads-signal':{title:'红灯先等；绿灯还要让对向直行，再左转。',titleEn:'Wait at red. At green, yield to oncoming traffic, then turn left.'},
 'crossroads-channelized':{title:'先进左转车道，按信号分阶段转过去。',titleEn:'Enter the left-turn lane and turn in signal-controlled stages.'},
 diamond:{title:'先驶出高速，在地面路口等灯左转。',titleEn:'Leave the motorway, then turn left at the signalised junction.'},
 'continuous-flow':{title:'提前过一次对向车道，主路口左转就不挡直行。',titleEn:'Cross opposing lanes early, so the main left turn clears through traffic.'},
 ddi:{title:'先换到道路另一侧，左转上匝道就不用横穿对向。',titleEn:'Swap sides first, then enter the ramp without crossing opposing traffic.'},
 roundabout:{title:'让环内车先走，沿环岛转到目标出口。',titleEn:'Yield to circulating traffic, then follow the ring to your exit.'},
 cloverleaf:{title:'先向右驶出，绕 270°，就朝左了。',titleEn:'Exit to the right, loop through 270°, and you are heading left.'},
 turbine:{title:'沿大弯匝道转向，在不同高度越过其他车流。',titleEn:'Follow a sweeping ramp, passing other streams at different heights.'},
 stack:{title:'驶入定向匝道，爬升越过主线，向左汇入。',titleEn:'Take the directional ramp, climb over the main roads, then merge leftward.'},
 parclo:{title:'有的左转绕环，有的仍在地面路口等灯。',titleEn:'Some left turns loop; others still wait at a surface junction.'},
 trumpet:{title:'一个左转绕环，另一个走半定向匝道。',titleEn:'One left turn loops; the other takes a semi-directional ramp.'},
 huangjuewan:{title:'多方向、多层匝道混合连接，先认出口再转向。',titleEn:'Many directions connect through layered ramps. Choose your exit early.'},
}
export function signatureRoute(routes:ExploreRoute[], id:string) {
 const preferred=id==='trumpet'?'east':id==='t-junction'?'south':id==='ddi'?'west':'north'
 return routes.find(r=>r.movement.from===preferred&&r.movement.turn==='left')??routes.find(r=>r.movement.turn==='left')??routes[0]
}
export interface Crossing {s:number;position:Vec3;other:Vec3;over:boolean;roadIds:string[];title:string;titleEn:string;lines:Vec3[][]}
export interface JourneyStep {start:number;end:number;focus:number;title:string;titleEn:string;symbol:string;pins:WhyPin[];crossings:Crossing[]}
export interface Journey {steps:JourneyStep[];crossings:Crossing[];heights:{s:number;h:number}[]}
const cross=(a:Vec3,b:Vec3)=>a.x*b.z-a.z*b.x
const sub=(a:Vec3,b:Vec3)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z})
const lerp=(a:Vec3,b:Vec3,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t})
/** Intersect centre lines in plan, then compare the two actual deck elevations.
 * Pair adjacent carriageways into one named crossing; never infer from levels. */
export function routeCrossings(network:Network, route:ExploreRoute):Crossing[] {
 const hits:Crossing[]=[],path=route.path,dist=path.cumulative??cumulativeLengths(path.points)
 for(const road of network.carriageways){
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i],u=sub(b,a)
   for(let j=1;j<road.points.length;j++){
    const c=road.points[j-1],d=road.points[j],v=sub(d,c),den=cross(u,v)
    if(Math.abs(den)<.15*Math.hypot(u.x,u.z)*Math.hypot(v.x,v.z)||Math.abs(den)<1e-7)continue
    const ca=sub(c,a),t=cross(ca,v)/den,q=cross(ca,u)/den
    if(t<0||t>=1||q<0||q>=1)continue
    const p=lerp(a,b,t),other=lerp(c,d,q),gap=p.y-other.y
    if(Math.abs(gap)<2.5)continue
    const s=dist[i-1]+(dist[i]-dist[i-1])*t,over=gap>0
    const axis=Math.abs(v.x)>Math.abs(v.z),main=road.kind==='main'||road.id.startsWith('aux-road-'),name=main?(axis?'东西主线':'南北主线'):'另一条匝道',en=main?(axis?'east–west main road':'north–south main road'):'another ramp'
    const title=`${over?'从上方跨过':'从下方穿过'} ${name}`,titleEn=`${over?'Over':'Under'} ${main?'the ':''}${en}`
    const length=Math.hypot(v.x,v.z),line=[{x:other.x-v.x/length*35,y:other.y+.12,z:other.z-v.z/length*35},{x:other.x+v.x/length*35,y:other.y+.12,z:other.z+v.z/length*35}]
    const existing=hits.find(h=>h.title===title&&Math.abs(h.s-s)<(main?80:40))
    if(existing){if(!existing.roadIds.includes(road.id)){existing.roadIds.push(road.id);existing.lines.push(line)}}
    else hits.push({s,position:p,other,over,roadIds:[road.id],title,titleEn,lines:[line]})
   }
  }
 }
 return hits.sort((a,b)=>a.s-b.s)
}
/** Steps partition the unchanged route by turn geometry and grade crossings.
 * The display distances are measured along the same representative path as readings. */
export function buildJourney(network:Network, route:ExploreRoute, pins:WhyPin[]):Journey {
 const path=route.path,length=path.length,crossings=routeCrossings(network,route)
 const lanes=route.laneIds.map(id=>network.lanes.find(l=>l.id===id)!)
 const loop=lanes.find(l=>l.id.includes('loop')||l.circulating)
 const turning=loop?[loop]:lanes.filter(l=>(l.kind==='connector'||l.kind==='ramp')&&!l.id.startsWith('aux-road-'))
 const first=turning[0],last=turning.at(-1)
 const extent=turnExtent(route),start=loop?projectToLane(path,loop.points[0]):first?projectToLane(path,first.points[0]):extent.start,end=loop?projectToLane(path,loop.points.at(-1)!):Math.min(length-80,last?projectToLane(path,last.points.at(-1)!):extent.end)
 const boundaries=[0,Math.max(1,start),Math.min(length-1,Math.max(end,start+1)),length]
 const before=crossings.find(c=>c.s<start),after=[...crossings].reverse().find(c=>c.s>=end)
 if(before)boundaries.push(Math.max(1,before.s-40))
 if(after)boundaries.push(Math.min(length-1,after.s+45))
 const inside=crossings.filter(c=>c.s>start+50&&c.s<end-50)
 if(!before&&inside.length)boundaries.push(Math.max(start+1,inside[0].s-40))
 if(!after&&inside.length>1)boundaries.push(Math.min(end-1,inside.at(-1)!.s+40))
 const sorted=[...new Set(boundaries)].sort((a,b)=>a-b)
 while(sorted.length>6)sorted.splice(2,1)
 const steps=sorted.slice(0,-1).map((a,i):JourneyStep=>{
  const b=sorted[i+1],hits=crossings.filter(c=>c.s>=a&&c.s<b),isTurn=a<=start+35&&b>start+1||loop&&a>=start&&a<end
  let title=i===0?'沿主线接近路口':i===sorted.length-2?'汇入出口方向':a>=end-1?'汇入出口方向':hits.length===0&&a>start?'沿匝道下降':'驶入转向匝道',titleEn=i===0?'Approach on the main road':i===sorted.length-2?'Join the exit road':a>=end-1?'Join the exit road':hits.length===0&&a>start?'Descend along the ramp':'Enter the turning ramp',symbol=i===sorted.length-2?'↗':'↑'
  if(isTurn){title=loop?(network.id==='roundabout'?'沿环岛转向':'右侧驶出，绕 270°'):network.control.kind==='signal'&&first?.kind==='connector'?'等灯、让行后左转':'驶出主线，沿匝道左转';titleEn=loop?(network.id==='roundabout'?'Follow the roundabout':'Exit right and loop 270°'):network.control.kind==='signal'&&first?.kind==='connector'?'Wait, yield, then turn left':'Leave the main road and follow the ramp';symbol=loop?'↻':'↰'}
  if(isTurn&&!loop&&network.control.kind!=='signal'&&network.carriageways.every(road=>road.kind==='urban')){title='让行后左转';titleEn='Yield, then turn left'}
  if(route.movement.turn!=='left'&&isTurn&&!loop){title=route.movement.turn==='right'?'沿道路右转':'沿道路直行';titleEn=route.movement.turn==='right'?'Turn right along the road':'Continue straight';symbol=route.movement.turn==='right'?'↱':'↑'}
  if(hits.length&&(!isTurn||!loop)){title=hits[0].title;titleEn=hits[0].titleEn;symbol=hits[0].over?'↗':'↘'}
  return {start:a,end:b,focus:hits[0]?.s??(isTurn?(start+Math.min(end,b))*.5:(a+b)*.5),title,titleEn,symbol,pins:[],crossings:hits}
 })
 for(const pin of pins){const s=projectToLane(path,pin.position);(steps.find(step=>s>=step.start&&s<step.end)??steps.at(-1)!).pins.push(pin)}
 const heights=Array.from({length:161},(_,i)=>{const s=length*i/160,p=sampleLane(path,s).position;return {s,h:Math.max(0,p.y-terrainHeight(network,p.x,p.z))}})
 return {steps,crossings,heights}
}
export function journeyDistance(route:ExploreRoute,position:Vec3){return projectToLane(route.path,position)}
export function stepAt(journey:Journey,s:number){const i=journey.steps.findIndex(step=>s<step.end);return i<0?journey.steps.length-1:i}

/** Core framing excludes long straight approach and acceleration tails. */
export function turnExtent(route:ExploreRoute){
 const path=route.path,positions:number[]=[]
 for(let s=20;s<path.length-20;s+=5){
  const a=sampleLane(path,s-15).tangent,b=sampleLane(path,s+15).tangent
  const angle=Math.abs(Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z))
  if(angle>.055)positions.push(s)
 }
 return positions.length?{start:Math.max(0,positions[0]-45),end:Math.min(path.length,positions.at(-1)!+45)}:{start:path.length*.35,end:path.length*.65}
}
export function corePoints(route:ExploreRoute){
 const {start,end}=turnExtent(route)
 return Array.from({length:100},(_,i)=>sampleLane(route.path,start+(end-start)*i/99).position)
}
