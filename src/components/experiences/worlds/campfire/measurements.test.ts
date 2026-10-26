import { describe, expect, it } from 'vitest'
import { dominantFrequency, heskestad, median } from './measurements'
describe('measured fire instruments',()=>{
  it('keeps the empirical prediction separate from measurements',()=>{
    expect(heskestad(60,.6)).toBeCloseTo(.5967,3)
    expect(heskestad(0)).toBe(0)
    expect(median([.4,.9,.6,.7])).toBeCloseTo(.65)
  })
  it('finds a 1.9 Hz signal in simulation seconds, with drift and irregular samples',()=>{
    const rows=Array.from({length:405},(_,i)=>{const time=i*.05+Math.sin(i)*.002;return{time,value:1100+time*4+80*Math.sin(2*Math.PI*1.9*time)}})
    expect(dominantFrequency(rows).hz).toBeCloseTo(1.9,2)
  })
  it('does not report a formula value for a flat signal, noise, or insufficient data',()=>{
    expect(dominantFrequency([{time:0,value:1200}]).reason).toBe('collecting')
    expect(dominantFrequency(Array.from({length:405},(_,i)=>({time:i*.05,value:1200})))).toMatchObject({hz:null,reason:'flat'})
    let seed=42
    const noise=Array.from({length:405},(_,i)=>{seed=(1664525*seed+1013904223)>>>0;return{time:i*.05,value:1100+(seed/2**32-.5)*400}})
    expect(dominantFrequency(noise).hz).toBeNull()
  })
})
