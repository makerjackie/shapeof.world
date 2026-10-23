import { TrafficSimulation } from '../sim/simulation'
import type { Network, Vec3 } from '../sim/types'

export interface TrailSample { position: Vec3; tangent: Vec3; time: number; braking: boolean; length: number }
export interface TrailHistory { id: number; samples: TrailSample[]; lastSeen: number }

/** Presentation history uses simulation time: pausing freezes exposure, too. */
export class TrafficRuntime {
  simulation: TrafficSimulation
  trails = new Map<number, TrailHistory>()
  accumulator = 0
  stepMs = 0
  frameMs = 0
  lastMetricAt = 0
  warmupMs = 0
  constructor(network: Network, demand: number, seed = 271828) {
    const start = performance.now()
    this.simulation = new TrafficSimulation(network, { demand, seed })
    this.simulation.warmup(120, () => { if (this.simulation.time > 111.5) this.record() })
    this.warmupMs = performance.now() - start
    this.record()
  }
  record() {
    const sim = this.simulation
    for (const car of sim.vehicles) {
      const pose = sim.sampleVehicle(car)
      let history = this.trails.get(car.id)
      if (!history) { history = { id: car.id, samples: [], lastSeen: sim.time }; this.trails.set(car.id, history) }
      const samples = history.samples, last = samples.at(-1), p = pose.position
      if (!last || Math.hypot(p.x - last.position.x, p.y - last.position.y, p.z - last.position.z) >= 1.8 || sim.time - last.time > 0.5) {
        samples.push({ position: p, tangent: pose.tangent, time: sim.time, braking: car.a < -0.6, length: car.length })
      }
      while (samples.length > 1 && samples[1].time < sim.time - 8.15) samples.shift()
      history.lastSeen = sim.time
    }
    for (const [id, history] of this.trails) if (history.lastSeen < sim.time - 8.2) this.trails.delete(id)
  }
  advance(seconds: number) {
    this.accumulator += seconds
    const start = performance.now()
    let count = 0
    while (this.accumulator >= 1 / 30) {
      this.simulation.step(1 / 30); this.record(); this.accumulator -= 1 / 30; count++
    }
    if (count) this.stepMs = (performance.now() - start) / count
  }
}
