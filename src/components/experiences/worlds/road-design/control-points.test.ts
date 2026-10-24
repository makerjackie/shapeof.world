import { describe, expect, it } from 'vitest'
import { lane, line, point } from './designs/kit'
import type { Network } from './sim/types'
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
  it('does not reduce saturation flow merely by representing a green as a local lane gate', () => {
    const run = (gated: boolean) => {
      const network: Network = {
        id: 'gate-capacity', carriageways: [], schematicMovements: [], weaving: [],
        lanes: [
          lane('in', line(point(-1000, 0), point(0, 0)), { kind: 'urban', width: 3.5, level: 0, speedLimit: 14, next: ['box'], entry: 'west', ...(gated ? { signalGroups: ['a'], controlPoint: 'a' } : {}) }),
          lane('box', line(point(0, 0), point(40, 0)), { kind: 'connector', width: 3.5, level: 0, speedLimit: 11, next: ['out'], controlPoint: 'a' }),
          lane('out', line(point(40, 0), point(840, 0)), { kind: 'urban', width: 3.5, level: 0, speedLimit: 14, next: [], exit: 'east', controlPoint: 'a' }),
        ],
        movements: [{ id: 'm', name: '', from: 'west', to: 'east', turn: 'straight', lanes: ['in', 'box', 'out'], signalGroup: 'a' }],
        control: { kind: 'signal', phases: [{ id: 'a', groups: ['a'], green: 10000, yellow: 3, allRed: 2 }] },
        measurementArea: { minX: -10, maxX: 100, minZ: -10, maxZ: 10 },
      }
      const sim = new TrafficSimulation(network, { demand: 1800, seed: 1 })
      sim.advance(600)
      return sim.refreshMetrics().throughput
    }
    const original = run(false), local = run(true)
    expect(original).toBeGreaterThan(1450)
    expect(Math.abs(local - original) / original).toBeLessThan(.01)
  })
  it('locates a shared-stream merge before the second signal, rather than reserving the final exit again', () => {
    const zones = buildMovementConflicts(buildServiceInterchange(true))
    const shared = zones.find(zone => zone.kind === 'merge' && [zone.a, zone.b].includes('west-east') && [zone.a, zone.b].includes('north-east'))!
    expect(shared.aRange.laneId).toBe('right-e-in')
    expect(shared.bRange.laneId).toBe('right-e-in')
  })

  it('does not reserve a distant highway merge while waiting at the ramp terminal', () => {
    const sim = new TrafficSimulation(buildServiceInterchange(false), { demand: 0 })
    const movement = sim.movementMap.get('east-south')!
    const routeIndex = movement.lanes.indexOf('left-e-left-pocket'), gate = sim.laneMap.get('left-e-left-pocket')!
    const car = sim.createVehicle(movement.id, { routeIndex, s: gate.length - 3, speed: 0 })
    const aheadMovement = sim.movementMap.get('west-south')!
    const ahead = sim.createVehicle(aheadMovement.id, { routeIndex: aheadMovement.lanes.indexOf('left-r-out'), s: 13, speed: 8 })
    ahead.admitted = true; ahead.admittedControlPoint = 'left'
    sim.advance(8)
    expect(car.routeIndex).toBeGreaterThan(routeIndex)
    expect(car.admittedControlPoint).toBe('left')
  })
})
