import * as T from 'three'
import { describe, expect, it } from 'vitest'
import { engineFrame } from './framing'
import type { PartId } from './content'
describe('exhibit camera framing', () => {
 it('keeps the actual silhouette in the frustum for aspect ratios and explosion', () => {
  const tan = Math.tan(38 * Math.PI / 360)
  for (const aspect of [.55,.8,1.4,2.5]) for (const e of [0,.5,1]) for (const view of ['cutaway','assembled','shafts','front'] as const) {
   const f=engineFrame(view,e,null,4,aspect)
   for (const point of f.points) {
    const p=point.clone().sub(f.target), depth=f.distance-p.dot(f.direction)
    expect(depth).toBeGreaterThan(0)
    expect(Math.abs(p.dot(f.right))/depth).toBeLessThanOrEqual(tan*aspect*.861)
    expect(Math.abs(p.dot(f.up))/depth).toBeLessThanOrEqual(tan*.861)
   }
  }
 })
 it('tracks individual compressor stages and separated assemblies', () => {
  expect(engineFrame('cutaway',0,'compressor',8,1.5).target.x-engineFrame('cutaway',0,'compressor',0,1.5).target.x).toBeCloseTo(8*.285)
  for (const id of ['fan','compressor','combustor','turbine','nozzle'] as PartId[]) {
   const f=engineFrame('cutaway',1,id,4,.6)
   expect(f.position.toArray().every(Number.isFinite)).toBe(true)
   expect(f.distance).toBeGreaterThan(2)
  }
  expect(engineFrame('cutaway',1,'fan',4,1).target.x).toBeLessThan(engineFrame('cutaway',0,'fan',4,1).target.x)
 })
 it('keeps the front fan outside the chosen compressor row in screen space',()=>{
  for(const stage of [0,8])for(const e of [0,1]){
   const f=engineFrame('cutaway',e,'compressor',stage,1.5)
   const stageLeft=Math.min(...f.points.map(p=>p.clone().sub(f.target).dot(f.right)))
   const fanRight=Math.max(...Array.from({length:64},(_,i)=>new T.Vector3(-4.24-e*2,Math.cos(i*Math.PI/32)*2.1,Math.sin(i*Math.PI/32)*2.1).sub(f.target).dot(f.right)))
   expect(fanRight).toBeLessThan(stageLeft-.15)
  }
 })

})
