import { describe, expect, it } from 'vitest'
import { buildRoundabout, ROUNDABOUT_OUTER_RADIUS, ROUNDABOUT_RING_WIDTH } from './designs/roundabout'
import { distance } from './designs/kit'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'

describe('single-lane roundabout', () => {
  it('derives four merges and four diverges from twelve O-D paths', () => {
    const network = buildRoundabout()
    expect(network.movements).toHaveLength(12)
    expect(summarizeConflicts(calculateConflicts(network))).toEqual({ total: 8, crossing: 0, merge: 4, diverge: 4 })
  })
  it('uses connected circulating lanes and exits before the next approach joins', () => {
    const network = buildRoundabout(), lanes = new Map(network.lanes.map(lane => [lane.id, lane]))
    for (const movement of network.movements) {
      for (let i = 1; i < movement.lanes.length; i++) {
        const before = lanes.get(movement.lanes[i - 1])!, after = lanes.get(movement.lanes[i])!
        expect(before.next).toContain(after.id)
        expect(distance(before.points.at(-1)!, after.points[0])).toBeLessThan(0.001)
      }
      expect(movement.lanes.filter(id => lanes.get(id)!.circulating)).toHaveLength(movement.turn === 'right' ? 1 : movement.turn === 'straight' ? 3 : 5)
    }
    for (const lane of network.lanes.filter(lane => lane.circulating)) for (const p of lane.points) expect(Math.hypot(p.x, p.z)).toBeCloseTo(ROUNDABOUT_OUTER_RADIUS - ROUNDABOUT_RING_WIDTH / 2)
  })
})
