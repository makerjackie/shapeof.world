import {afterEach,it,expect,vi} from 'vitest'
import {readCollection,writeCollection} from './museum-collection'
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()})
it('persists discoveries across visits and isolates elements from experiments',()=>{
 writeCollection('elements',new Set(['Na','Rn']));writeCollection('experiments',new Set(['Rn-time']))
 expect([...readCollection('elements')]).toEqual(['Na','Rn']);expect([...readCollection('experiments')]).toEqual(['Rn-time'])
})
it('ignores stale, corrupt and unrecognized local data',()=>{
 localStorage.setItem('oneworld:periodic-table:museum:elements:v1','["Na","Na","fake",null,42,"Rn-time"]')
 expect([...readCollection('elements')]).toEqual(['Na'])
 localStorage.setItem('oneworld:periodic-table:museum:elements:v1','not json');expect(readCollection('elements').size).toBe(0)
})
it('remains usable when browser storage is blocked',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')})
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
 expect(readCollection('elements').size).toBe(0);expect(()=>writeCollection('elements',new Set(['Na']))).not.toThrow()
})
