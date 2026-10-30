import * as T from 'three'
import {colorForSpeed,distance,sample,sphericalStep,toVector,type FieldKind,type Grid,type Location} from './model'
/** Deterministic uniform-area seeds and native-grid-limited RK4 streamlines. */
export function makeStreamlines(grid:Grid,count:number):T.BufferGeometry {
  let state=grid.kind==='wind'?17783:77431
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296}
  const positions:number[]=[],colors:number[]=[],ages:number[]=[],seeds:number[]=[]
  const n=grid.kind==='wind'?44:64,radius=grid.kind==='wind'?1.022:1.009
  let found=0
  for(let attempt=0;attempt<count*18&&found<count;attempt++){
    let p:Location={lon:random()*360-180,lat:Math.asin(random()*2-1)*180/Math.PI}
    const first=sample(grid,p.lon,p.lat)
    if(!first||first.speed<(grid.kind==='wind'?.8:.035))continue
    const phase=random()
    let used=0
    for(let j=0;j<n;j++){
      const v=sample(grid,p.lon,p.lat);if(!v||v.speed<.005)break
      // Streamlines are parameterised by arc length rather than animation time.
      // Resolve a fraction of a native cell even where the current is slow.
      // User drifters separately use the physical drift clock in model.ts.
      const cell=grid.radius*Math.PI/180*Math.min(grid.dx*Math.max(.08,Math.cos(p.lat*Math.PI/180)),grid.dy)
      const arc=cell*.28
      let dt=arc/v.speed,next=sphericalStep(grid,p,dt)
      for(let refine=0;next&&distance(p,next,grid.radius)>arc*1.6&&refine<8;refine++){dt*=.5;next=sphericalStep(grid,p,dt)}
      if(!next||distance(p,next,grid.radius)>arc*1.6)break
      const a=toVector(p,radius),b=toVector(next,radius)
      positions.push(a.x,a.y,a.z,b.x,b.y,b.z)
      colors.push(...colorForSpeed(grid.kind,v.speed),...colorForSpeed(grid.kind,sample(grid,next.lon,next.lat)!.speed));ages.push(j/n,(j+1)/n);seeds.push(phase,phase)
      used++;p=next
    }
    if(used)found++
  }
  const geometry=new T.BufferGeometry()
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  geometry.setAttribute('aAge',new T.Float32BufferAttribute(ages,1))
  geometry.setAttribute('aSeed',new T.Float32BufferAttribute(seeds,1))
  geometry.computeBoundingSphere()
  return geometry
}
/** One cue sample per segment, with shared curve attributes. Avoid drawing the
 * duplicated segment endpoint twice without inventing a second trajectory. */
export function makeStreamHeads(curves:T.BufferGeometry):T.BufferGeometry {
  const geometry=new T.BufferGeometry()
  for(const name of ['position','color','aAge','aSeed'])geometry.setAttribute(name,curves.getAttribute(name))
  geometry.setIndex(Array.from({length:Math.floor(curves.getAttribute('position').count/2)},(_,i)=>i*2))
  geometry.boundingSphere=curves.boundingSphere?.clone()??null
  return geometry
}
export function makeSpeedTexture(grid:Grid) {
  const w=720,h=360,data=new Uint8Array(w*h*4)
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const v=sample(grid,(i+.5)/w*360-180,90-(j+.5)/h*180),at=((h-1-j)*w+i)*4
    if(!v)continue
    const c=colorForSpeed(grid.kind,v.speed)
    data[at]=Math.round(c[0]*255);data[at+1]=Math.round(c[1]*255);data[at+2]=Math.round(c[2]*255);data[at+3]=Math.round(90+Math.min(1,v.speed/(grid.kind==='wind'?25:1.7))*80)
  }
  // Pack source north-to-south rows explicitly into the texture's bottom-to-top convention.
  const texture=new T.DataTexture(data,w,h,T.RGBAFormat)
  texture.flipY=false;texture.colorSpace=T.LinearSRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.wrapS=T.RepeatWrapping;texture.needsUpdate=true
  return texture
}
export const streamRadius=(kind:FieldKind)=>kind==='wind'?1.022:1.009
