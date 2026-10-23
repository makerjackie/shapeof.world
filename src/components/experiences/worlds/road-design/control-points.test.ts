import { describe, expect, it } from 'vitest'
import { buildRoundabout } from './designs/roundabout'
import { buildServiceInterchange } from './designs/diamond'
import { TrafficSimulation } from './sim/simulation'
import { buildMovementConflicts, criticalGap, followUpTime } from './sim/control'

describe('roundabout circulating priority', () => {
  it('accepts a 5.2 s gap, with a 3.2 s follow-up, and yields to traffic already on the ring', () => {
    const network = buildRoundabout()
    const enteringMove = network.movements.find(m => m.from === 'north' && m.turn === 'straight')!
    expect(criticalGap(enteringMove, network.control)).toBe(5.2)
    expect(followUpTime(enteringMove, network.control)).toBe(3.2)
    expect(buildMovementConflicts(network)).toEqual([])
    const sim = new TrafficSimulation(network, { demand: 0 })
    const incoming = sim.laneMap.get(enteringMove.lanes[0])!
    const entering = sim.createVehicle(enteringMove.id, { s: incoming.length - 2, speed: 0 })
    const circulatingMove = network.movements.find(m => m.from === 'east' && m.to === 'west')!
    const ringIndex = circulatingMove.lanes.indexOf('round-ring-4')
    const ring = sim.laneMap.get('round-ring-4')!
    const circulating = sim.createVehicle(circulatingMove.id, { routeIndex: ringIndex, s: ring.length - 1, speed: 4 })
    circulating.admitted = true
    sim.advance(1)
    expect(entering.laneId).toBe(incoming.id)
    expect(entering.v).toBeLessThan(0.5)
    sim.advance(15)
    expect(entering.routeIndex).toBeGreaterThan(0)
  })

  it('keeps low-demand circulating traffic flowing over 30 minutes without overlaps', async () => {
    const sim = new TrafficSimulation(buildRoundabout(), { seed: 271828, demand: 300 })
    sim.warmup(300); sim.resetMetrics()
    let throughput = 0
    for (let window = 0; window < 6; window++) {
      for (let second = 0; second < 300; second++) {
        sim.advance(1)
        const lanes = new Map<string, typeof sim.vehicles>()
        for (const car of sim.vehicles) {
          expect(car.v).toBeGreaterThanOrEqual(0)
          const list = lanes.get(car.laneId) ?? []; list.push(car); lanes.set(car.laneId, list)
        }
        for (const cars of lanes.values()) {
          cars.sort((a, b) => a.s - b.s)
          for (let i = 1; i < cars.length; i++) expect(cars[i].s - cars[i].length - cars[i - 1].s).toBeGreaterThanOrEqual(-1e-5)
        }
      }
      throughput += sim.refreshMetrics().throughput
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    expect(Math.abs(throughput / 6 - 1200) / 1200).toBeLessThanOrEqual(0.1)
    expect(sim.outsideQueue).toBe(0)
    console.info(`Roundabout request1200 throughput${(throughput / 6).toFixed(0)} delay${sim.metrics.averageDelay.toFixed(1)}s`)
  }, 120000)
})

describe('local signal conflict reservations', () => {
  it('does not reserve a distant highway merge while waiting at the ramp terminal', () => {
    const sim = new TrafficSimulation(buildServiceInterchange(false), { demand: 0 })
    const movement = sim.movementMap.get('east-south')!
    const routeIndex = movement.lanes.indexOf('left-e-in'), gate = sim.laneMap.get('left-e-in')!
    const car = sim.createVehicle(movement.id, { routeIndex, s: gate.length - 3, speed: 0 })
    const aheadMovement = sim.movementMap.get('west-south')!
    const ahead = sim.createVehicle(aheadMovement.id, { routeIndex: aheadMovement.lanes.indexOf('left-r-out'), s: 13, speed: 8 })
    ahead.admitted = true; ahead.admittedControlPoint = 'left'
    sim.advance(8)
    expect(car.routeIndex).toBeGreaterThan(routeIndex)
    expect(car.admittedControlPoint).toBe('left')
  })
})
