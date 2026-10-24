import { describe, expect, it } from 'vitest'
import { DESIGNS } from './designs'
import { capacityOD, isPlateau, type CapacityStage } from './sim/capacity-study'
import measured from './data/capacity.json'

describe('saturation evidence',()=>{
 const stage=(multiplier:number,total:number,queue=0):CapacityStage=>({multiplier,demand:10000*multiplier,total,turning:total*.4,delay:queue?40:5,queue,queueGrowth:queue,backlogSeconds:queue*3600/total,missed:0})
 it('does not call increasing demand capacity, or mistake noise without queues for a plateau',()=>{
  expect(isPlateau([stage(1,10000),stage(2,20000),stage(3,30000)])).toBe(false)
  expect(isPlateau([stage(1,8000),stage(2,8100),stage(3,8200)])).toBe(false)
  expect(isPlateau([stage(1,8000),stage(2,8100,500),stage(3,8200,1000)])).toBe(true)
 })
 it('uses the same 20/60/20 experiment OD in all four-arm motorway systems',()=>{
  for(const id of ['cloverleaf','stack','turbine']){
   const n=DESIGNS.find(d=>d.id===id)!.build(),od=capacityOD(n)
   for(const from of new Set(n.movements.map(m=>m.from))){
    const moves=n.movements.filter(m=>m.from===from),rows=od.filter(r=>moves.some(m=>m.id===r.movementId)),total=rows.reduce((s,r)=>s+r.vehiclesPerHour,0)
    expect(total).toBeCloseTo(4800)
    for(const [turn,share] of [['left',.2],['straight',.6],['right',.2]] as const)expect(rows.filter(r=>moves.find(m=>m.id===r.movementId)!.turn===turn).reduce((s,r)=>s+r.vehiclesPerHour,0)/total).toBeCloseTo(share)
   }
  }
 })
 it('keeps same-destination motorway through demand on the mainline instead of taking an exit-and-reentry detour',()=>{
  const n=DESIGNS.find(d=>d.id==='diamond')!.build(),od=capacityOD(n)
  for(const m of n.movements.filter(m=>m.id.endsWith('ramp-through')))expect(od.find(r=>r.movementId===m.id)!.vehiclesPerHour).toBe(0)
  for(const from of ['north','south'])expect(od.filter(r=>n.movements.find(m=>m.id===r.movementId)!.from===from).reduce((s,r)=>s+r.vehiclesPerHour,0)).toBeCloseTo(3200)
 })
 it('supports the WSDOT directional-over-weaving turning-capacity expectation under this OD',()=>{
  expect(measured.designs.stack.turningVehiclesPerHour).toBeGreaterThanOrEqual(measured.designs.cloverleaf.turningVehiclesPerHour)
 })
})
