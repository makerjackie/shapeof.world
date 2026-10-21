import {expect,it} from 'vitest'
import {cabinetTransform} from './cabinet-motion'
import {tableSeries} from './table-series'
import {elements} from './element-model'

it('lands the whole cabinet inside each tile without stretching its image',()=>{
 for(const target of [{left:60,top:180,width:62,height:70},{left:210,top:600,width:16,height:30},{left:90,top:50,width:310,height:220}]){
  const box={left:86,top:154,width:632,height:630}
  const [x,y,s]=cabinetTransform(target,box).match(/-?[\d.]+/g)!.map(Number)
  expect(box.left+box.width/2+x).toBeCloseTo(target.left+target.width/2)
  expect(box.top+box.height/2+y).toBeCloseTo(target.top+target.height/2)
  expect(box.width*s).toBeLessThanOrEqual(target.width+.0001)
  expect(box.height*s).toBeLessThanOrEqual(target.height+.0001)
 }
})
it('connects the compact-table gaps to all 15 elements in the correct detached row',()=>{
 for(const s of tableSeries){
  const row=elements.filter(e=>e.layoutRow===s.row)
  expect(row.map(e=>e.atomicNumber)).toEqual(Array.from({length:15},(_,i)=>s.first+i))
  expect(row.at(-1)?.atomicNumber).toBe(s.last)
  expect(row.every(e=>e.series===s.name)).toBe(true)
  expect(elements.some(e=>e.layoutRow===s.period&&e.layoutColumn===3)).toBe(false)
 }
})
