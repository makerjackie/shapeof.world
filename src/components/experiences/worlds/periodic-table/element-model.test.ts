import {studies,featured} from './procedural-studies'
import {describe,it,expect} from 'vitest'
import {elements,chineseNames,phaseAt,sameFamily} from './element-model'
describe('element identity and material-state comparisons',()=>{
  it('retains 118 distinct identities, names and table positions',()=>{
    expect(elements).toHaveLength(118);expect(chineseNames).toHaveLength(118)
    expect(new Set(chineseNames).size).toBe(118)
    expect(new Set(elements.map(e=>`${e.layoutRow}:${e.layoutColumn}`)).size).toBe(118)
    expect(elements.map(e=>e.atomicNumber)).toEqual(Array.from({length:118},(_,i)=>i+1))
    expect(elements.find(e=>e.symbol==='K')?.atomicMass).toBe('39.098')
    expect(elements.find(e=>e.symbol==='Ba')?.atomicMass).toBe('137.33')
  })
  it('shows gallium solid and mercury and bromine liquid at 20°C',()=>{
    expect(phaseAt(20,studies.Ga.melt!)).toBe('solid')
    expect(phaseAt(20,studies.Hg.melt!)).toBe('liquid')
    expect(phaseAt(20,studies.Br.melt!)).toBe('liquid')
    expect(phaseAt(29,studies.Cs.melt!)).toBe('liquid')
    expect(phaseAt(29,studies.Ga.melt!)).toBe('solid')
  })
  it('does not invent an extended melting interval',()=>{
    for(const s of Object.values(studies).filter(s=>s.kind==='thermal')){
      const m=s.melt!;expect(phaseAt(m-.0001,m)).toBe('solid');expect(phaseAt(m,m)).toBe('coexist');expect(phaseAt(m+.0001,m)).toBe('liquid')
      expect(s.min!).toBeLessThan(m);expect(s.max!).toBeGreaterThan(m)
    }
    expect(()=>phaseAt(NaN,1)).toThrow(RangeError)
  })
  it('never assigns invented material samples to the other elements',()=>{
    expect(Object.keys(studies).sort()).toEqual([...featured].sort())
    expect(studies.Og).toBeUndefined();expect(studies.Fr).toBeUndefined()
  })
  it('keeps detached f-block rows separate instead of grouping missing groups',()=>{
    const get=(symbol:string)=>elements.find(e=>e.symbol===symbol)!
    expect(sameFamily(get('La'),get('Ce'))).toBe(true)
    expect(sameFamily(get('La'),get('Ac'))).toBe(false)
    expect(sameFamily(get('Ne'),get('Ar'))).toBe(true)
  })
})
