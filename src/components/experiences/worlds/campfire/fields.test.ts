import { describe, it, expect } from 'vitest'
import { decodeSample, explainReading, slicePoint, projectPoint, INITIAL_SLICE } from './fields'
import { lookAt } from './engine/camera.js'
describe('upstream field units',()=>{
  it('decodes scaled temperature, weighted age, air carrier and cell-space curl',()=>{
    const raw=[.907,.05,.4,.8,.45,.025,.01,0,1,2,2,0,.03,.04,0,.05,1,0,0,.01]
    const r=decodeSample(raw,[0,.3,0],2,.02)
    expect(r.temperature).toBeCloseTo(1200)
    expect(r.celsius).toBeCloseTo(926.85)
    expect(r.air).toBeCloseTo(.5)
    expect(r.oxygenMassEstimate).toBeCloseTo(.116)
    expect(r.age).toBeCloseTo(.05)
    expect(r.heatingRate).toBe(8000)
    expect(r.speed).toBe(3)
    expect(r.vorticity).toBeCloseTo(2.5)
    expect(r.thermalPowerDensityEstimate).toBeCloseTo(354800/1200*8000)
  })
  it('does not invent an age in fresh air or a gas reading in wood',()=>{
    const raw=Array(20).fill(0)
    expect(decodeSample(raw,[0,0,0],0,.02).age).toBeNull()
    raw[18]=1
    expect(explainReading(decodeSample(raw,[0,0,0],0,.02))).toContain('木柴')
  })
})
describe('world-space section picking',()=>{
  const cam=lookAt([0,.6,2],[0,.6,0],40)
  it('agrees with the projection in perspective and both orientations',()=>{
    const slice={...INITIAL_SLICE,enabled:true}
    expect(slicePoint(cam,.5,.5,1.6,slice)).toEqual([0,.6,0])
    const p:[number,number,number]=[.24,.88,0]
    const uv=projectPoint(cam,p,1.6)!
    const back=slicePoint(cam,...uv,1.6,slice)!
    p.forEach((x,i)=>expect(back[i]).toBeCloseTo(x))
    expect(slicePoint(cam,.5,.5,1.6,{...slice,horizontal:true,offset:.3})).toBeNull()
    expect(slicePoint(cam,0,0,1.6,slice)).toBeNull()
  })
})
