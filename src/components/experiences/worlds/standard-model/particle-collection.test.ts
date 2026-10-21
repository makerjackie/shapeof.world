import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readCollection, readMuseumCollection, writeMuseumCollection } from './particle-collection'

describe('explicit museum card collection',()=>{
 let storage:Map<string,string>
 beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)})})
 afterEach(()=>vi.unstubAllGlobals())
 it('preserves earlier observations without silently collecting them',()=>{
  storage.set('oneworld:standard-model:collection:v1','["e","mu"]')
  expect([...readCollection()]).toEqual(['e','mu']);expect(readMuseumCollection().size).toBe(0)
  writeMuseumCollection(new Set(['mu']))
  expect([...readMuseumCollection()]).toEqual(['mu']);expect([...readCollection()]).toEqual(['e','mu'])
 })
 it('ignores malformed or unknown saved card identifiers',()=>{
  storage.set('oneworld:standard-model:cards:v1','["e","e","not-a-particle",3]')
  expect([...readMuseumCollection()]).toEqual(['e'])
  storage.set('oneworld:standard-model:cards:v1','broken');expect(readMuseumCollection().size).toBe(0)
 })
 it('does not break the experience if browser storage is unavailable',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('quota')}})
  expect(readMuseumCollection().size).toBe(0);expect(()=>writeMuseumCollection(new Set(['e']))).not.toThrow()
 })
})
