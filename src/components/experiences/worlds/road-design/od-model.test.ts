import { describe, expect, it } from 'vitest'
import { buildCloverleaf } from './designs/cloverleaf'
import { createDefaultOD, totalODDemand } from './sim/demand'
import { FIXED_DT, TrafficSimulation } from './sim/simulation'
import type { Network } from './sim/types'

describe('road-class origin-destination demand', () => {
  it('assigns three-lane motorway entrances 4,800 veh/h with 15% using ramps', () => {
    const network = buildCloverleaf(), od = createDefaultOD(network)
    expect(totalODDemand(od)).toBeCloseTo(19200)
    for (const origin of new Set(network.movements.map(movement => movement.from))) {
      const movements = network.movements.filter(movement => movement.from === origin)
      const rows = od.filter(row => movements.some(movement => movement.id === row.movementId))
      expect(totalODDemand(rows)).toBeCloseTo(4800)
      const offRamp = rows.filter(row => movements.find(movement => movement.id === row.movementId)!.turn !== 'straight')
      expect(totalODDemand(offRamp) / totalODDemand(rows)).toBeCloseTo(0.15)
    }
  })

  it('scales the whole OD matrix and retains the same arrival hazard under repeated inputs', () => {
    const network = buildCloverleaf(); network.defaultOD = createDefaultOD(network)
    const baseline = new TrafficSimulation(network, { seed: 137, demandMultiplier: 0.25 })
    const repeated = new TrafficSimulation(network, { seed: 137, demandMultiplier: 0.25 })
    for (let tick = 0; tick < 600; tick++) {
      baseline.step(); repeated.setDemandMultiplier(0.25); repeated.step()
    }
    expect(repeated.vehicles).toEqual(baseline.vehicles)
    expect(repeated.totalDemand).toBeCloseTo(4800)
    repeated.setDemandMultiplier(2.5)
    expect(repeated.totalDemand).toBeCloseTo(48000)
    repeated.setDemandMultiplier(0)
    expect(repeated.totalDemand).toBe(0)
    repeated.step(FIXED_DT)
    repeated.setDemandMultiplier(1)
    expect(repeated.refreshMetrics().demand).toBeCloseTo(19200)
  })

  it('lets motorway through traffic change to a parallel lane serving the same road exit', () => {
    const network = buildCloverleaf()
    const sim = new TrafficSimulation(network, { demandMultiplier: 0 })
    const car = sim.createVehicle('west-straight-2', { s: 500, speed: 15 })
    sim.createVehicle('west-straight-2', { s: 550, speed: 0 })
    sim.step()
    expect(car.laneChange?.toLaneId).toBe('main-0-1-0')
    expect(sim.laneMap.get(car.route.at(-1)!)?.exit).toBe('east')
  })

  it('checks a target-lane follower before the previous lane node before accepting a lane change', () => {
    const network = buildCloverleaf()
    const sim = new TrafficSimulation(network, { demandMultiplier: 0 })
    const car = sim.createVehicle('west-straight-2', { routeIndex: 1, s: 5, speed: 15 })
    sim.createVehicle('west-straight-2', { routeIndex: 1, s: 40, speed: 0 })
    const previous = sim.laneMap.get('main-0-1-0')!
    sim.createVehicle('west-straight-1', { s: previous.length - 5, speed: 20 })
    sim.step()
    expect(car.laneChange).toBeUndefined()
  })

  it('keeps through cars out of an auxiliary weaving lane unless their route requires it', () => {
    const sim = new TrafficSimulation(buildCloverleaf(), { demandMultiplier: 0 })
    const car = sim.createVehicle('west-straight-2', { routeIndex: 3, s: 15, speed: 10 })
    sim.createVehicle('west-straight-2', { routeIndex: 3, s: 45, speed: 0 })
    sim.step()
    expect(car.laneChange?.toLaneId).not.toBe('aux-0-3')
    expect(car.route.some(id => id.startsWith('aux'))).toBe(false)
  })

  it('reconsiders a mandatory merge while stopped at the end of the acceleration lane', () => {
    const sim = new TrafficSimulation(buildCloverleaf(), { demandMultiplier: 0 })
    const car = sim.createVehicle('west-left', { routeIndex: 6, s: 150, speed: 0 })
    sim.step()
    expect(car.laneChange?.toLaneId).toBe('main-3-2-3')
  })

  it('lets a ramp exit finish its route without inventing a lateral merge target', () => {
    const network: Network = {
      id: 'ramp-exit', carriageways: [], schematicMovements: [], weaving: [], control: { kind: 'free' },
      lanes: [0, 1].map(index => ({ id: `exit-${index}`, points: [{ x: 0, y: 0, z: index * 4 }, { x: 100, y: 0, z: index * 4 }], length: 100, speedLimit: 15, level: 0, width: 3.5, kind: 'ramp', next: [], exit: 'east', ...(index ? {} : { left: 'exit-1' }) })),
      movements: [{ id: 'leave', name: '', from: 'west', to: 'east', turn: 'right', lanes: ['exit-0'] }],
    }
    const sim = new TrafficSimulation(network, { demand: 0 })
    sim.createVehicle('leave', { s: 85, speed: 10 })
    sim.advance(10)
    expect(sim.vehicles).toHaveLength(0)
  })

  it('does not let a blocked lane hide another lane behind a growing outside queue', () => {
    const network: Network = {
      id: 'independent-arrivals', carriageways: [], schematicMovements: [], weaving: [], control: { kind: 'free' },
      measurementArea: { minX: 20, maxX: 50, minZ: -10, maxZ: 10 },
      lanes: [0, 1].map(index => ({ id: `lane-${index}`, points: [{ x: 0, y: 0, z: index * 4 }, { x: 100, y: 0, z: index * 4 }], length: 100, speedLimit: 30, level: 0, width: 3.75, kind: 'main', next: [], entry: 'west', exit: 'east' })),
      movements: [0, 1].map(index => ({ id: `move-${index}`, name: '', from: 'west', to: 'east', turn: 'straight', lanes: [`lane-${index}`] })),
      defaultOD: [{ movementId: 'move-0', vehiclesPerHour: 30000 }, { movementId: 'move-1', vehiclesPerHour: 300 }],
    }
    const sim = new TrafficSimulation(network, { seed: 137 })
    const blocker = sim.createVehicle('move-0', { s: 1, speed: 0 })
    blocker.parameters.v0 = 0.001
    sim.advance(180)
    expect(sim.outsideQueue).toBeGreaterThan(1000)
    expect(sim.metricsWindow.completions.filter(passage => passage.movementId === 'move-1').length).toBeGreaterThan(5)
  })

})
