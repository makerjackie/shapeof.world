import type { Lane, SimulationMetrics, Vehicle } from './types'
export interface Completion { time: number; movementId: string; delay: number; stops: number; distance: number; laneChanges: number }
export class MetricsWindow {
  readonly completions: Completion[] = []
  completed = 0
  missedExits = 0
  record(time: number, vehicle: Vehicle): void {
    this.completed++
    this.completions.push({ time, movementId: vehicle.movementId, delay: Math.max(0, time - vehicle.bornAt - vehicle.freeFlowTime), stops: vehicle.stops, distance: vehicle.distance, laneChanges: vehicle.laneChanges })
  }
  snapshot(time: number, vehicles: Vehicle[], outsideQueue: number, queueByApproach: Record<string, number>): SimulationMetrics {
    while (this.completions[0] && this.completions[0].time < time - 300) this.completions.shift()
    const duration = Math.min(300, Math.max(1, time))
    const throughputByMovement: Record<string, number> = {}
    let delay = 0, stops = 0, distance = 0, laneChanges = 0
    for (const exit of this.completions) {
      throughputByMovement[exit.movementId] = (throughputByMovement[exit.movementId] ?? 0) + 3600 / duration
      delay += exit.delay; stops += exit.stops; distance += exit.distance; laneChanges += exit.laneChanges
    }
    return { throughput: this.completions.length * 3600 / duration, throughputByMovement, averageDelay: delay / Math.max(1, this.completions.length), averageSpeed: vehicles.reduce((sum, v) => sum + v.v, 0) / Math.max(1, vehicles.length), vehicles: vehicles.length, outsideQueue, queueByApproach, averageStops: stops / Math.max(1, this.completions.length), laneChangesPerKm: distance > 0 ? laneChanges / (distance / 1000) : 0, completed: this.completed, missedExits: this.missedExits }
  }
}
export interface PressureSample { time: number; demand: number; throughput: number; averageDelay: number }
export function pressureDemand(elapsedSeconds: number, from = 200, to = 2400, duration = 1200): number { return from + (to - from) * Math.min(1, Math.max(0, elapsedSeconds / duration)) }

/**
 * Longest standing queue on each approach's explicitly tagged upstream entry lanes.
 * Vehicles below 0.5 m/s form a queue in longitudinal order; a moving vehicle
 * splits the queue. Length is measured from the rearmost bumper to the foremost
 * bumper, including the observed gaps. Parallel lanes are compared, never added;
 * downstream connectors/ramps are excluded rather than attributed to their OD origin.
 */
export function measureApproachQueues(lanes: Lane[], vehicles: Vehicle[]): Record<string, number> {
  const queues: Record<string, number> = {}
  for (const lane of lanes) {
    if (!lane.entry) continue
    queues[lane.entry] ??= 0
    const occupants = vehicles.filter(vehicle => vehicle.laneId === lane.id).sort((a, b) => a.s - b.s)
    let rear: number | undefined
    for (const vehicle of occupants) {
      if (vehicle.v >= 0.5) { rear = undefined; continue }
      rear ??= vehicle.s - vehicle.length
      queues[lane.entry] = Math.max(queues[lane.entry], vehicle.s - rear)
    }
  }
  return queues
}
