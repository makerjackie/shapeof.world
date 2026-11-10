import {describe,it,expect} from 'vitest'
import {comparisonLayout} from './layout'

describe('stellar comparison display layout',()=>{
 it('keeps adjacent giant photospheres apart even at maximum compressed radius',()=>{
  const radii=[.62,1.4,2.3,2.3],positions=comparisonLayout(radii,false)
  for(let i=1;i<radii.length;i++)expect(positions[i][0]-positions[i-1][0]).toBeGreaterThan(radii[i]+radii[i-1])
  expect(positions[0][0]-radii[0]).toBeCloseTo(-(positions[3][0]+radii[3]))
 })
 it('separates all four maximum-radius glyphs in the narrow-screen grid',()=>{
  const positions=comparisonLayout([2.3,2.3,2.3,2.3],true)
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)expect(Math.hypot(positions[i][0]-positions[j][0],positions[i][1]-positions[j][1])).toBeGreaterThan(4.6)
 })
})
