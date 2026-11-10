import {describe,expect,it} from 'vitest'
import {inspectByteStage} from './model'
describe('selectable full-adder inspection',()=>{
 it('follows the carry all the way through 255 + 1',()=>{
  for(let i=0;i<8;i++){
   const s=inspectByteStage(255,1,i)
   expect(s.incoming).toBe(i===0?0:1);expect(s.sum).toBe(0);expect(s.carry).toBe(1)
   expect(s.total).toBe(s.sum+2*s.carry)
  }
 })
 it('shows a carry dying rather than forwarding every incoming 1',()=>{
  const first=inspectByteStage(1,1,0),second=inspectByteStage(1,1,1),third=inspectByteStage(1,1,2)
  expect(first.carry).toBe(1);expect(second.incoming).toBe(1);expect(second.sum).toBe(1);expect(second.carry).toBe(0);expect(third.incoming).toBe(0)
 })
 it('returns an actual integer stage for an out-of-range or malformed inspection index',()=>{
  for(const index of [-3,.9,8,Infinity,-Infinity,NaN]){
   const s=inspectByteStage(37,91,index)
   expect(Number.isInteger(s.bit)).toBe(true);expect(s.bit).toBeGreaterThanOrEqual(0);expect(s.bit).toBeLessThan(8);expect(s.total).toBe(s.sum+2*s.carry)
  }
 })
})
