import * as T from 'three'
/** Original explanatory involutes. Display clearance includes both bevels. */
export const SCROLL={baseRadius:.0032,thickness:.004,start:1.5,end:.8+Math.PI*4.8,height:.026,bevel:.0003,clearance:.0002,planeRotation:-Math.PI/2,eccentricity:Math.PI*.0032-.004-2*.0003-.0002} as const
export const SCROLL_FIXED_SCALE:[number,number,number]=[1,1,-1]
export function scrollCenterline(rotation=0,samples=300){
 const c=Math.cos(rotation),s=Math.sin(rotation)
 return Array.from({length:samples+1},(_,i)=>{const t=SCROLL.start+i/samples*(SCROLL.end-SCROLL.start),x=SCROLL.baseRadius*(Math.cos(t)+t*Math.sin(t)),y=SCROLL.baseRadius*(Math.sin(t)-t*Math.cos(t));return new T.Vector2(x*c-y*s,x*s+y*c)})
}
export function scrollOrbitPosition(angle:number){return{x:SCROLL.eccentricity*Math.cos(angle),z:SCROLL.eccentricity*Math.sin(angle)}}
export function scrollGeometry(rotation=0){
 const points:T.Vector2[]=[],inner:T.Vector2[]=[],centerline=scrollCenterline(rotation),half=SCROLL.thickness/2
 centerline.forEach((p,i)=>{const t=SCROLL.start+i/(centerline.length-1)*(SCROLL.end-SCROLL.start)+rotation,nx=-Math.sin(t),ny=Math.cos(t);points.push(new T.Vector2(p.x+nx*half,p.y+ny*half));inner.push(new T.Vector2(p.x-nx*half,p.y-ny*half))})
 const shape=new T.Shape([...points,...inner.reverse()]);const geo=new T.ExtrudeGeometry(shape,{depth:SCROLL.height,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:SCROLL.bevel,bevelThickness:SCROLL.bevel});geo.computeVertexNormals();return geo
}
export function pipeCurve(points:[number,number,number][],tension=.2){return new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'catmullrom',tension)}
export function coilCurve(width=1,height=.36,rows=8,z=0){
 const p:T.Vector3[]=[];const bend=.026,dy=height/rows
 for(let j=0;j<rows;j++){const y=-height/2+j*dy,dir=j%2===0?1:-1,left=-width/2,right=width/2;p.push(new T.Vector3(dir>0?left:right,y,z),new T.Vector3(dir>0?right:left,y,z));if(j<rows-1){const x=dir>0?right:left;for(let k=1;k<=8;k++){const a=k/8*Math.PI;p.push(new T.Vector3(x+dir*bend*Math.sin(a),y+dy*(1-Math.cos(a))/2,z))}}}
 return new T.CatmullRomCurve3(p,false,'centripetal')
}
export function fanBladeGeometry(){const s=new T.Shape();s.moveTo(.025,-.018);s.bezierCurveTo(.12,-.14,.2,-.13,.24,-.03);s.bezierCurveTo(.23,.06,.11,.08,.025,.018);s.closePath();return new T.ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelSegments:2,bevelSize:.004,bevelThickness:.003,steps:1})}
