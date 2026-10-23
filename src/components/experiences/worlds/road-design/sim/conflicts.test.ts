import { describe, expect, it } from 'vitest'
import { DESIGNS, cloverleaf, crossroadsSignal, crossroadsYield, tJunction } from '../designs'
import { distance } from '../designs/kit'
import { calculateConflicts, summarizeConflicts } from './conflicts'

describe('movement-level conflict geometry', () => {
  it('finds the nine T-junction conflicts from six movement paths', () => {
    expect(summarizeConflicts(calculateConflicts(tJunction.build()))).toEqual({ total: 9, crossing: 3, merge: 3, diverge: 3 })
  })
  it('finds the 32 crossroad conflicts from twelve movement paths', () => {
    const points = calculateConflicts(crossroadsYield.build())
    expect(summarizeConflicts(points)).toEqual({ total: 32, crossing: 16, merge: 8, diverge: 8 })
    expect(new Set(points.map(p => `${p.position.x.toFixed(3)},${p.position.z.toFixed(3)}`)).size).toBe(32)
  })
  it('retains permissive-left conflicts while separating opposing phases', () => {
    const points = calculateConflicts(crossroadsSignal.build()).filter(p => p.type === 'crossing')
    expect(points).toHaveLength(16)
    expect(points.filter(p => p.separatedBySignal)).toHaveLength(12)
  })
  it('removes bridge crossings without suppressing physical merge/diverge events', () => {
    const result = summarizeConflicts(calculateConflicts(cloverleaf.build()))
    expect(result.crossing).toBe(0)
    expect(result.merge).toBeGreaterThan(0)
    expect(result.diverge).toBeGreaterThan(0)
  })
})

describe('connected road geometry', () => {
  for (const design of DESIGNS) it(`${design.id}: routes stay on continuous connected lanes`, () => {
    const network = design.build(), byId = new Map(network.lanes.map(l => [l.id, l]))
    for (const movement of network.movements) for (let i = 1; i < movement.lanes.length; i++) {
      const previous = byId.get(movement.lanes[i - 1])!, next = byId.get(movement.lanes[i])!
      if (previous.left === next.id || previous.right === next.id) {
        // A planned lateral transfer has aligned longitudinal coordinates and
        // enough paved width; the simulator crosses it over 3.5 seconds.
        expect(distance(previous.points[0], next.points[0])).toBeLessThanOrEqual((previous.width + next.width) / 2 + 0.001)
        expect(distance(previous.points.at(-1)!, next.points.at(-1)!)).toBeLessThanOrEqual((previous.width + next.width) / 2 + 0.001)
      } else {
        expect(previous.next).toContain(next.id)
        expect(distance(previous.points[previous.points.length - 1], next.points[0])).toBeLessThan(0.001)
      }
    }
    for (const road of network.carriageways) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i]
      expect(Math.abs(b.y - a.y) / Math.max(0.001, Math.hypot(b.x - a.x, b.z - a.z))).toBeLessThanOrEqual(0.061)
    }
  })
  it('requires entering and exiting loop traffic to exchange lanes in the highlighted weaving sections', () => {
    const network = cloverleaf.build()
    for (const movement of network.movements.filter(m => m.turn === 'left')) {
      const exchanges = movement.lanes.slice(1).flatMap((id, i) => network.weaving.filter(section => section.lanes?.includes(id) && section.lanes.includes(movement.lanes[i])))
      expect(exchanges).toHaveLength(2)
      expect(new Set(exchanges.map(section => section.id)).size).toBe(2)
    }
  })
})
