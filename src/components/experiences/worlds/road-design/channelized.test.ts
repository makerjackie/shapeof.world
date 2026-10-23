import { describe, expect, it } from 'vitest'
import { buildChannelizedCrossroads } from './designs/crossroads-channelized'
import { signalState } from './sim/control'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { TrafficSimulation } from './sim/simulation'
import type { Network } from './sim/types'

describe('channelized intersection and serial signal gates', () => {
  it('uses the one-lane-per-direction diagram convention independently of its actual turning pockets', () => {
    expect(summarizeConflicts(calculateConflicts(buildChannelizedCrossroads()))).toEqual({ total: 32, crossing: 16, merge: 8, diverge: 8 })
  })
  it('enters the left waiting area during straight green and clears it during protected left green', () => {
    const sim = new TrafficSimulation(buildChannelizedCrossroads(), { demand: 0, seed: 11 })
    const movement = sim.network.movements.find(item => item.from === 'north' && item.turn === 'left')!
    const pocket = sim.laneMap.get(movement.lanes[1])!
    const cars = [0, 1].map(index => sim.createVehicle(movement.id, { routeIndex: 1, s: pocket.length - 2 - index * 9, speed: 0 }))
    const firstEntered = new Map<number, number>(), firstReleased = new Map<number, number>()
    sim.advance(48, state => {
      for (const car of cars) {
        if (car.laneId === 'north-left-wait' && !firstEntered.has(car.id)) firstEntered.set(car.id, state.time)
        if (car.routeIndex >= 3 && !firstReleased.has(car.id)) firstReleased.set(car.id, state.time)
      }
    })
    for (const car of cars) {
      expect(firstEntered.has(car.id)).toBe(true)
      expect(signalState(sim.network.control, firstEntered.get(car.id)!, 'ns-through')).toBe('green')
      expect(firstReleased.has(car.id)).toBe(true)
      expect(signalState(sim.network.control, firstReleased.get(car.id)!, 'ns-left')).toBe('green')
      expect(firstReleased.get(car.id)!).toBeGreaterThanOrEqual(33)
    }
    expect(cars.some(car => car.laneId === 'north-left-wait')).toBe(false)
  })

  it('releases separate passages at two control points instead of carrying first-green permission through the second red', () => {
    const makeLane = (id: string, a: number, b: number, next: string[], extra = {}) => ({ id, points: [{ x: a, y: 0, z: 0 }, { x: b, y: 0, z: 0 }], length: b - a, width: 3.5, level: 0, kind: 'urban' as const, speedLimit: 10, next, ...extra })
    const network: Network = { id: 'serial-gate-test', lanes: [
      makeLane('a', -30, 0, ['a-box'], { entry: 'west', signalGroups: ['a'], controlPoint: 'a', stopLine: 29 }),
      makeLane('a-box', 0, 20, ['middle'], { kind: 'connector', controlPoint: 'a' }),
      makeLane('middle', 20, 70, ['b-box'], { signalGroups: ['b'], controlPoint: 'b', stopLine: 49 }),
      makeLane('b-box', 70, 90, ['out'], { kind: 'connector', controlPoint: 'b' }),
      makeLane('out', 90, 200, [], { exit: 'east' }),
    ], movements: [{ id: 'through', name: '', from: 'west', to: 'east', turn: 'straight', lanes: ['a', 'a-box', 'middle', 'b-box', 'out'] }], carriageways: [], schematicMovements: [], weaving: [], control: { kind: 'signal', phases: [{ id: 'a', groups: ['a'], green: 30, yellow: 3, allRed: 2 }, { id: 'b', groups: ['b'], green: 30, yellow: 3, allRed: 2 }] } }
    const sim = new TrafficSimulation(network, { demand: 0 })
    const car = sim.createVehicle('through', { s: 25, speed: 5 })
    sim.advance(25)
    expect(car.laneId).toBe('middle')
    expect(car.s).toBeLessThanOrEqual(49)
    expect(car.v).toBeLessThan(0.5)
    sim.advance(20)
    expect(car.routeIndex).toBeGreaterThanOrEqual(3)
    expect(car.admittedControlPoint).toBe('b')
  })

  it('serves below-capacity arrivals and preserves lane spacing over 30 minutes', async () => {
    const sim = new TrafficSimulation(buildChannelizedCrossroads(), { seed: 271828, demand: 300 })
    sim.warmup(300); sim.resetMetrics()
    let throughput = 0
    for (let window = 0; window < 6; window++) {
      for (let second = 0; second < 300; second++) {
        sim.advance(1)
        const byLane = new Map<string, typeof sim.vehicles>()
        for (const car of sim.vehicles) {
          expect(car.v).toBeGreaterThanOrEqual(0)
          const lane = byLane.get(car.laneId) ?? []; lane.push(car); byLane.set(car.laneId, lane)
        }
        for (const cars of byLane.values()) {
          cars.sort((a, b) => a.s - b.s)
          for (let i = 1; i < cars.length; i++) expect(cars[i].s - cars[i].length - cars[i - 1].s).toBeGreaterThanOrEqual(-1e-5)
        }
      }
      throughput += sim.refreshMetrics().throughput
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    expect(Math.abs(throughput / 6 - 1200) / 1200).toBeLessThanOrEqual(0.1)
    expect(sim.outsideQueue).toBe(0)
    console.info(`Channelized request1200 throughput${(throughput / 6).toFixed(0)} delay${sim.metrics.averageDelay.toFixed(1)}s`)
  }, 120000)
})
