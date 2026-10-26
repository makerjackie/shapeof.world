import { describe, expect, it } from 'vitest'
import { containAnchor, layoutLabels } from './anatomy'
describe('annotations remain reachable when their measured anchors leave the view',()=>{
  for(const [w,h] of [[1600,1000],[390,844],[390,484]]) it(`contains eight targets at ${w}×${h}`,()=>{
    const points=Array.from({length:8},(_,i)=>containAnchor({id:String(i),x:i%2?-300:2000,y:-200+i*250},w,h))
    for(const p of points){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThan(w);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThan(h)}
    const labels=layoutLabels(points,w,h)
    expect(labels).toHaveLength(8)
    for(const a of labels){expect(a.left).toBeGreaterThanOrEqual(0);expect(a.left+a.width).toBeLessThanOrEqual(w);expect(a.top).toBeGreaterThanOrEqual(0);expect(a.top+44).toBeLessThan(h)}
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j]
      expect(a.left+a.width<=b.left||b.left+b.width<=a.left||a.top+44<=b.top||b.top+44<=a.top).toBe(true)
    }
  })
  it('retains the direction of an offscreen measurement instead of drawing an invented in-view position',()=>{
    const p=containAnchor({id:'smoke',x:200,y:-100},390,844)
    expect(p.offscreen).toBe(true);expect(p.angle).toBe(-90)
    expect(containAnchor({id:'tip',x:200,y:350},390,844).offscreen).toBe(false)
  })
})
