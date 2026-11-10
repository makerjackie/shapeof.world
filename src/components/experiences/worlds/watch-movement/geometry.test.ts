import {describe,expect,it} from 'vitest'
import {BALANCE,WHEELS} from './model'
import {mainplateGeometry,PLATE_POCKETS} from './geometry'
describe('open-work mainplate',()=>{
 it('keeps every pivot and jewel supported by at least 0.65 mm of plate',()=>{
  for(const [x,y,r] of PLATE_POCKETS){
   expect(Math.hypot(x,y)+r).toBeLessThan(12.9-.6)
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7+.2;expect(Math.hypot(x-Math.cos(a)*11.5,y-Math.sin(a)*11.5)-r).toBeGreaterThan(.7)}
   for(const [px,py] of [...WHEELS.map(w=>[w.x,w.y]),BALANCE]) expect(Math.hypot(x-px,y-py)-r).toBeGreaterThan(.65)
  }
 })
 it('has four true through pockets and finite bevelled geometry',()=>{
  const g=mainplateGeometry()
  const shape=Array.isArray(g.parameters.shapes)?g.parameters.shapes[0]:g.parameters.shapes
  expect(shape.holes).toHaveLength(4)
  expect([...g.attributes.position.array].every(Number.isFinite)).toBe(true)
  g.computeBoundingBox();expect(g.boundingBox!.max.x-g.boundingBox!.min.x).toBeCloseTo(26.02,1)
  g.dispose()
 })
})
