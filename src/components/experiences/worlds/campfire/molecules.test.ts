import { describe, expect, it } from 'vitest'
import { atomCounts, moleculeScene, stationForReading, type Bond } from './molecules'
import { decodeSample } from './fields'
function species(id:'reaction'|'char',side:'before'|'after') {
  const s=moleculeScene(id),seen=new Set<number>(),out:string[]=[]
  s.atoms.forEach((_,i)=>{if(seen.has(i))return;const group:number[]=[],stack=[i];while(stack.length){const n=stack.pop()!;if(seen.has(n))continue;seen.add(n);group.push(n);s[side].forEach(([a,b]:Bond)=>{if(a===n)stack.push(b);if(b===n)stack.push(a)})}const counts={C:0,H:0,O:0};group.forEach(n=>counts[s.atoms[n].element]++);out.push((['C','H','O'] as const).filter(e=>counts[e]).map(e=>e+(counts[e]>1?counts[e]:'')).join(''))})
  return out.sort()
}
describe('molecular explanations',()=>{
  it('has the actual connected molecules on each side of methane combustion',()=>{
    expect(species('reaction','before')).toEqual(['CH4','O2','O2'])
    expect(species('reaction','after')).toEqual(['CO2','H2O','H2O'])
    expect(atomCounts(moleculeScene('reaction'))).toEqual({C:1,H:4,O:4})
    expect(species('char','before')).toEqual(['C','O2']);expect(species('char','after')).toEqual(['CO2'])
  })
  it('keeps every atom identity and finite position through all five scenes',()=>{
    for(const id of ['wood','reaction','soot','char','exhaust'] as const){const s=moleculeScene(id);expect(s.atoms.every(a=>[...a.from,...a.to].every(Number.isFinite))).toBe(true);for(const [a,b] of [...s.before,...s.after]){expect(a).not.toBe(b);expect(s.atoms[a]).toBeDefined();expect(s.atoms[b]).toBeDefined()}}
    expect(atomCounts(moleculeScene('wood'))).toEqual({C:6,H:10,O:5})
  })
  it('chooses the explanation from field state, without claiming measured species',()=>{
    const r=decodeSample([1,.03,.02,.8,.2,.02,0,0,0,2,0,0,0,0,0,0,0,0,0,0],[0,.3,0],3,.01875)
    expect(stationForReading(r)).toBe('reaction')
    expect(stationForReading({...r,solid:true})).toBe('wood')
    expect(stationForReading({...r,heatingRate:0,air:.02,fuel:.1,age:.06,soot:.1})).toBe('soot')
    expect(stationForReading({...r,position:[0,.06,0],heatingRate:0})).toBe('char')
  })
})
