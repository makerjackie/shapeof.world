import { expect, it } from 'vitest'
import { createDefaultOD } from './sim/demand'
import { TrafficSimulation } from './sim/simulation'
import type { DesignSpec } from './sim/types'

// Keep every scenario and seed identical, but let Vitest schedule independent
// long-running simulations in separate workers instead of one serial file.
export function registerODRegressions(designs: DesignSpec[]) {
  for (const design of designs) it(`${design.id}: 1× OD runs for 30 minutes safely and serves demand within 10%`, async () => {
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
}
