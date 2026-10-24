import { describe,it,expect } from 'vitest'
import { createLipidHeadgroups,proteinClearance } from './molecular-display'
import { getFramedScale, getScaleBar } from './scale-model'
describe('molecular display, independent of biological illumination',()=>{
 it('keeps the target-to-camera corridor clear, with an untouched background',()=>{
  expect(proteinClearance([28,15,140],[28,15,170],8)).toBe(0)
  expect(proteinClearance([28,15,174],[28,15,170],8)).toBe(0)
  expect(proteinClearance([-80,15,120],[28,15,170],8)).toBe(1)
 })
 it('uses reproducible non-grid headgroups of bounded size and height',()=>{
  const heads=createLipidHeadgroups(true,9.2,3.3)
  expect(heads.length).toBeGreaterThan(15000)
  expect(heads.length).toBeLessThan(25000)
  expect(heads).toEqual(createLipidHeadgroups(true,9.2,3.3))
  expect(new Set(heads.slice(0,100).map(p=>p.position[2])).size).toBe(100)
  expect(heads.every(p=>p.scale>=.9&&p.scale<=1.1&&p.position.every(Number.isFinite))).toBe(true)
 })
 it('keeps portrait magnification continuous, with a matching physical scale',()=>{
  expect(getFramedScale(-6.8,true)).toBe(-6.8)
  expect(getFramedScale(-7.7,false)).toBe(-7.7)
  expect(getFramedScale(-7.7,true)).toBeCloseTo(-7.755)
  const framed=getFramedScale(-7.7,true), bar=getScaleBar(framed,390,88)
  expect(bar.widthPx/390).toBeCloseTo(bar.lengthMeters/10**framed,10)
  let previous=0
  for(let s=-7;s>=-7.7;s-=.002){const f=getFramedScale(s,true);expect(f).toBeLessThan(previous);previous=f}
 })
})
