import type { Interval, Lane, MeasurementArea, Network, SimulationMetrics, Vehicle } from './types'
export interface Completion { time: number; movementId: string; delay: number; stops: number; distance: number; laneChanges: number }
export class MetricsWindow {
  readonly completions: Completion[] = []
  completed = 0
  missedExits = 0
  startedAt: number | undefined
  /** Begin a new observation window after pre-filling a network, without respawning traffic. */
  reset(time: number): void { this.completions.length = 0; this.startedAt = time }
  record(time: number, vehicle: Vehicle): void {
    const passage = vehicle.corePassage
    if (!passage || passage.exitedAt !== undefined) return
    passage.exitedAt = time
    this.startedAt ??= time
    this.completed++
    this.completions.push({ time, movementId: vehicle.movementId, delay: Math.max(0, passage.elapsed - passage.freeFlowTime), stops: vehicle.stops - passage.stopsAtEntry, distance: passage.distance, laneChanges: vehicle.laneChanges - passage.laneChangesAtEntry })
  }
  snapshot(time: number, vehicles: Vehicle[], outsideQueue: number, queueByApproach: Record<string, number>, demand = 0): SimulationMetrics {
    while (this.completions[0] && this.completions[0].time < time - 300) this.completions.shift()
    const duration = Math.min(300, Math.max(1, time - (this.startedAt ?? time)))
    const throughputByMovement: Record<string, number> = {}
    let delay = 0, stops = 0, distance = 0, laneChanges = 0
    for (const exit of this.completions) {
      throughputByMovement[exit.movementId] = (throughputByMovement[exit.movementId] ?? 0) + 3600 / duration
      delay += exit.delay; stops += exit.stops; distance += exit.distance; laneChanges += exit.laneChanges
    }
    return { demand, throughput: this.completions.length * 3600 / duration, throughputByMovement, averageDelay: delay / Math.max(1, this.completions.length), averageSpeed: vehicles.reduce((sum, v) => sum + v.v, 0) / Math.max(1, vehicles.length), vehicles: vehicles.length, outsideQueue, queueByApproach, averageStops: stops / Math.max(1, this.completions.length), laneChangesPerKm: distance > 0 ? laneChanges / (distance / 1000) : 0, completed: this.completed, missedExits: this.missedExits }
  }
}

/** Core geometry is explicit data when supplied, otherwise inferred from the actual turning roads. */
export function measurementArea(network: Network): MeasurementArea {
  if (network.measurementArea) return network.measurementArea
  const turning = network.lanes.filter(lane => lane.kind === 'connector' || lane.kind === 'ramp')
  const points = (turning.length ? turning : network.lanes).flatMap(lane => lane.points)
  const buffer = network.control.kind === 'free' ? 30 : 80
  return { minX: Math.min(...points.map(p => p.x)) - buffer, maxX: Math.max(...points.map(p => p.x)) + buffer, minZ: Math.min(...points.map(p => p.z)) - buffer, maxZ: Math.max(...points.map(p => p.z)) + buffer }
}

/** Clip every lane segment once; the fixed-step hot path only compares longitudinal distances. */
export function coreIntervals(lane: Lane, area: MeasurementArea): Interval[] {
  const ranges: Interval[] = []
  let offset = 0
  for (let i = 1; i < lane.points.length; i++) {
    const a = lane.points[i - 1], b = lane.points[i]
    const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    let enter = 0, leave = 1
    for (const [origin, delta, minimum, maximum] of [[a.x, b.x - a.x, area.minX, area.maxX], [a.z, b.z - a.z, area.minZ, area.maxZ]]) {
      if (Math.abs(delta) < 1e-12) { if (origin < minimum || origin > maximum) leave = -1; continue }
      const t0 = (minimum - origin) / delta, t1 = (maximum - origin) / delta
      enter = Math.max(enter, Math.min(t0, t1)); leave = Math.min(leave, Math.max(t0, t1))
    }
    if (leave > enter) {
      const start = offset + length * enter, end = offset + length * leave
      if (ranges.at(-1) && Math.abs(ranges.at(-1)!.end - start) < 1e-6) ranges.at(-1)!.end = end
      else ranges.push({ start, end })
    }
    offset += length
  }
  return ranges
}

/** One detector passage per vehicle, independent of how many lane nodes or lane changes it makes. */
export class CoreDetectors {
  readonly area: MeasurementArea
  readonly ranges: Map<string, Interval[]>
  constructor(network: Network, private readonly metrics: MetricsWindow) {
    this.area = measurementArea(network)
    this.ranges = new Map(network.lanes.map(lane => [lane.id, coreIntervals(lane, this.area)]))
  }

  travel(vehicle: Vehicle, lane: Lane, from: number, to: number, time: number, duration: number, terminal = false): void {
    if (vehicle.corePassage?.exitedAt !== undefined) return
    // A stop-line safety clamp may correct a sub-metre overshoot backwards;
    // that is a stopped sample, never an exit or negative travelled distance.
    to = Math.max(from, to)
    const ranges = this.ranges.get(lane.id) ?? []
    const distance = Math.max(0, to - from)
    let covered = false
    for (const range of ranges) {
      if (to < range.start || from > range.end) continue
      const start = Math.max(from, range.start), end = Math.min(to, range.end)
      if (end < start || (distance > 0 && end === start)) continue
      const entryTime = time + (distance > 0 ? (start - from) / distance * duration : 0)
      const insideDuration = distance > 0 ? (end - start) / distance * duration : duration
      const passage = vehicle.corePassage ??= { enteredAt: entryTime, elapsed: 0, freeFlowTime: 0, distance: 0, stopsAtEntry: vehicle.stops, laneChangesAtEntry: vehicle.laneChanges }
      passage.elapsed += insideDuration
      passage.distance += end - start
      passage.freeFlowTime += (end - start) / Math.min(lane.speedLimit, vehicle.parameters.v0)
      covered = true
      if ((to > range.end && range.end < lane.length - 1e-6) || terminal) {
        this.metrics.record(entryTime + insideDuration, vehicle)
        return
      }
    }
    // A boundary can coincide exactly with a lane node. The first segment
    // outside closes that passage, rather than waiting for the distant road end.
    if (!covered && vehicle.corePassage) this.metrics.record(time, vehicle)
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
