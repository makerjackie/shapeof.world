import { describe, expect, it } from 'vitest'
import { DESIGNS } from './designs'
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

  for (const design of DESIGNS) it(`${design.id}: 1× OD runs for 30 minutes safely and serves demand within 10%`, async () => {
    const network = design.build()
    network.defaultOD ??= createDefaultOD(network, design.chapter === 1 ? { urbanPerApproach: design.defaultDemand } : {})
    const sim = new TrafficSimulation(network, { seed: 271828, demandMultiplier: 1 })
    for (let chunk = 0; chunk < 3; chunk++) { sim.advance(100); await new Promise(resolve => setTimeout(resolve, 0)) }
    const initialCompleted = sim.metricsWindow.completed
    let previousCompleted = initialCompleted
    for (let second = 0; second < 1800; second++) {
      sim.advance(1)
      if (second % 10 === 0) {
        const occupied = new Map<string, { s: number; length: number }[]>()
        for (const car of sim.vehicles) {
          expect(Number.isFinite(car.v) && car.v >= 0, `${design.id}: vehicle ${car.id} speed`).toBe(true)
          const lane = occupied.get(car.laneId) ?? []
          lane.push(car); occupied.set(car.laneId, lane)
        }
        for (const [id, cars] of occupied) {
          cars.sort((a, b) => a.s - b.s)
          for (let index = 1; index < cars.length; index++) expect(cars[index].s - cars[index].length - cars[index - 1].s, id).toBeGreaterThanOrEqual(-1e-5)
        }
      }
      if ((second + 1) % 100 === 0) await new Promise(resolve => setTimeout(resolve, 0))
      if ((second + 1) % 300 === 0) {
        expect(sim.metricsWindow.completed, `${design.id}: no core exits for five minutes`).toBeGreaterThan(previousCompleted)
        previousCompleted = sim.metricsWindow.completed
      }
    }
    const throughput = (sim.metricsWindow.completed - initialCompleted) * 2
    const error = Math.abs(throughput - sim.totalDemand) / sim.totalDemand
    console.info(`1× OD ${design.id}: demand ${sim.totalDemand.toFixed(0)}, served ${throughput.toFixed(0)} veh/h, error ${(error * 100).toFixed(1)}%, outside ${sim.outsideQueue}, cars ${sim.vehicles.length}`)
    expect(error).toBeLessThanOrEqual(0.1)
    for (const car of sim.vehicles) if (car.v < 0.1 && car.waitingSince !== undefined) expect(sim.time - car.waitingSince, `${car.movementId} frozen on ${car.laneId}`).toBeLessThan(300)
  }, 300000)
})
