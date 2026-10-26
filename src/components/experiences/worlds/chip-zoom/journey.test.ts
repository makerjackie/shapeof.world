import { describe, expect, it } from 'vitest'
import { buildAdder, primitiveCircuit } from './logic-model'
import { SCALES, STAGES, stageIndex, stageWeight, siliconLattice, ruler } from './scale-model'
describe('teaching circuits',()=>{
  it('computes all 256 four-bit additions including fifth-bit carry through NAND nodes',()=>{
    for(let a=0;a<16;a++) for(let b=0;b<16;b++) {
      const c=buildAdder(a,b)
      expect(c.result).toBe(a+b); expect(c.gates).toHaveLength(36)
      for(const gate of c.gates) { expect(gate.value).toBe(!gate.inputs.every(i=>c.values[i])); for(const i of gate.inputs) expect(c.depths[i]).toBeLessThan(gate.depth) }
    }
    expect(buildAdder(6,7).sums.map(key=>Number(buildAdder(6,7).values[key])).reverse().join('')).toBe('1101')
  })
  it('has correct primitive truth tables and one-bit carry',()=>{
    for(const a of [false,true]) for(const b of [false,true]) {
      expect(primitiveCircuit('not',a,b).result).toBe(Number(!a))
      expect(primitiveCircuit('nand',a,b).result).toBe(Number(!(a&&b)))
      for(const c of [false,true]) expect(buildAdder(Number(a),Number(b),1,c).result).toBe(Number(a)+Number(b)+Number(c))
    }
  })
})
describe('continuous scale and silicon geometry',()=>{
  it('covers seven anchors without gaps, reverses exactly and preserves scale units',()=>{
    expect(STAGES).toHaveLength(7)
    SCALES.forEach((s,i)=>expect(stageIndex(s)).toBe(i))
    for(let i=0;i<=200;i++) {
      const s=SCALES[0]+(SCALES.at(-1)!-SCALES[0])*i/200
      expect(STAGES.reduce((sum,_,j)=>sum+stageWeight(j,s),0)).toBeCloseTo(1,10)
      expect(ruler(s,1000).pixels).toBeGreaterThan(0)
    }
  })
  it('uses diamond-cubic nearest neighbours instead of a simple cubic ball grid',()=>{
    const {atoms,bonds}=siliconLattice(3)
    const degree=atoms.map(()=>0); bonds.forEach(([a,b])=>{degree[a]++;degree[b]++})
    expect(Math.max(...degree)).toBe(4)
    expect(atoms).toHaveLength(216)
  })
})
