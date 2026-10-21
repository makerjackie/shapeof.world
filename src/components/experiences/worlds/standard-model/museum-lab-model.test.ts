import {describe,it,expect} from 'vitest'
import {conversionProbability,hydrogenRadialDensity} from './museum-lab-model'
describe('museum teaching models',()=>{
 it('preserves probability, the zero-baseline limit and L/E scaling',()=>{
  expect(conversionProbability(0,1)).toBe(0)
  expect(conversionProbability(100,1,0)).toBe(0)
  expect(conversionProbability(300,1)).toBeCloseTo(conversionProbability(600,2),12)
  expect(conversionProbability(Math.PI/(2*1.267*.0025),1,45)).toBeCloseTo(1,12)
  for(let l=0;l<=2000;l+=13){const p=conversionProbability(l,.5);expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThanOrEqual(1)}
 })
 it('normalizes the radial distribution and peaks at one Bohr radius',()=>{
  let integral=0;for(let r=.0005;r<15;r+=.001)integral+=hydrogenRadialDensity(r)*.001
  expect(integral).toBeCloseTo(1,6)
  expect(hydrogenRadialDensity(1)).toBeGreaterThan(hydrogenRadialDensity(.9))
  expect(hydrogenRadialDensity(1)).toBeGreaterThan(hydrogenRadialDensity(1.1))
 })
})
