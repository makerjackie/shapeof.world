import { describe, expect, it } from 'vitest'
import { DESIGNS } from './designs'
import { PRESENTATIONS, defaultOverlays } from './presentation'

describe('design presentation contracts', () => {
  it('keeps the first hero clean and reveals weaving on a return visit', () => {
    expect(Object.values(defaultOverlays('cloverleaf',true))).toEqual([false,false,false,false])
    expect(defaultOverlays('cloverleaf').weaving).toBe(true)
  })
  it('gives every design a phone composition and separates stack from turbine', () => {
    for (const d of DESIGNS) { expect(PRESENTATIONS[d.id].mobile).toHaveLength(3); expect(PRESENTATIONS[d.id].fov).toBeGreaterThan(20) }
    expect(PRESENTATIONS.stack.position[1]).toBeLessThan(PRESENTATIONS.turbine.position[1]/2)
    expect(PRESENTATIONS['continuous-flow'].position[1]).toBeGreaterThan(250)
  })
  it('feeds each cloverleaf loop at the requested assumed 500–700 veh/h', () => {
    const n=DESIGNS.find(d=>d.id==='cloverleaf')!.build()
    for(const m of n.movements.filter(m=>m.turn==='left')) {
      const q=n.defaultOD!.find(row=>row.movementId===m.id)!.vehiclesPerHour
      expect(q).toBeGreaterThanOrEqual(500); expect(q).toBeLessThanOrEqual(700)
    }
  })
})
