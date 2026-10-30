import {describe,expect,it} from 'vitest'
import {fitWatchDistance} from './framing'
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
