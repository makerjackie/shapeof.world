import dataMeta from './data-meta.json'
export type FieldKind='wind'|'ocean'
export interface Location {lon:number;lat:number}
export interface Grid {kind:FieldKind;nx:number;ny:number;lon0:number;lat0:number;dx:number;dy:number;radius:number;u:Int16Array;v:Int16Array;scale:number;missing:number}
export interface Velocity {u:number;v:number;speed:number;toward:number;from:number}
export interface Vector3 {x:number;y:number;z:number}
export interface TrackPoint extends Location {time:number;distance:number;speed:number}
export interface Drifter {id:number;kind:FieldKind;created:number;point:TrackPoint;history:TrackPoint[];active:boolean;reason:'moving'|'missing'|'calm'|'limit';color:string;group:number}
export const MAX_TIME=30*86400
const DEG=Math.PI/180,RAD=180/Math.PI
export const wrapLongitude=(lon:number)=>((lon+180)%360+360)%360-180
const wrap360=(v:number)=>(v%360+360)%360
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
export function decodeGrid(kind:FieldKind,bytes:Uint8Array):Grid {
  const meta=dataMeta.fields.find(f=>f.id===kind)!
  if(bytes.byteLength!==meta.nx*meta.ny*4)throw new Error('Unexpected field byte length')
  const n=meta.nx*meta.ny,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u=new Int16Array(n),v=new Int16Array(n)
  for(let i=0;i<n;i++){u[i]=view.getInt16(i*2,true);v[i]=view.getInt16((n+i)*2,true)}
  return {kind,nx:meta.nx,ny:meta.ny,lon0:meta.lon0,lat0:meta.lat0,dx:meta.dx,dy:meta.dy,radius:meta.radius,u,v,scale:dataMeta.scale,missing:dataMeta.missing}
}
/** Bilinear interpolation on the native, cyclic longitude grid. Missing corners are never filled. */
export function sample(grid:Grid,lon:number,lat:number):Velocity|null {
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||lat>grid.lat0+1e-8||lat<grid.lat0-(grid.ny-1)*grid.dy-1e-8)return null
  const x=wrap360(lon-grid.lon0)/grid.dx,y=clamp((grid.lat0-lat)/grid.dy,0,grid.ny-1)
  const i0=Math.floor(x)%grid.nx,i1=(i0+1)%grid.nx,j0=Math.min(grid.ny-2,Math.floor(y)),j1=j0+1
  const a=x-Math.floor(x),b=y-j0,index=[j0*grid.nx+i0,j0*grid.nx+i1,j1*grid.nx+i0,j1*grid.nx+i1]
  if(index.some(i=>grid.u[i]===grid.missing||grid.v[i]===grid.missing))return null
  const weights=[(1-a)*(1-b),a*(1-b),(1-a)*b,a*b]
  let u=0,v=0
  for(let i=0;i<4;i++){u+=grid.u[index[i]]*weights[i];v+=grid.v[index[i]]*weights[i]}
  u*=grid.scale;v*=grid.scale
  const speed=Math.hypot(u,v),toward=wrap360(Math.atan2(u,v)*RAD)
  return {u,v,speed,toward,from:wrap360(toward+180)}
}
/** Three.js SphereGeometry / equirectangular texture convention: 0°E lies on +X, east goes toward -Z. */
export function toVector({lon,lat}:Location,radius=1):Vector3 {
  const p=lat*DEG,l=lon*DEG,c=Math.cos(p)*radius
  return {x:c*Math.cos(l),y:radius*Math.sin(p),z:-c*Math.sin(l)}
}
export function toLocation(p:Vector3):Location {
  const r=Math.hypot(p.x,p.y,p.z)
  return {lon:wrapLongitude(Math.atan2(-p.z,p.x)*RAD),lat:Math.asin(clamp(p.y/r,-1,1))*RAD}
}
function normalized(p:Vector3):Vector3 {const r=Math.hypot(p.x,p.y,p.z);return {x:p.x/r,y:p.y/r,z:p.z/r}}
function velocityVector(grid:Grid,p:Vector3):Vector3|null {
  const loc=toLocation(p),value=sample(grid,loc.lon,loc.lat)
  if(!value)return null
  const lon=loc.lon*DEG,lat=loc.lat*DEG
  // East = (-sin λ,0,-cos λ); north = (-sin φ cos λ,cos φ,sin φ sin λ).
  return {x:(-Math.sin(lon)*value.u-Math.sin(lat)*Math.cos(lon)*value.v)/grid.radius,
    y:Math.cos(lat)*value.v/grid.radius,z:(-Math.cos(lon)*value.u+Math.sin(lat)*Math.sin(lon)*value.v)/grid.radius}
}
function add(p:Vector3,v:Vector3,t:number):Vector3{return normalized({x:p.x+v.x*t,y:p.y+v.y*t,z:p.z+v.z*t})}
/** RK4 in Cartesian tangent vectors, with normalization at every stage. No 1/cos(latitude) singularity. */
export function sphericalStep(grid:Grid,at:Location,seconds:number):Location|null {
  const p=toVector(at),a=velocityVector(grid,p);if(!a)return null
  const b=velocityVector(grid,add(p,a,seconds/2));if(!b)return null
  const c=velocityVector(grid,add(p,b,seconds/2));if(!c)return null
  const d=velocityVector(grid,add(p,c,seconds));if(!d)return null
  const next=toLocation(normalized({x:p.x+seconds/6*(a.x+2*b.x+2*c.x+d.x),y:p.y+seconds/6*(a.y+2*b.y+2*c.y+d.y),z:p.z+seconds/6*(a.z+2*b.z+2*c.z+d.z)}))
  return sample(grid,next.lon,next.lat)?next:null
}
export function distance(a:Location,b:Location,radius=6371000) {
  const p=(b.lat-a.lat)*DEG,l=wrapLongitude(b.lon-a.lon)*DEG
  const h=Math.sin(p/2)**2+Math.cos(a.lat*DEG)*Math.cos(b.lat*DEG)*Math.sin(l/2)**2
  return 2*radius*Math.asin(Math.sqrt(clamp(h,0,1)))
}
export function maximumStep(grid:Grid,point:Location,speed:number) {
  const cell=grid.radius*DEG*Math.min(grid.dx*Math.max(.06,Math.cos(point.lat*DEG)),grid.dy)
  return Math.min(grid.kind==='wind'?1800:10800,cell*.22/Math.max(.02,speed))
}
export function createDrifter(id:number,kind:FieldKind,at:Location,time:number,grid:Grid,group=id):Drifter|null {
  const v=sample(grid,at.lon,at.lat);if(!v)return null
  const point={...at,lon:wrapLongitude(at.lon),time,distance:0,speed:v.speed}
  return {id,kind,created:time,point,history:[{...point}],active:true,reason:'moving',color:kind==='wind'?'#dcb98b':'#81d8d4',group}
}
export function advanceDrifter(d:Drifter,grid:Grid,toTime:number) {
  if(!d.active||toTime<=d.point.time)return
  const target=Math.min(toTime,MAX_TIME)
  let guard=0
  while(d.point.time<target-1e-7&&guard++<4000){
    const v=sample(grid,d.point.lon,d.point.lat)
    if(!v){d.active=false;d.reason='missing';break}
    if(v.speed<.0001){d.point.time=target;d.point.speed=v.speed;d.reason='calm';break}
    const dt=Math.min(target-d.point.time,maximumStep(grid,d.point,v.speed))
    const next=sphericalStep(grid,d.point,dt)
    if(!next){d.active=false;d.reason='missing';break}
    d.point={...next,time:d.point.time+dt,distance:d.point.distance+distance(d.point,next,grid.radius),speed:sample(grid,next.lon,next.lat)!.speed}
    if(d.point.time-d.history.at(-1)!.time>=(grid.kind==='wind'?1800:7200))d.history.push({...d.point})
  }
  if(target>=MAX_TIME){d.active=false;d.reason='limit'}
  if(!d.active&&d.point.time>d.history.at(-1)!.time)d.history.push({...d.point})
}
export function trackAt(d:Drifter,time:number):TrackPoint|null {
  if(time<d.created)return null
  if(time>=d.point.time)return d.point
  const list=d.history
  let low=0,high=list.length-1
  while(low<high){const mid=Math.ceil((low+high)/2);if(list[mid].time<=time)low=mid;else high=mid-1}
  const a=list[low],b=list[low+1]??d.point,frac=b.time===a.time?0:clamp((time-a.time)/(b.time-a.time),0,1)
  const av=toVector(a),bv=toVector(b),loc=toLocation(normalized({x:av.x*(1-frac)+bv.x*frac,y:av.y*(1-frac)+bv.y*frac,z:av.z*(1-frac)+bv.z*frac}))
  return {...loc,time,distance:a.distance+(b.distance-a.distance)*frac,speed:a.speed+(b.speed-a.speed)*frac}
}
export function formatCoordinate(value:number,latitude=false) {return `${Math.abs(value).toFixed(2)}°${latitude?(value>=0?'N':'S'):(value>=0?'E':'W')}`}
export function vectorAngle(a:Velocity|null,b:Velocity|null) {
  if(!a||!b||a.speed<.001||b.speed<.001)return null
  return Math.acos(clamp((a.u*b.u+a.v*b.v)/(a.speed*b.speed),-1,1))*RAD
}
/** Linear-RGB display palette. Scientific readings remain unclipped. */
export function colorForSpeed(kind:FieldKind,speed:number):[number,number,number] {
  const t=clamp(speed/(kind==='wind'?28:2.4),0,1),stops=kind==='wind'?[[.37,.37,.28],[.71,.63,.42],[.93,.79,.52],[.91,.42,.31]]:[[.16,.44,.55],[.28,.72,.74],[.68,.86,.73],[.95,.74,.42]]
  const a=Math.min(2,Math.floor(t*3)),f=t*3-a
  return [stops[a][0]*(1-f)+stops[a+1][0]*f,stops[a][1]*(1-f)+stops[a+1][1]*f,stops[a][2]*(1-f)+stops[a+1][2]*f]
}
