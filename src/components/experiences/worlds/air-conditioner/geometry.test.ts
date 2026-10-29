import {describe,expect,it} from 'vitest'
import * as T from 'three'
import {SCROLL,SCROLL_FIXED_SCALE,scrollCenterline,scrollGeometry,scrollOrbitPosition} from './geometry'

type Point=readonly[number,number]
const pointDistanceSq=(p:Point,a:Point,b:Point)=>{const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return(p[0]-a[0]-u*dx)**2+(p[1]-a[1]-u*dy)**2}
const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
function segmentDistanceSq(a:Point,b:Point,c:Point,d:Point){if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;return Math.min(pointDistanceSq(a,c,d),pointDistanceSq(b,c,d),pointDistanceSq(c,a,b),pointDistanceSq(d,a,b))}
const projected=(rotation:number)=>scrollCenterline(rotation).map(p=>{const v=new T.Vector3(p.x,p.y,0).applyAxisAngle(new T.Vector3(1,0,0),SCROLL.planeRotation);return[v.x,v.z] as Point})

describe('original scroll pair geometry and eccentric kinematics',()=>{
 it('interleaves both involutes without crossings or bevel contact throughout an orbit',()=>{
  const fixed=projected(0),moving=projected(Math.PI)
  let minimum=Infinity
  for(let phase=0;phase<36;phase++){
   const offset=scrollOrbitPosition(phase*Math.PI/18),translated=moving.map(([x,z])=>[x+offset.x,z+offset.z] as Point)
   for(let i=0;i<fixed.length-1;i++)for(let j=0;j<translated.length-1;j++)minimum=Math.min(minimum,segmentDistanceSq(fixed[i],fixed[i+1],translated[j],translated[j+1]))
  }
  // Count both finite wall thicknesses and their outward bevels. The segment
  // chords approximate the involute, so retain a small discretization margin.
  const clearance=Math.sqrt(minimum)-SCROLL.thickness-2*SCROLL.bevel
  expect(clearance).toBeGreaterThan(SCROLL.clearance*.85)
  expect(clearance).toBeLessThan(SCROLL.clearance*1.1)
 })
 it('reverses only axial extrusion on the fixed wrap, preserving planar handedness',()=>{
  expect(SCROLL_FIXED_SCALE).toEqual([1,1,-1])
  const geometry=scrollGeometry(),rotation=new T.Matrix4().makeRotationX(SCROLL.planeRotation),fixed=new T.Matrix4().makeTranslation(0,.29,0).multiply(rotation).multiply(new T.Matrix4().makeScale(...SCROLL_FIXED_SCALE)),orbit=new T.Matrix4().makeTranslation(0,.246,0).multiply(rotation),v=new T.Vector3()
  let fixedMin=Infinity,fixedMax=-Infinity,orbitMin=Infinity,orbitMax=-Infinity
  const points=geometry.getAttribute('position')
  for(let i=0;i<points.count;i++){v.fromBufferAttribute(points,i).applyMatrix4(fixed);fixedMin=Math.min(fixedMin,v.y);fixedMax=Math.max(fixedMax,v.y);v.fromBufferAttribute(points,i).applyMatrix4(orbit);orbitMin=Math.min(orbitMin,v.y);orbitMax=Math.max(orbitMax,v.y)}
  geometry.dispose()
  expect(fixedMin).toBeCloseTo(.29-SCROLL.height-SCROLL.bevel,6)
  expect(fixedMax).toBeCloseTo(.29+SCROLL.bevel,6)
  expect(orbitMin).toBeCloseTo(.246-SCROLL.bevel,6)
  expect(orbitMax).toBeCloseTo(.246+SCROLL.height+SCROLL.bevel,6)
  expect(Math.min(fixedMax,orbitMax)-Math.max(fixedMin,orbitMin)).toBeGreaterThan(.008)
 })
 it('keeps the eccentric bearing and translating scroll on the same XZ orbit',()=>{
  for(let phase=0;phase<36;phase++){const angle=phase*Math.PI/18,bearing=new T.Vector3(SCROLL.eccentricity,0,0).applyAxisAngle(new T.Vector3(0,1,0),-angle),orbit=scrollOrbitPosition(angle);expect(bearing.x).toBeCloseTo(orbit.x,12);expect(bearing.z).toBeCloseTo(orbit.z,12);expect(bearing.y).toBe(0);expect(Math.hypot(orbit.x,orbit.z)).toBeCloseTo(SCROLL.eccentricity,12)}
 })
})
