import {describe,it,expect} from 'vitest'
import {elements} from './element-model'
import {materialProperties,materialPhase,sortedSpecimens} from './material-properties'
describe('museum properties',()=>{
 it('conserves neutral electron counts in the checked shell configurations',()=>{
  for(const [symbol,p] of Object.entries(materialProperties)){
   expect(p.shells.reduce((a,b)=>a+b,0)).toBe(elements.find(e=>e.symbol===symbol)!.atomicNumber)
   expect(p.melt).toBeLessThan(p.boil)
  }
 })
 it('separates room-temperature solids, liquids, gas and unmeasured samples',()=>{
  expect(materialPhase('Cu',20)).toBe('固态');expect(materialPhase('Hg',20)).toBe('液态');expect(materialPhase('Br',20)).toBe('液态');expect(materialPhase('O',20)).toBe('气态');expect(materialPhase('Og',20)).toBe('未知')
  expect(materialPhase('Br',58.8)).toBe('相变边界');expect(materialPhase('Br',60)).toBe('气态')
 })
 it('puts unavailable properties last, without mutating the collection',()=>{
  const a=['Og','Cu','Hg','O'];expect(sortedSpecimens(a,'density')).toEqual(['O','Cu','Hg','Og']);expect(a[0]).toBe('Og')
 })
})
