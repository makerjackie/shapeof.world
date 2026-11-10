import {describe,expect,it} from 'vitest'
import {PerspectiveCamera,Vector3} from 'three'
import {BALANCE,WHEELS} from './model'
import {escapementFraming,fitWatchDistance} from './framing'
describe('watch optical framing',()=>{
 it('contains the entire movement sphere in both axes, including a narrow/short stage',()=>{
  for(const aspect of [.45,.8,1,1.8,3]) for(const radius of [7.6,14.8,19.8]){
   const distance=fitWatchDistance(radius,aspect,43)
   const angularRadius=Math.asin(radius/distance)
   expect(angularRadius).toBeLessThan(43*Math.PI/360)
   expect(angularRadius).toBeLessThan(Math.atan(Math.tan(43*Math.PI/360)*aspect))
  }
 })
 it('fits wider explosions without changing the optics or field of view',()=>{
  expect(fitWatchDistance(19.8,1.5,43)/fitWatchDistance(14.8,1.5,43)).toBeCloseTo(19.8/14.8)
 })
})


describe('exploded escapement framing',()=>{
 it('keeps balance and train inside the perspective frustum as their layers rise',()=>{
  for(const explode of [0,.25,.5,.75,1]) for(const aspect of [.45,.8,1.5,2.5]){
   const frame=escapementFraming(explode),target=new Vector3(.3,-3,frame.z)
   const camera=new PerspectiveCamera(43,aspect,.05,250)
   camera.position.copy(target).addScaledVector(new Vector3(0,-.25,.968).normalize(),fitWatchDistance(frame.radius,aspect,43));camera.lookAt(target);camera.updateMatrixWorld()
   const rings=[{x:BALANCE[0],y:BALANCE[1],z:3.75+explode*12,r:3.8},...WHEELS.slice(3).map((wheel,i)=>({x:wheel.x,y:wheel.y,z:wheel.z+explode*(1.3+(i+3)*2.1),r:1.8}))]
   for(const ring of rings) for(let i=0;i<96;i++){
    const a=i/96*Math.PI*2
    const p=new Vector3(ring.x+Math.cos(a)*ring.r,ring.y+Math.sin(a)*ring.r,ring.z).project(camera)
    expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1)
    expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1)
   }
  }
 })
 it('preserves the existing assembled close-up',()=>{
  expect(escapementFraming(0)).toEqual({z:3.8,radius:6.4})
 })
})
