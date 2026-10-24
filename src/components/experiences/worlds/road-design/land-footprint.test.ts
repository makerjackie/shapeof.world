import { describe, expect, it } from 'vitest'
import { junctionRoads, lockedLand, type LandRoad } from './sim/land-footprint'
import { DESIGNS } from './designs'
const path=(pairs:number[][],width=4):LandRoad=>({width,points:pairs.map(([x,z])=>({x,y:0,z}))})
describe('buffered pavement and enclosed land',()=>{
 it('fills a closed interior but leaves the four open quadrants of a cross alone',()=>{
  const ring=lockedLand([path([[0,0],[100,0],[100,100],[0,100],[0,0]])],2,0)
  expect(ring.enclosedArea).toBeGreaterThan(9000)
  expect(ring.area).toBeCloseTo(10816,-2)
  const cross=lockedLand([path([[-100,0],[100,0]]),path([[0,-100],[0,100]])],2,0)
  expect(cross.enclosedArea).toBe(0)
  expect(cross.area).toBeLessThan(1700)
 })
 it('does not fill land accessible through an opening larger than the road buffer',()=>{
  const open=lockedLand([path([[0,0],[100,0],[100,100],[0,100],[0,60]]),path([[0,40],[0,0]])],2,0)
  expect(open.enclosedArea).toBe(0)
  expect(lockedLand([path([[0,0],[100,0],[100,100],[0,100],[0,60]]),path([[0,40],[0,0]])],2,10).enclosedArea).toBeGreaterThan(0)
 })
 it('clips remote motorway leads without changing the locked junction land',()=>{
  for(const id of ['cloverleaf','stack','turbine','diamond']){
   const n=DESIGNS.find(d=>d.id===id)!.build(),before=lockedLand(junctionRoads(n)).area
   for(const r of n.carriageways.filter(r=>r.kind==='main'))r.points=r.points.map(p=>Math.hypot(p.x,p.z)>1400?{...p,x:p.x*2,z:p.z*2}:p)
   expect(lockedLand(junctionRoads(n)).area).toBe(before)
  }
 })
 it('converges across one, two and four metre grids for the representative hub shapes',()=>{
  for(const id of ['cloverleaf','stack','turbine']){
   const roads=junctionRoads(DESIGNS.find(d=>d.id===id)!.build()),fine=lockedLand(roads,1).area
   for(const g of [2,4])expect(Math.abs(lockedLand(roads,g).area-fine)/fine).toBeLessThan(.025)
  }
 })
})
