import {describe,it,expect} from 'vitest'
import {elements} from './element-model'
import {elementStories} from './element-stories'
import {exhibitExperiments,experimentsFor,clampProgress,radonRemaining} from './reaction-model'
const countAtoms=(side:string)=>{const counts:Record<string,number>={};for(const term of side.split('+')){const plain=term.trim().replace(/[²⁺↑]/g,'').replaceAll('₂','2');const coefficient=Number(plain.match(/^\d+/)?.[0]??1);for(const match of plain.matchAll(/([A-Z][a-z]?)(\d*)/g))counts[match[1]]=(counts[match[1]]??0)+coefficient*Number(match[2]||1)}return counts}

describe('museum learning and experiment coverage',()=>{
 it('gives all 118 elements a use story without inventing bulk superheavy applications',()=>{
  expect(Object.keys(elementStories)).toHaveLength(118)
  for(const e of elements){expect(elementStories[e.symbol]?.title.length).toBeGreaterThan(3);expect(elementStories[e.symbol]?.uses.length).toBeGreaterThan(20);expect(elementStories[e.symbol]?.titleEn.length).toBeGreaterThan(3);expect(elementStories[e.symbol]?.usesEn.length).toBeGreaterThan(20);expect(elementStories[e.symbol].titleEn+elementStories[e.symbol].usesEn).not.toMatch(/[\u3400-\u9fff]/)}
  for(const e of elements.filter(e=>e.atomicNumber>=101))expect(elementStories[e.symbol].uses).toMatch(/研究/)
 })
 it('balances atoms in chemical transformations and keeps nuclear and physical changes separate',()=>{
  expect(new Set(exhibitExperiments.map(e=>e.id)).size).toBe(exhibitExperiments.length)
  const known=new Set(elements.map(e=>e.symbol))
  for(const e of exhibitExperiments){for(const symbol of e.elements)expect(known.has(symbol)).toBe(true);expect(new URL(e.source).protocol).toBe('https:');for(const key of ['partnerEn','titleEn','conditionEn','resultEn','explanationEn'] as const){expect(e[key].length).toBeGreaterThan(2);expect(e[key]).not.toMatch(/[\u3400-\u9fff]/)}if(['bubbles','deposit','oxide','burn'].includes(e.effect)){const [left,right]=e.equation.split('→');expect(countAtoms(left),e.id).toEqual(countAtoms(right))}}
  expect(experimentsFor('Rn').map(e=>e.effect)).toEqual(['decay'])
  expect(experimentsFor('Ga').map(e=>e.effect)).toEqual(['melt'])
  expect(experimentsFor('Ne').map(e=>e.effect)).toEqual(['glow'])
  expect(experimentsFor('Og')).toEqual([])
  expect(experimentsFor('invented')).toEqual([])
 })
 it('makes the reverse copper and iron pairing explicitly nonreactive',()=>{
  expect(experimentsFor('Fe').find(e=>e.id==='Fe-copper')?.effect).toBe('deposit')
  expect(experimentsFor('Cu').find(e=>e.id==='Cu-iron')?.effect).toBe('still')
 })
 it('shows expected half-life counts and bounds animation progress',()=>{
  expect(radonRemaining(0)).toBe(1);expect(radonRemaining(1)).toBe(.5);expect(radonRemaining(2)).toBe(.25)
  expect(clampProgress(-3)).toBe(0);expect(clampProgress(8)).toBe(1);expect(clampProgress(NaN)).toBe(0)
 })
})
