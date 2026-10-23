import { TrafficSimulation } from '../sim/simulation'
import type { Network, Vec3 } from '../sim/types'
import { pressureDemand, type PressureSample } from '../sim/metrics'

export interface TrailSample { position: Vec3; tangent: Vec3; time: number; braking: boolean; length: number }
export interface TrailHistory { id: number; samples: TrailSample[]; lastSeen: number; turn: number; tip?: TrailSample }

/** Presentation history uses simulation time: pausing freezes exposure, too. */
export class TrafficRuntime {
  simulation: TrafficSimulation
  trails = new Map<number, TrailHistory>()
  accumulator = 0
  stepMs = 0
  frameMs = 0
  lastMetricAt = 0
  pressure: { startedAt: number; from: number; to: number; duration: number; lastSample: number; status: 'running' | 'complete' | 'stopped'; samples: PressureSample[] } | null = null
  warmupMs = 0
  constructor(network: Network, demand: number, seed = 271828) {
    const start = performance.now()
    this.simulation = new TrafficSimulation(network, { demand, seed })
    this.simulation.warmup(120)
    this.simulation.resetMetrics()
    this.simulation.warmup(120, () => { if (this.simulation.time > 224.5) this.record() })
    this.warmupMs = performance.now() - start
    this.record()
  }
  record() {
    const sim = this.simulation
    for (const car of sim.vehicles) {
      const pose = sim.sampleVehicle(car)
      let history = this.trails.get(car.id)
      if (!history) {
        const turn = sim.network.movements.find(movement => movement.id === car.movementId)?.turn
        history = { id: car.id, samples: [], lastSeen: sim.time, turn: turn === 'left' ? -1 : turn === 'right' ? 1 : 0 }
        this.trails.set(car.id, history)
      }
      const samples = history.samples, last = samples.at(-1), p = pose.position
      history.tip = { position: p, tangent: pose.tangent, time: sim.time, braking: car.a < -0.6, length: car.length }
      if (!last || Math.hypot(p.x - last.position.x, p.y - last.position.y, p.z - last.position.z) >= (last && Math.abs(pose.tangent.x * last.tangent.z - pose.tangent.z * last.tangent.x) > 0.035 ? 2 : 10) || sim.time - last.time > 0.8) {
        samples.push(history.tip)
      }
      while (samples.length > 1 && samples[1].time < sim.time - 15.25) samples.shift()
      while (samples.length > 256) samples.shift()
      history.lastSeen = sim.time
    }
    for (const [id, history] of this.trails) if (history.lastSeen < sim.time - 15.3) this.trails.delete(id)
  }
  startPressure(to: number) {
    this.simulation = new TrafficSimulation(this.simulation.network, { demand: 100, seed: 271828 })
    this.simulation.warmup(120)
    this.simulation.resetMetrics()
    this.trails.clear()
    this.simulation.warmup(120, () => { if (this.simulation.time > 224.5) this.record() })
    this.accumulator = 0
    this.pressure = { startedAt: this.simulation.time, from: 100, to, duration: 1200, lastSample: this.simulation.time, status: 'running', samples: [] }
  }
  stopPressure() { if (this.pressure?.status === 'running') this.pressure.status = 'stopped' }
  advance(seconds: number) {
    this.accumulator += seconds
    const start = performance.now()
    let count = 0
    while (this.accumulator >= 1 / 30) {
      const run = this.pressure
      if (run?.status === 'running') this.simulation.setDemand(pressureDemand(this.simulation.time - run.startedAt, run.from, run.to, run.duration))
      this.simulation.step(1 / 30); this.record();
      if (run?.status === 'running' && this.simulation.time - run.lastSample >= 10) {
        const metrics = this.simulation.metrics
        const elapsed = this.simulation.time - run.startedAt
        // Compare the same observation window on both axes; a rising input's
        // instantaneous demand would otherwise precede its measured output.
        const window = Math.min(300, elapsed + 120), rampStart = Math.max(0, elapsed - window)
        const averagePerApproach = run.from + (run.to - run.from) / run.duration * (elapsed * elapsed - rampStart * rampStart) / (2 * window)
        run.samples.push({ time: elapsed, demand: averagePerApproach * new Set(this.simulation.network.movements.map(movement => movement.from)).size, throughput: metrics.throughput, averageDelay: metrics.averageDelay })
        run.lastSample = this.simulation.time
        if (this.simulation.time - run.startedAt >= run.duration) run.status = 'complete'
      }
      this.accumulator -= 1 / 30; count++
    }
    if (count) this.stepMs = (performance.now() - start) / count
  }
}
