import { describe, expect, it } from 'vitest'
import { DESIGNS } from './designs'
import { signalState, criticalGap, mustYieldTo, buildMovementConflicts } from './sim/control'
import { CITY_PARAMETERS, HIGHWAY_PARAMETERS, equilibriumSpeed, idmAcceleration } from './sim/idm'
import { laneChangeBlend, mobilDecision } from './sim/mobil'
import { CoreDetectors, MetricsWindow, coreIntervals } from './sim/metrics'
import { FIXED_DT, TrafficSimulation } from './sim/simulation'
import type { Network, Vehicle } from './sim/types'

function dischargeNetwork(): Network {
  const points = (a: number, b: number) => [{ x: a, y: 0, z: 0 }, { x: b, y: 0, z: 0 }]
  return { id: 'discharge-fixture', lanes: [
    { id: 'entry', points: points(-2000, 0), length: 2000, width: 3.5, level: 0, kind: 'urban', speedLimit: 50 / 3.6, entry: 'west', next: ['box'], stopLine: 2000 },
    { id: 'box', points: points(0, 40), length: 40, width: 3.5, level: 0, kind: 'connector', speedLimit: 50 / 3.6, next: ['exit'] },
    { id: 'exit', points: points(40, 1040), length: 1000, width: 3.5, level: 0, kind: 'urban', speedLimit: 50 / 3.6, exit: 'east', next: [] },
  ], movements: [{ id: 'straight', name: '直行', from: 'west', to: 'east', turn: 'straight', lanes: ['entry', 'box', 'exit'], signalGroup: 'ew' }], carriageways: [], schematicMovements: [], weaving: [], control: { kind: 'signal', phases: [{ id: 'open', groups: ['ew'], green: 300, yellow: 3, allRed: 2 }] } }
}

function assertNoOverlap(vehicles: Vehicle[]): void {
  const lanes = new Map<string, Vehicle[]>()
  for (const vehicle of vehicles) {
    expect(Number.isFinite(vehicle.v)).toBe(true)
    expect(vehicle.v).toBeGreaterThanOrEqual(0)
    let lane = lanes.get(vehicle.laneId)
    if (!lane) { lane = []; lanes.set(vehicle.laneId, lane) }
    lane.push(vehicle)
  }
  for (const lane of lanes.values()) {
    lane.sort((a, b) => a.s - b.s)
    for (let i = 1; i < lane.length; i++) expect(lane[i].s - lane[i].length - lane[i - 1].s, `${lane[i].laneId}: ${lane[i - 1].id} behind ${lane[i].id}`).toBeGreaterThanOrEqual(-1e-5)
  }
}

describe('road-design microscopic traffic model', () => {
  it('leaves the seeded arrival process unchanged when a control repeats the same demand every step', () => {
    const baseline = new TrafficSimulation(dischargeNetwork(), { seed: 137, demand: 600 })
    const controlled = new TrafficSimulation(dischargeNetwork(), { seed: 137, demand: 600 })
    baseline.advance(120)
    for (let step = 0; step < 120 * 30; step++) { controlled.setDemand(600); controlled.step() }
    expect(controlled.vehicles.map(car => [car.id, car.bornAt, car.laneId, car.s])).toEqual(baseline.vehicles.map(car => [car.id, car.bornAt, car.laneId, car.s]))
    expect(controlled.vehicles.length).toBeGreaterThan(0)
  })

  it('preserves Poisson arrival hazard during a per-step pressure ramp and across zero demand', () => {
    const network = dischargeNetwork()
    network.control = { kind: 'free' }
    const sim = new TrafficSimulation(network, { seed: 137, demand: 0 })
    const seen = new Set<number>()
    let expected = 0
    for (let second = 0; second < 600; second++) {
      for (let step = 0; step < 30; step++) {
        const demand = 600 + 2400 * sim.time / 600
        sim.setDemand(demand)
        expected += demand * FIXED_DT / 3600
        sim.step()
      }
      for (const car of sim.vehicles) seen.add(car.id)
    }
    const generated = seen.size + sim.outsideQueue
    expect(Math.abs(generated - expected) / expected).toBeLessThan(0.2)
    sim.setDemand(0)
    for (let second = 0; second < 30; second++) { sim.advance(1); for (const car of sim.vehicles) seen.add(car.id) }
    expect(seen.size + sim.outsideQueue).toBe(generated)
    sim.setDemand(600)
    for (let second = 0; second < 120; second++) { sim.advance(1); for (const car of sim.vehicles) seen.add(car.id) }
    expect(seen.size + sim.outsideQueue).toBeGreaterThan(generated)
    console.info(`Pressure arrivals: integrated request ${expected.toFixed(1)}, generated ${generated}`)
  }, 30000)

  it('counts interpolated core exits once, excluding both long leads from delay and the rate clock', () => {
    const network = dischargeNetwork()
    network.measurementArea = { minX: 0, maxX: 40, minZ: -5, maxZ: 5 }
    const sim = new TrafficSimulation(network, { demand: 0 })
    const car = sim.createVehicle('straight', { bornAt: -5000 })
    const metrics = new MetricsWindow()
    const detectors = new CoreDetectors(network, metrics)
    expect(coreIntervals(network.lanes[0], network.measurementArea)).toEqual([])
    expect(coreIntervals(network.lanes[1], network.measurementArea)).toEqual([{ start: 0, end: 40 }])
    detectors.travel(car, network.lanes[0], 1900, 2000, 90, 10)
    expect(car.corePassage).toBeUndefined()
    detectors.travel(car, network.lanes[1], 0, 20, 100, 2)
    detectors.travel(car, network.lanes[1], 20, 40, 102, 2)
    detectors.travel(car, network.lanes[2], 0, 10, 104, 1)
    expect(metrics.completed).toBe(1)
    expect(metrics.startedAt).toBe(104)
    expect(car.corePassage?.elapsed).toBe(4)
    expect(metrics.completions[0].delay).toBeCloseTo(4 - 40 / (50 / 3.6))
    // Staying in the downstream road, a final-node callback, and a route that
    // re-enters the rectangle cannot inflate the one-pass detector count.
    detectors.travel(car, network.lanes[2], 10, 1000, 105, 100, true)
    detectors.travel(car, network.lanes[1], 0, 40, 205, 4, true)
    expect(metrics.completed).toBe(1)
    expect(metrics.snapshot(204, [], 0, {}).throughput).toBe(36)
    expect(metrics.snapshot(405, [], 0, {}).throughput).toBe(0)
    const before = { random: sim.random, vehicles: sim.vehicles, time: sim.time }
    sim.resetMetrics()
    expect(sim.random).toBe(before.random)
    expect(sim.vehicles).toBe(before.vehicles)
    expect(sim.time).toBe(before.time)
    expect(sim.metricsWindow.startedAt).toBe(sim.time)
  })

  it('interpolates a detector between polyline vertices and includes stopped time inside it', () => {
    const network = dischargeNetwork()
    network.measurementArea = { minX: 10, maxX: 30, minZ: -5, maxZ: 5 }
    const sim = new TrafficSimulation(network, { demand: 0 })
    const car = sim.createVehicle('straight')
    const metrics = new MetricsWindow(), detectors = new CoreDetectors(network, metrics)
    detectors.travel(car, network.lanes[1], 0, 20, 0, 2)
    detectors.travel(car, network.lanes[1], 20, 20, 2, 6)
    detectors.travel(car, network.lanes[1], 20, 19.9, 8, 1)
    expect(metrics.completed).toBe(0)
    detectors.travel(car, network.lanes[1], 20, 40, 9, 2)
    expect(car.corePassage?.enteredAt).toBe(1)
    expect(car.corePassage?.exitedAt).toBe(10)
    expect(car.corePassage?.distance).toBe(20)
    expect(metrics.completions[0].delay).toBeCloseTo(9 - 20 / (50 / 3.6))
  })
  it('uses a stable IDM equilibrium and responds monotonically to closing gaps', () => {
    const p = CITY_PARAMETERS
    const v = equilibriumSpeed(25, p)
    expect(v).toBeGreaterThan(8)
    expect(v).toBeLessThan(p.v0)
    expect(Math.abs(idmAcceleration(v, 25, v, p))).toBeLessThan(1e-10)
    expect(idmAcceleration(0, Infinity, 0, p)).toBe(p.a)
    expect(idmAcceleration(p.v0, Infinity, p.v0, p)).toBe(0)
    expect(idmAcceleration(10, 8, 5, p)).toBeLessThan(idmAcceleration(10, 40, 5, p))
    expect(idmAcceleration(10, 20, 3, p)).toBeLessThan(idmAcceleration(10, 20, 12, p))
    expect(equilibriumSpeed(1, p)).toBe(0)
  })

  it('gives 1900–2300 pc/h/lane highway equilibrium capacity', () => {
    let capacity = 0
    for (let gap = 2; gap <= 120; gap += 0.25) capacity = Math.max(capacity, 3600 * equilibriumSpeed(gap, HIGHWAY_PARAMETERS) / (gap + 4.6))
    expect(capacity).toBeGreaterThanOrEqual(1900)
    expect(capacity).toBeLessThanOrEqual(2300)
  })

  it('includes 3 s amber, 2 s all-red, and permissive left-turn gaps', () => {
    const signal = DESIGNS.find(design => design.id === 'crossroads-signal')!.build().control
    expect(signalState(signal, 31.9, 'ns')).toBe('green')
    expect(signalState(signal, 32, 'ns')).toBe('yellow')
    expect(signalState(signal, 35, 'ns')).toBe('red')
    expect(signalState(signal, 36.9, 'ew')).toBe('red')
    expect(signalState(signal, 37, 'ew')).toBe('green')
    const movement = { id: 'a', name: '', from: 'south', to: 'west', turn: 'left' as const, lanes: [] }
    expect(criticalGap(movement, { kind: 'yield', majorApproaches: ['east', 'west'] })).toBe(7.1)
    expect(criticalGap(movement, signal)).toBe(4.1)
    expect(mustYieldTo(movement, { ...movement, from: 'north', turn: 'straight' }, signal, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 })).toBe(true)
  })

  it('enforces MOBIL follower safety and smooth 3.5 s lateral motion', () => {
    const input = { currentAcceleration: 0, targetAcceleration: 2, targetFollowerBefore: 0, targetFollowerAfter: -5, oldFollowerBefore: 0, oldFollowerAfter: 1, right: true }
    expect(mobilDecision(input).accepted).toBe(false)
    expect(mobilDecision({ ...input, mandatoryDistance: 15 }).accepted).toBe(true)
    expect(laneChangeBlend(0, 3.5)).toBe(0)
    expect(laneChangeBlend(1.75, 3.5)).toBeCloseTo(0.5)
    expect(laneChangeBlend(3.5, 3.5)).toBe(1)
  })

  it('discharges a standing passenger-car queue at 1700–2000 veh/h/lane', () => {
    const sim = new TrafficSimulation(dischargeNetwork(), { seed: 1, demand: 0 })
    for (let i = 0; i < 250; i++) sim.createVehicle('straight', { s: 1998 - i * 6.6, speed: 0 })
    const crossed = new Set<number>()
    const times: number[] = []
    sim.advance(170, state => {
      for (const vehicle of state.vehicles) if (vehicle.routeIndex > 0 && !crossed.has(vehicle.id)) { crossed.add(vehicle.id); times.push(state.time) }
    })
    const saturated = times.slice(10, 70)
    const rate = 3600 * (saturated.length - 1) / (saturated.at(-1)! - saturated[0])
    expect(saturated.length).toBe(60)
    console.info(`Signal queue discharge: ${rate.toFixed(1)} veh/h/lane`)
    expect(rate).toBeGreaterThanOrEqual(1700)
    expect(rate).toBeLessThanOrEqual(2000)
  }, 20000)

  it('derives finite conflict-zone ranges on the driven connector lanes', () => {
    const network = DESIGNS.find(design => design.id === 'crossroads-signal')!.build()
    const zones = buildMovementConflicts(network)
    expect(zones.filter(zone => zone.kind === 'crossing').length).toBeGreaterThan(0)
    for (const zone of zones) for (const range of [zone.aRange, zone.bRange]) {
      expect(network.lanes.some(lane => lane.id === range.laneId)).toBe(true)
      expect(range.end).toBeGreaterThan(range.start)
      expect(Number.isFinite(range.start)).toBe(true)
    }
  })

  it('executes required lane changes and legally reroutes after a missed exit', () => {
    const base = dischargeNetwork()
    base.control = { kind: 'free' }
    const original = base.lanes[0]
    original.length = 300; original.points = [{ x: -300, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }]
    const alternative = { ...original, id: 'alternative', points: original.points.map(p => ({ ...p, z: 3.5 })), next: ['other-exit'], right: original.id }
    base.lanes.push(alternative, { ...base.lanes[2], id: 'other-exit', points: [{ x: 0, y: 0, z: 3.5 }, { x: 1000, y: 0, z: 3.5 }] })
    original.left = alternative.id
    const sim = new TrafficSimulation(base, { demand: 0 })
    const car = sim.createVehicle('straight', { speed: 10, s: 20 })
    car.laneId = alternative.id; car.route = [alternative.id, 'entry', 'box', 'exit']
    sim.advance(10)
    expect(car.laneChanges).toBeGreaterThan(0)
    expect(car.laneId).toBe('entry')
    expect(sim.metricsWindow.missedExits).toBe(0)

    alternative.solid = [{ start: 0, end: 300 }]
    const blocked = new TrafficSimulation(base, { demand: 0 })
    const missed = blocked.createVehicle('straight', { speed: 0, s: 295 })
    missed.laneId = alternative.id; missed.route = [alternative.id, 'entry', 'box', 'exit']
    blocked.advance(30)
    expect(blocked.metricsWindow.missedExits).toBe(1)
    expect(missed.route).toContain('other-exit')
    expect(missed.laneChanges).toBe(0)
  })

  it('follows leaders in both lanes throughout a lateral transition', () => {
    const network = dischargeNetwork()
    network.control = { kind: 'free' }
    network.lanes.push({ ...network.lanes[0], id: 'adjacent', points: network.lanes[0].points.map(p => ({ ...p, z: 3.5 })) })
    const sim = new TrafficSimulation(network, { demand: 0 })
    const leader = sim.createVehicle('straight', { s: 80, speed: 0 })
    const changing = sim.createVehicle('straight', { s: 60, speed: 18 })
    changing.laneId = 'adjacent'
    changing.route = ['adjacent', 'box', 'exit']
    changing.laneChange = { fromLaneId: 'entry', toLaneId: 'adjacent', fromS: 60, toS: 60, startedAt: 0, duration: 3.5, direction: 'right', fromRoute: ['entry', 'box', 'exit'], fromRouteIndex: 0 }
    sim.advance(0.5)
    expect(changing.a).toBeLessThan(0)
    expect(changing.s).toBeLessThan(leader.s - leader.length)
    expect(changing.laneChange).toBeDefined()
  })

  it('retains conflict occupancy until the whole vehicle clears the connector', () => {
    const network = dischargeNetwork()
    const sim = new TrafficSimulation(network, { demand: 0 })
    const car = sim.createVehicle('straight', { routeIndex: 1, s: 39.9, speed: 10 })
    car.admitted = true
    sim.step()
    expect(car.laneId).toBe('exit')
    expect(car.admitted).toBe(true)
    sim.advance(2)
    expect(car.admitted).toBe(false)
  })

  it('benchmarks 1000 vehicles with the complete fixed-step loop', () => {
    const network = DESIGNS.find(design => design.id === 'cloverleaf')!.build()
    const sim = new TrafficSimulation(network, { seed: 12, demand: 0 })
    const movements = network.movements.filter(movement => movement.turn === 'straight')
    for (let i = 0; i < 1000; i++) {
      const movement = movements[i % movements.length]
      const route = movement.lanes.map(id => sim.laneMap.get(id)!)
      let s = (Math.floor(i / movements.length) + 0.5) * 35
      let routeIndex = 0
      while (s >= route[routeIndex].length && routeIndex < route.length - 1) s -= route[routeIndex++].length
      sim.createVehicle(movement.id, { routeIndex, s, speed: 8 })
    }
    const times: number[] = []
    for (let step = 0; step < 180; step++) { const start = performance.now(); sim.step(); times.push(performance.now() - start) }
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length
    times.sort((a, b) => a - b)
    console.info(`Traffic benchmark: initial 1000, final ${sim.vehicles.length}, step mean ${mean.toFixed(3)} ms, p95 ${times[Math.floor(times.length * 0.95)].toFixed(3)} ms`)
    expect(sim.vehicles.length).toBeGreaterThan(900)
    assertNoOverlap(sim.vehicles)
  })

  it('opens each design with populated, moving traffic after the 240 s warmup', () => {
    for (const design of DESIGNS) {
      const sim = new TrafficSimulation(design.build(), { seed: 20261023, demand: design.defaultDemand })
      const observed = new Set<string>()
      let mainToAux = 0, auxToMain = 0
      sim.warmup(120)
      sim.resetMetrics()
      sim.warmup(120, state => {
        for (const car of state.vehicles) {
          const change = car.laneChange
          if (!change) continue
          const key = `${car.id}:${change.startedAt}`
          if (observed.has(key)) continue
          const weaving = state.network.weaving.some(section => section.lanes?.includes(change.fromLaneId) && section.lanes.includes(change.toLaneId))
          if (!weaving) continue
          observed.add(key)
          if (change.fromLaneId.startsWith('main')) mainToAux++
          else auxToMain++
        }
      })
      const moving = sim.vehicles.filter(car => car.v > 2).length
      const visible = sim.vehicles.filter(car => { const p = sim.sampleVehicle(car).position; return Math.hypot(p.x, p.z) < 450 }).length
      const ramps = sim.vehicles.filter(car => sim.laneMap.get(car.laneId)!.kind === 'ramp').length
      console.info(`Warmup ${design.id}: ${sim.vehicles.length} cars, ${moving} moving, ${visible} central, ${ramps} on ramps, outside ${sim.outsideQueue}, missed exits ${sim.metricsWindow.missedExits}, weave main→aux ${mainToAux}, aux→main ${auxToMain}`)
      // The unsignalled city's intentionally light demand can have fewer than
      // six vehicles at an instant; it must still open populated and in motion.
      expect(moving).toBeGreaterThan(0)
      expect(visible).toBeGreaterThan(0)
      if (design.id === 'cloverleaf') { expect(ramps).toBeGreaterThan(10); expect(mainToAux).toBeGreaterThan(0); expect(auxToMain).toBeGreaterThan(0) }
    }
  })

  it('handles saturated cloverleaf demand without overlap or global deadlock', async () => {
    const design = DESIGNS.find(item => item.id === 'cloverleaf')!
    const sim = new TrafficSimulation(design.build(), { seed: 20261023, demand: 3800 })
    let lastCompleted = 0
    for (let second = 0; second < 600; second++) {
      sim.advance(1)
      if (second > 120 && second % 60 === 0) { expect(sim.metricsWindow.completed).toBeGreaterThan(lastCompleted); lastCompleted = sim.metricsWindow.completed }
      if (second % 10 === 0) assertNoOverlap(sim.vehicles)
      if (second % 60 === 0) await new Promise(resolve => setTimeout(resolve, 0))
      if (second === 119 || second === 599) {
        const loops = [0, 1, 2, 3].map(i => sim.vehicles.filter(car => car.laneId === `loop-${i}`).length)
        const moving = sim.vehicles.filter(car => car.v > 2).length
        console.info(`Hero demand 3800 at ${second + 1}s: cars ${sim.vehicles.length}, moving ${moving}, loops ${loops.join('/')}, outside ${sim.outsideQueue}, completed ${sim.metricsWindow.completed}`)
        expect(moving).toBeGreaterThan(0)
        expect(loops.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0)
      }
    }
  }, 120000)

  it('measures the longest parallel entry queue by actual bumper extent', () => {
    const network = dischargeNetwork()
    network.lanes.push({ ...network.lanes[0], id: 'parallel-entry', points: network.lanes[0].points.map(point => ({ ...point, z: 3.5 })) })
    const sim = new TrafficSimulation(network, { demand: 0 })
    for (const s of [66, 80, 90]) sim.createVehicle('straight', { s, speed: 0 })
    for (const s of [170, 180]) {
      const car = sim.createVehicle('straight', { s, speed: 0 })
      car.laneId = 'parallel-entry'
    }
    // A stopped car downstream belongs to the OD flow, but not its entry queue.
    sim.createVehicle('straight', { routeIndex: 2, s: 950, speed: 0 })
    expect(sim.refreshMetrics().queueByApproach.west).toBeCloseTo(90 - (66 - 4.6))
    // A moving car divides the first lane into separate queues; the maximum
    // is now 14.6 m, not the sum of the two parallel queues or vehicle lengths.
    sim.createVehicle('straight', { s: 73, speed: 2 })
    expect(sim.refreshMetrics().queueByApproach.west).toBeCloseTo(14.6)
    for (const car of sim.vehicles) car.v = 5
    expect(sim.refreshMetrics().queueByApproach.west).toBe(0)
  })

  it('is reproducible independently of frame-sized calls', () => {
    const design = DESIGNS.find(item => item.id === 'cloverleaf')!
    const a = new TrafficSimulation(design.build(), { seed: 123, demand: 1200 })
    const b = new TrafficSimulation(design.build(), { seed: 123, demand: 1200 })
    a.advance(40)
    for (let i = 0; i < 1200; i++) b.step(FIXED_DT)
    expect(a.vehicles).toEqual(b.vehicles)
    expect(a.metrics).toEqual(b.metrics)
  })

  for (const design of DESIGNS) it(`${design.id}: below-capacity core throughput converges within 10% of requested arrivals`, async () => {
    const lowDemand: Record<string, number> = { cloverleaf: 1000, 't-junction': 200, 'crossroads-yield': 100, 'crossroads-signal': 250 }
    const sim = new TrafficSimulation(design.build(), { seed: 271828, demand: lowDemand[design.id] ?? 150 })
    sim.warmup(300)
    sim.resetMetrics()
    const rates: number[] = []
    // Each displayed value is still a 300 s detector window. Average twelve
    // nonoverlapping windows so low-volume Poisson noise is not mistaken for
    // capacity loss; no arrival-rate normalization is applied to the detector.
    for (let window = 0; window < 12; window++) { sim.advance(300); rates.push(sim.refreshMetrics().throughput); await new Promise(resolve => setTimeout(resolve, 0)) }
    const throughput = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
    const demand = sim.metrics.demand
    console.info(`Core detector ${design.id}: request ${demand}, steady throughput ${throughput.toFixed(1)} veh/h, error ${(100 * Math.abs(throughput - demand) / demand).toFixed(1)}%`)
    expect(Math.abs(throughput - demand) / demand).toBeLessThanOrEqual(0.1)
    expect(sim.outsideQueue).toBe(0)
  }, 120000)

  for (const design of DESIGNS) it(`${design.id}: 30 simulated minutes preserve spacing and do not permanently deadlock`, async () => {
    const sim = new TrafficSimulation(design.build(), { seed: 42, demand: design.id === 'cloverleaf' ? 1500 : 380 })
    let previousCompleted = 0
    const served = new Set<string>()
    for (let minute = 0; minute < 30; minute++) {
      for (let second = 0; second < 60; second++) { sim.advance(1); assertNoOverlap(sim.vehicles) }
      sim.refreshMetrics()
      for (const passage of sim.metricsWindow.completions) served.add(passage.movementId)
      if (minute > 2) expect(sim.metrics.completed, `minute ${minute + 1}`).toBeGreaterThan(previousCompleted)
      previousCompleted = sim.metrics.completed
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    expect(sim.metrics.completed).toBeGreaterThan(100)
    // A rare Poisson O-D flow can have no requests in the final 5 min. Observe
    // service over the whole run and independently reject genuinely frozen cars.
    for (const movement of sim.network.movements) expect(served.has(movement.id), movement.id).toBe(true)
    for (const car of sim.vehicles) if (car.v < 0.1 && car.waitingSince !== undefined) expect(sim.time - car.waitingSince, `${car.movementId} frozen on ${car.laneId}`).toBeLessThan(300)
  }, 120000)
})
