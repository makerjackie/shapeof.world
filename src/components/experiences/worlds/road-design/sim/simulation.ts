import { buildMovementConflicts, criticalGap, followUpTime, mayPassSignal, mustYieldTo, signalState, type ConflictRange, type MovementConflict } from './control'
import { cumulativeLengths, projectToLane, sampleLane, type LaneSample } from './geometry'
import { CITY_PARAMETERS, HIGHWAY_PARAMETERS, idmAcceleration } from './idm'
import { laneChangeAllowed, laneChangeBlend, mobilDecision } from './mobil'
import { measureApproachQueues, MetricsWindow } from './metrics'
import { SeededRandom } from './random'
import type { Lane, Movement, Network, SimulationMetrics, Vehicle } from './types'
export { sampleLane } from './geometry'
export const FIXED_DT = 1 / 30
interface Body { vehicle: Vehicle; s: number }
interface Arrival { movement: Movement; dueAt: number; heavy: boolean; speedFactor: number; entryRoute: string[] }
interface Entry { id: string; movements: Movement[]; nextAt: number; queue: Arrival[] }
interface Leader { gap: number; speed: number; vehicle?: Vehicle }

/** Seeded, fixed-step microscopic model. This module has no rendering dependencies. */
export class TrafficSimulation {
  readonly network: Network
  readonly laneMap: Map<string, Lane>
  readonly movementMap: Map<string, Movement>
  readonly random: SeededRandom
  readonly metricsWindow = new MetricsWindow()
  vehicles: Vehicle[] = []
  time = 0
  demand: number
  metrics: SimulationMetrics
  private accumulator = 0
  private nextId = 0
  private tick = 0
  private entries: Entry[]
  private bodies = new Map<string, Body[]>()
  private conflicts = new Map<string, Set<string>>()
  private conflictZones = new Map<string, MovementConflict[]>()
  private lastGapAdmission = new Map<string, number>()
  private admitted = new Map<string, Vehicle[]>()
  private firstApproaching = new Map<string, Vehicle>()
  private stoppedAtJunction = new Set<number>()
  private routeCache = new Map<string, string[] | null>()
  private lastAdmission = 0
  private lastMergeFrom = new Map<string, string>()
  private lastMetrics = -1

  constructor(network: Network, options: { seed?: number; demand?: number } = {}) {
    this.network = network
    this.laneMap = new Map(network.lanes.map(lane => {
      lane.cumulative ??= cumulativeLengths(lane.points)
      return [lane.id, lane]
    }))
    this.movementMap = new Map(network.movements.map(movement => [movement.id, movement]))
    this.random = new SeededRandom(options.seed)
    this.demand = options.demand ?? 900
    const origins = [...new Set(network.movements.map(movement => movement.from))]
    this.entries = origins.map(id => ({ id, movements: network.movements.filter(movement => movement.from === id), nextAt: this.random.exponential(this.demand / 3600), queue: [] }))
    for (const conflict of buildMovementConflicts(network)) {
      for (const id of [conflict.a, conflict.b]) { const zones = this.conflictZones.get(id) ?? []; zones.push(conflict); this.conflictZones.set(id, zones) }
      if (!this.conflicts.has(conflict.a)) this.conflicts.set(conflict.a, new Set())
      if (!this.conflicts.has(conflict.b)) this.conflicts.set(conflict.b, new Set())
      this.conflicts.get(conflict.a)!.add(conflict.b)
      this.conflicts.get(conflict.b)!.add(conflict.a)
    }
    this.metrics = this.metricsWindow.snapshot(0, [], 0, {})
  }

  get outsideQueue(): number { return this.entries.reduce((sum, entry) => sum + entry.queue.length, 0) }
  setDemand(perApproachPerHour: number): void {
    this.demand = Math.max(0, perApproachPerHour)
    for (const entry of this.entries) entry.nextAt = this.time + this.random.exponential(this.demand / 3600)
  }
  advance(seconds: number, onStep?: (simulation: TrafficSimulation) => void): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    this.accumulator += seconds
    while (this.accumulator + 1e-10 >= FIXED_DT) {
      this.fixedStep()
      onStep?.(this)
      this.accumulator -= FIXED_DT
    }
  }
  step(seconds = FIXED_DT): void { this.advance(seconds) }
  warmup(seconds = 120, onStep?: (simulation: TrafficSimulation) => void): void { this.advance(seconds, onStep) }

  sampleVehicle(vehicle: Vehicle): LaneSample {
    const lane = this.laneMap.get(vehicle.laneId)!
    const target = sampleLane(lane, vehicle.s - vehicle.length / 2)
    if (!vehicle.laneChange) return target
    const change = vehicle.laneChange
    const source = this.laneMap.get(change.fromLaneId)!
    const from = sampleLane(source, change.fromS + vehicle.s - change.toS - vehicle.length / 2)
    const blend = laneChangeBlend(this.time - change.startedAt, change.duration)
    return { position: { x: from.position.x + (target.position.x - from.position.x) * blend, y: from.position.y + (target.position.y - from.position.y) * blend, z: from.position.z + (target.position.z - from.position.z) * blend }, tangent: target.tangent }
  }

  /** Convenient deterministic fixture builder, also used by replay tools. */
  createVehicle(movementId: string, options: { s?: number; speed?: number; heavy?: boolean; bornAt?: number; routeIndex?: number } = {}): Vehicle {
    const movement = this.movementMap.get(movementId)
    if (!movement) throw new Error(`Unknown movement: ${movementId}`)
    const routeIndex = options.routeIndex ?? 0
    const lane = this.laneMap.get(movement.lanes[routeIndex])!
    const heavy = options.heavy ?? false
    const base = lane.kind === 'main' || lane.kind === 'ramp' ? HIGHWAY_PARAMETERS : CITY_PARAMETERS
    const parameters = { ...base, v0: lane.speedLimit * (heavy ? 0.85 : 1), a: heavy ? 0.8 : base.a }
    const vehicle: Vehicle = { id: this.nextId++, laneId: lane.id, s: options.s ?? 0, v: options.speed ?? lane.speedLimit, a: 0, length: heavy ? 12 : 4.6, width: heavy ? 2.5 : 1.8, heavy, parameters, movementId, route: [...movement.lanes], routeIndex, bornAt: options.bornAt ?? this.time, enteredAt: this.time, freeFlowTime: this.freeFlowTime(movement.lanes, parameters.v0), distance: 0, stoppedTime: 0, stops: 0, laneChanges: 0, lastLaneChangeAt: -10 }
    this.vehicles.push(vehicle)
    return vehicle
  }

  private freeFlowTime(route: string[], desiredSpeed: number): number {
    let total = 0, parallelGroup = 0
    for (let i = 0; i < route.length; i++) {
      const lane = this.laneMap.get(route[i])!
      const duration = lane.length / Math.min(desiredSpeed, lane.speedLimit)
      if (i > 0) {
        const previous = this.laneMap.get(route[i - 1])!
        if (!previous.next.includes(lane.id) && (previous.left === lane.id || previous.right === lane.id)) { parallelGroup = Math.max(parallelGroup, duration); continue }
      }
      total += parallelGroup
      parallelGroup = duration
    }
    return total + parallelGroup
  }

  private chooseMovement(movements: Movement[]): Movement {
    const turns = [...new Set(movements.map(m => m.turn))]
    const total = turns.reduce((sum, turn) => sum + (turn === 'left' ? 0.2 : turn === 'right' ? 0.15 : 0.65), 0)
    let choice = this.random.next() * total
    let turn = turns[turns.length - 1]
    for (const candidate of turns) { choice -= candidate === 'left' ? 0.2 : candidate === 'right' ? 0.15 : 0.65; if (choice <= 0) { turn = candidate; break } }
    const candidates = movements.filter(movement => movement.turn === turn)
    const weight = candidates.reduce((sum, movement) => sum + (movement.weight ?? 1), 0)
    choice = this.random.next() * weight
    for (const candidate of candidates) { choice -= candidate.weight ?? 1; if (choice <= 0) return candidate }
    return candidates[candidates.length - 1]
  }

  private rebuildIndex(): void {
    this.bodies.clear()
    this.admitted.clear()
    this.firstApproaching.clear()
    const put = (id: string, body: Body) => { let lane = this.bodies.get(id); if (!lane) { lane = []; this.bodies.set(id, lane) } lane.push(body) }
    for (const vehicle of this.vehicles) {
      if (vehicle.laneChange && this.time - vehicle.laneChange.startedAt >= vehicle.laneChange.duration) vehicle.laneChange = undefined
      put(vehicle.laneId, { vehicle, s: vehicle.s })
      if (vehicle.laneChange) put(vehicle.laneChange.fromLaneId, { vehicle, s: vehicle.laneChange.fromS + vehicle.s - vehicle.laneChange.toS })
      if (vehicle.admitted) {
        let group = this.admitted.get(vehicle.movementId)
        if (!group) { group = []; this.admitted.set(vehicle.movementId, group) }
        group.push(vehicle)
      } else {
        const previous = this.firstApproaching.get(vehicle.movementId)
        if (!previous || this.distanceToConnector(vehicle) < this.distanceToConnector(previous)) this.firstApproaching.set(vehicle.movementId, vehicle)
      }
    }
    for (const lane of this.bodies.values()) lane.sort((a, b) => a.s - b.s || a.vehicle.id - b.vehicle.id)
  }

  private spawn(): void {
    for (const entry of this.entries) {
      while (this.time + 1e-9 >= entry.nextAt) {
        const movement = this.chooseMovement(entry.movements)
        const original = this.laneMap.get(movement.lanes[0])!
        const candidates = this.network.lanes.filter(lane => lane.entry === original.entry && lane.entry)
        const choice = candidates[Math.floor(this.random.next() * candidates.length)] ?? original
        const actual = movement.turn === 'straight' ? original : choice
        const lateral = this.lateralPath(actual.id, original.id) ?? [original.id]
        entry.queue.push({ movement, dueAt: entry.nextAt, heavy: this.random.next() < 0.1, speedFactor: 0.9 + this.random.next() * 0.2, entryRoute: [...lateral, ...movement.lanes.slice(1)] })
        entry.nextAt += this.random.exponential(this.demand / 3600)
      }
      // A blocked turn must not prevent independent entry lanes from receiving traffic.
      const blocked = new Set<string>()
      for (let i = 0; i < entry.queue.length && i < 12; i++) {
        const arrival = entry.queue[i]
        const laneId = arrival.entryRoute[0]
        if (blocked.has(laneId)) continue
        blocked.add(laneId)
        const lane = this.laneMap.get(laneId)!
        const first = this.bodies.get(laneId)?.[0]
        const speed = Math.min(lane.speedLimit * arrival.speedFactor * (arrival.heavy ? 0.85 : 1), first?.vehicle.v ?? Infinity)
        const gap = first ? first.s - first.vehicle.length : Infinity
        if (gap < 2 + speed * 1.3) continue
        const vehicle = this.createVehicle(arrival.movement.id, { speed, heavy: arrival.heavy, bornAt: arrival.dueAt })
        vehicle.parameters.v0 *= arrival.speedFactor
        vehicle.laneId = laneId
        vehicle.route = arrival.entryRoute
        this.bodies.set(laneId, [{ vehicle, s: 0 }, ...(this.bodies.get(laneId) ?? [])])
        entry.queue.splice(i--, 1)
      }
    }
  }

  private leader(vehicle: Vehicle, laneId = vehicle.laneId, s = vehicle.s, route = vehicle.route, routeIndex = vehicle.routeIndex): Leader {
    let result: Leader = { gap: Infinity, speed: vehicle.v }
    for (const body of this.bodies.get(laneId) ?? []) {
      if (body.vehicle.id === vehicle.id || body.s < s - 1e-7) continue
      const gap = body.s - body.vehicle.length - s
      if (gap < result.gap) result = { gap, speed: body.vehicle.v, vehicle: body.vehicle }
      break
    }
    if (result.vehicle) return result
    let offset = this.laneMap.get(laneId)!.length - s
    for (let i = routeIndex + 1; i < route.length && offset < 220; i++) {
      if (!this.laneMap.get(route[i - 1])!.next.includes(route[i])) break
      for (const body of this.bodies.get(route[i]) ?? []) {
        if (body.vehicle.id === vehicle.id) continue
        const gap = offset + body.s - body.vehicle.length
        if (gap < result.gap) result = { gap, speed: body.vehicle.v, vehicle: body.vehicle }
        break
      }
      if (result.vehicle) break
      offset += this.laneMap.get(route[i])!.length
    }
    return result
  }

  private distanceToConnector(vehicle: Vehicle): number {
    let distance = -vehicle.s
    for (let i = vehicle.routeIndex; i < vehicle.route.length; i++) {
      const lane = this.laneMap.get(vehicle.route[i])!
      if (lane.kind === 'connector') return Math.max(0, distance)
      if (lane.exit) return Infinity
      distance += lane.length
    }
    return Infinity
  }

  private exitHasSpace(vehicle: Vehicle): boolean {
    const destination = vehicle.route.at(-1)!
    const first = (this.bodies.get(destination) ?? []).find(body => body.vehicle.id !== vehicle.id)
    // A moving receiving stream clears space during the connector traversal. Only
    // a stationary / braking queue should turn the box into a closed gate.
    const clearing = first && first.vehicle.v > 2 && first.vehicle.a > -1 ? first.vehicle.v * 3 : 0
    return !first || first.s + clearing - first.vehicle.length > vehicle.length + vehicle.parameters.s0 + 2
  }

  private canEnterJunction(vehicle: Vehicle, distance: number): boolean {
    if (vehicle.admitted || this.network.control.kind === 'free') return true
    const movement = this.movementMap.get(vehicle.movementId)!
    const control = this.network.control
    if (control.kind === 'signal' && !vehicle.permissiveWaiting && !mayPassSignal(control, this.time, movement, vehicle.v, distance, vehicle.parameters.b)) return false
    if (!this.exitHasSpace(vehicle)) return false
    const conflictIds = this.conflicts.get(movement.id) ?? new Set<string>()
    for (const zone of this.conflictZones.get(movement.id) ?? []) {
      const own = zone.a === movement.id ? zone.aRange : zone.bRange
      const otherRange = zone.a === movement.id ? zone.bRange : zone.aRange
      const otherId = zone.a === movement.id ? zone.b : zone.a
      const ownDistance = this.distanceToRange(vehicle, own)
      const ownTime = Math.max(0, ownDistance) / Math.max(4, vehicle.v)
      for (const other of this.admitted.get(otherId) ?? []) {
        const until = this.distanceToRange(other, otherRange)
        const rearPast = until + (otherRange.end - otherRange.start) + other.length < 0
        if (rearPast) continue
        // A vehicle's rear still inside the zone always owns it. Future arrivals
        // reserve their predicted crossing window, not the entire intersection.
        if (until <= 0 || until / Math.max(1, other.v) < ownTime + (own.end - own.start + vehicle.length) / Math.max(3, vehicle.v) + 1) return false
      }
    }
    const previousAdmission = this.lastGapAdmission.get(movement.id)
    if (control.kind === 'yield' && criticalGap(movement, control) > 0 && previousAdmission !== undefined && this.time - previousAdmission < followUpTime(movement, control)) return false
    // Uncontrolled equal-priority crossings require a complete stop and observation.
    if (control.kind === 'yield' && !control.majorApproaches?.length && !this.stoppedAtJunction.has(vehicle.id)) {
      if (vehicle.v < 0.4 && distance < 4) this.stoppedAtJunction.add(vehicle.id)
      else return false
    }
    const contenders = [...this.firstApproaching.values()].filter(car => car.v < 0.5 && this.distanceToConnector(car) < 8)
    const oldest = contenders.sort((a, b) => (a.waitingSince ?? this.time) - (b.waitingSince ?? this.time) || a.id - b.id)[0]
    const breakDeadlock = control.kind === 'yield' && this.time - this.lastAdmission > 8 && oldest?.id === vehicle.id
    if (breakDeadlock) return true
    const ownLane = this.laneMap.get(movement.lanes[0])!
    const ownDirection = sampleLane(ownLane, ownLane.length).tangent
    for (const conflictId of conflictIds) {
      const other = this.firstApproaching.get(conflictId)
      if (!other || other.id === vehicle.id) continue
      const otherMovement = this.movementMap.get(conflictId)!
      if (control.kind === 'signal' && !other.permissiveWaiting && !mayPassSignal(control, this.time, otherMovement, other.v, this.distanceToConnector(other), other.parameters.b)) continue
      const otherLane = this.laneMap.get(otherMovement.lanes[0])!
      const otherDirection = sampleLane(otherLane, otherLane.length).tangent
      const giveWay = control.kind === 'signal' ? movement.turn === 'left' && otherMovement.turn !== 'left' : mustYieldTo(movement, otherMovement, control, ownDirection, otherDirection)
      if (!giveWay) continue
      const otherDistance = this.distanceToConnector(other)
      const arrivalTime = other.v > 0.5 ? otherDistance / other.v : otherDistance < 8 ? 0 : Infinity
      if (arrivalTime < criticalGap(movement, control)) return false
    }
    return true
  }

  private distanceToRange(vehicle: Vehicle, range: ConflictRange): number {
    const current = vehicle.route.indexOf(range.laneId)
    if (current < 0) return Infinity
    let distance = range.start - vehicle.s
    if (current >= vehicle.routeIndex) for (let i = vehicle.routeIndex; i < current; i++) distance += this.laneMap.get(vehicle.route[i])!.length
    else for (let i = current; i < vehicle.routeIndex; i++) distance -= this.laneMap.get(vehicle.route[i])!.length
    return distance
  }

  private lateralPath(start: string, target: string): string[] | null {
    const queue = [[start]], visited = new Set([start])
    while (queue.length) {
      const path = queue.shift()!, id = path.at(-1)!
      if (id === target) return path
      const lane = this.laneMap.get(id)!
      for (const next of [lane.left, lane.right]) if (next && !visited.has(next)) { visited.add(next); queue.push([...path, next]) }
    }
    return null
  }

  private routeFrom(start: string, target: string): string[] | null {
    const key = `${start}|${target}`
    if (this.routeCache.has(key)) return this.routeCache.get(key)!
    const queue = [[start]], visited = new Set([start])
    while (queue.length) {
      const path = queue.shift()!
      const id = path.at(-1)!
      if (id === target) { this.routeCache.set(key, path); return path }
      for (const next of this.laneMap.get(id)?.next ?? []) if (!visited.has(next)) { visited.add(next); queue.push([...path, next]) }
    }
    this.routeCache.set(key, null)
    return null
  }

  private considerLaneChange(vehicle: Vehicle): void {
    if (vehicle.laneChange || this.time - vehicle.lastLaneChangeAt < 5 || vehicle.v < 1) return
    const lane = this.laneMap.get(vehicle.laneId)!
    if (!laneChangeAllowed(lane, vehicle.s) || lane.kind === 'connector') return
    const mandatoryNext = vehicle.route[vehicle.routeIndex + 1]
    const mandatory = Boolean(mandatoryNext && !lane.next.includes(mandatoryNext) && (lane.left === mandatoryNext || lane.right === mandatoryNext))
    const futureMandatory = vehicle.route.slice(vehicle.routeIndex, -1).some((id, index) => !this.laneMap.get(id)!.next.includes(vehicle.route[vehicle.routeIndex + index + 1]))
    if (!mandatory && futureMandatory) return
    if (!mandatory && !lane.merge && lane.length - vehicle.s < vehicle.v * 3.5 + 8) return
    const oldLeader = this.leader(vehicle)
    const p = { ...vehicle.parameters, v0: Math.min(vehicle.parameters.v0, lane.speedLimit) }
    const blockedByRoute = (mandatory || lane.merge) && lane.length - vehicle.s < oldLeader.gap
    const currentAcceleration = idmAcceleration(vehicle.v, blockedByRoute ? lane.length - vehicle.s : oldLeader.gap, blockedByRoute ? 0 : oldLeader.speed, p)
    for (const direction of ['right', 'left'] as const) {
      const targetId = lane[direction]
      if (!targetId) continue
      const target = this.laneMap.get(targetId)!
      const route = mandatory ? targetId === mandatoryNext ? vehicle.route.slice(vehicle.routeIndex + 1) : null : this.routeFrom(targetId, vehicle.route.at(-1)!)
      if (!route || route.length > vehicle.route.length - vehicle.routeIndex + 3) continue
      const s = projectToLane(target, sampleLane(lane, vehicle.s).position)
      if (!laneChangeAllowed(target, s) || target.length - s < 8) continue
      const leader = this.leader(vehicle, targetId, s, route, 0)
      if (leader.gap < vehicle.parameters.s0 + vehicle.v * 0.5) continue
      const targetBodies = this.bodies.get(targetId) ?? []
      const follower = [...targetBodies].reverse().find(body => body.s < s && body.vehicle.id !== vehicle.id)
      const oldFollower = [...(this.bodies.get(lane.id) ?? [])].reverse().find(body => body.s < vehicle.s && body.vehicle.id !== vehicle.id)
      const targetAfter = follower ? idmAcceleration(follower.vehicle.v, s - vehicle.length - follower.s, vehicle.v, follower.vehicle.parameters) : 0
      if (follower && s - vehicle.length - follower.s < 2) continue
      const targetBefore = follower ? idmAcceleration(follower.vehicle.v, this.leader(follower.vehicle).gap, this.leader(follower.vehicle).speed, follower.vehicle.parameters) : 0
      const oldBefore = oldFollower ? idmAcceleration(oldFollower.vehicle.v, vehicle.s - vehicle.length - oldFollower.s, vehicle.v, oldFollower.vehicle.parameters) : 0
      const oldAfter = oldFollower ? idmAcceleration(oldFollower.vehicle.v, oldLeader.gap + vehicle.s - oldFollower.s, oldLeader.speed, oldFollower.vehicle.parameters) : 0
      const decision = mobilDecision({ currentAcceleration, targetAcceleration: idmAcceleration(vehicle.v, leader.gap, leader.speed, { ...p, v0: Math.min(vehicle.parameters.v0, target.speedLimit) }), targetFollowerBefore: targetBefore, targetFollowerAfter: targetAfter, oldFollowerBefore: oldBefore, oldFollowerAfter: oldAfter, right: direction === 'right', mandatoryDistance: lane.merge || mandatory ? lane.length - vehicle.s : undefined, highway: lane.kind === 'main' || lane.kind === 'ramp', acceleration: p.a })
      if (!decision.accepted) continue
      vehicle.laneChange = { fromLaneId: lane.id, toLaneId: target.id, fromRoute: [...vehicle.route], fromRouteIndex: vehicle.routeIndex, fromS: vehicle.s, toS: s, startedAt: this.time, duration: 3.5, direction }
      vehicle.laneId = target.id; vehicle.s = s; vehicle.route = route; vehicle.routeIndex = 0
      vehicle.lastLaneChangeAt = this.time; vehicle.laneChanges++
      this.rebuildIndex()
      return
    }
  }

  private virtualStop(vehicle: Vehicle): number | null {
    const lane = this.laneMap.get(vehicle.laneId)!
    const planned = vehicle.route[vehicle.routeIndex + 1]
    if (planned && !lane.next.includes(planned)) return lane.length
    if (this.network.control.kind === 'free') {
      const next = vehicle.route[vehicle.routeIndex + 1]
      const first = next ? this.bodies.get(next)?.[0] : undefined
      return lane.merge && first && first.s - first.vehicle.length < vehicle.parameters.s0 + vehicle.v * 1.1 ? lane.length : null
    }
    const movement = this.movementMap.get(vehicle.movementId)!
    if (lane.kind === 'connector' && vehicle.permissiveWaiting && !vehicle.admitted) {
      if (!this.canEnterJunction(vehicle, 0)) return Math.min(4, lane.length * 0.15)
      vehicle.admitted = true
      this.lastAdmission = this.time
      this.lastGapAdmission.set(vehicle.movementId, this.time)
      const group = this.admitted.get(vehicle.movementId) ?? []
      group.push(vehicle)
      this.admitted.set(vehicle.movementId, group)
      return null
    }
    const distance = this.distanceToConnector(vehicle)
    if (this.network.control.kind === 'signal' && movement.turn === 'left' && distance < 8 && lane.kind !== 'connector' && signalState(this.network.control, this.time, movement.signalGroup ?? movement.from) === 'green' && this.exitHasSpace(vehicle)) vehicle.permissiveWaiting = true
    if (vehicle.permissiveWaiting && lane.kind !== 'connector') return null
    if (distance < 150 && !vehicle.admitted) {
      const stop = lane.stopLine ?? lane.length
      if (lane.kind !== 'connector' && !this.canEnterJunction(vehicle, Math.min(distance, stop - vehicle.s))) return stop
    }
    const next = vehicle.route[vehicle.routeIndex + 1]
    if (lane.merge && next) {
      const first = this.bodies.get(next)?.[0]
      if (first && first.s - first.vehicle.length < vehicle.parameters.s0 + vehicle.v * 1.1) return lane.length
    }
    return null
  }

  private fixedStep(): void {
    this.rebuildIndex()
    this.spawn()
    if (this.tick % 15 === 0) for (const vehicle of this.vehicles) this.considerLaneChange(vehicle)
    const updates = this.vehicles.map(vehicle => {
      const lane = this.laneMap.get(vehicle.laneId)!
      const leader = this.leader(vehicle)
      if (vehicle.laneChange) {
        const change = vehicle.laneChange
        const source = this.leader(vehicle, change.fromLaneId, change.fromS + vehicle.s - change.toS, change.fromRoute ?? [change.fromLaneId], change.fromRouteIndex ?? 0)
        if (source.gap < leader.gap) { leader.gap = source.gap; leader.speed = source.speed }
      }
      const stop = lane.kind === 'connector' || leader.gap > (lane.stopLine ?? lane.length) - vehicle.s - 1 ? this.virtualStop(vehicle) : null
      if (stop !== null && stop - vehicle.s < leader.gap) { leader.gap = Math.max(0, stop - vehicle.s); leader.speed = 0 }
      // Anticipate the next curve's speed before the node, avoiding instant corner braking.
      let limit = lane.speedLimit
      const next = this.laneMap.get(vehicle.route[vehicle.routeIndex + 1])
      if (next && next.speedLimit < limit) limit = Math.min(limit, Math.sqrt(next.speedLimit ** 2 + 2 * vehicle.parameters.b * Math.max(0, lane.length - vehicle.s - 5)))
      const acceleration = idmAcceleration(vehicle.v, leader.gap, leader.speed, { ...vehicle.parameters, v0: Math.min(vehicle.parameters.v0, limit) })
      const speed = Math.max(0, vehicle.v + acceleration * FIXED_DT)
      const distance = Math.min(speed * FIXED_DT, Math.max(0, leader.gap - 0.01))
      return { vehicle, acceleration, speed: Math.min(speed, distance / FIXED_DT), distance }
    })
    this.time += FIXED_DT
    this.tick++
    const completed = new Set<number>()
    for (const update of updates) {
      const { vehicle, acceleration, speed, distance } = update
      if (vehicle.v >= 0.5 && speed < 0.5) vehicle.stops++
      vehicle.v = speed; vehicle.a = acceleration; vehicle.s += distance; vehicle.distance += distance
      if (speed < 0.5) { vehicle.stoppedTime += FIXED_DT; vehicle.waitingSince ??= this.time }
      else vehicle.waitingSince = undefined
      let lane = this.laneMap.get(vehicle.laneId)!
      if (lane.exit && vehicle.s > vehicle.length + 8) { vehicle.admitted = false; vehicle.permissiveWaiting = false }
      const plannedNext = vehicle.route[vehicle.routeIndex + 1]
      if (plannedNext && !lane.next.includes(plannedNext) && lane.length - vehicle.s < 4 && vehicle.v < 0.5 && this.time - (vehicle.waitingSince ?? this.time) > 8) this.recoverMissedExit(vehicle, lane)
      // Reserve conflicts only on crossing the stop line, not while approaching from afar.
      if (!vehicle.admitted && !vehicle.permissiveWaiting && this.network.control.kind !== 'free' && lane.kind !== 'connector' && vehicle.s >= (lane.stopLine ?? lane.length) - 0.5 && this.distanceToConnector(vehicle) < 4) {
        if (this.canEnterJunction(vehicle, 0)) { vehicle.admitted = true; this.lastAdmission = this.time; this.lastGapAdmission.set(vehicle.movementId, this.time); const group = this.admitted.get(vehicle.movementId) ?? []; group.push(vehicle); this.admitted.set(vehicle.movementId, group) }
        else { vehicle.s = Math.min(vehicle.s, (lane.stopLine ?? lane.length) - 0.5); vehicle.v = 0 }
      }
      while (vehicle.s >= lane.length) {
        let nextId = vehicle.route[vehicle.routeIndex + 1]
        if (!nextId) { this.metricsWindow.record(this.time, vehicle); completed.add(vehicle.id); break }
        if (!lane.next.includes(nextId)) {
          // A missed turn is counted only at its physical divergence. Continue
          // along a legal longitudinal edge and find the next reachable exit.
          if (!this.recoverMissedExit(vehicle, lane)) { vehicle.s = lane.length - 0.01; vehicle.v = 0; break }
          nextId = vehicle.route[1]
        }
        const nextLane = this.laneMap.get(nextId)!
        const surplus = vehicle.s - lane.length
        // Sequential merge guard handles two simultaneous arrivals without accepting overlap.
        const nearest = this.vehicles.filter(other => other.id !== vehicle.id && other.laneId === nextId && !completed.has(other.id)).sort((a, b) => a.s - b.s)[0]
        if (nearest && nearest.s - nearest.length - surplus < 0.1) { vehicle.s = lane.length - 0.01; vehicle.v = 0; break }
        if (lane.merge) {
          const contender = this.vehicles.find(other => other.id !== vehicle.id && other.laneId !== lane.id && other.route[other.routeIndex + 1] === nextId && this.laneMap.get(other.laneId)!.length - other.s < 3 && other.v < 2)
          if (contender && this.lastMergeFrom.get(nextId) === lane.id) { vehicle.s = lane.length - 0.01; vehicle.v = 0; break }
          this.lastMergeFrom.set(nextId, lane.id)
        }
        if (vehicle.laneChange) {
          const change = vehicle.laneChange
          const source = this.laneMap.get(change.fromLaneId)!
          const sourceS = change.fromS + vehicle.s - change.toS
          if (sourceS >= source.length && source.next[0]) {
            change.fromLaneId = source.next[0]
            change.fromS -= source.length
            change.fromRoute = [change.fromLaneId, ...(this.laneMap.get(change.fromLaneId)?.next.slice(0, 1) ?? [])]
            change.fromRouteIndex = 0
          }
          change.toS -= lane.length
          change.toLaneId = nextId
        }
        vehicle.routeIndex++; vehicle.laneId = nextId; vehicle.s = surplus
        lane = nextLane
      }
    }
    if (completed.size) { this.vehicles = this.vehicles.filter(vehicle => !completed.has(vehicle.id)); for (const id of completed) this.stoppedAtJunction.delete(id) }
    if (this.time - this.lastMetrics >= 1 - 1e-9) { this.refreshMetrics(); this.lastMetrics = this.time }
  }

  private recoverMissedExit(vehicle: Vehicle, lane: Lane): boolean {
    const onward = lane.next[0]
    if (!onward) return false
    const intendedExit = vehicle.route.at(-1)!
    const destination = this.routeFrom(onward, intendedExit) ?? this.network.lanes.filter(item => item.exit).map(item => this.routeFrom(onward, item.id)).find(Boolean)
    if (!destination) return false
    if (destination.at(-1) !== intendedExit) {
      this.metricsWindow.missedExits++
      vehicle.intendedMovementId ??= vehicle.movementId
    }
    const origin = this.movementMap.get(vehicle.movementId)?.from
    const actual = this.network.movements.find(movement => movement.from === origin && movement.lanes.includes(lane.id) && movement.lanes.at(-1) === destination.at(-1))
    if (actual) vehicle.movementId = actual.id
    vehicle.admitted = false; vehicle.permissiveWaiting = false
    vehicle.route = [lane.id, ...destination]; vehicle.routeIndex = 0
    return true
  }

  refreshMetrics(): SimulationMetrics {
    const queueByApproach = measureApproachQueues(this.network.lanes, this.vehicles)
    this.metrics = this.metricsWindow.snapshot(this.time, this.vehicles, this.outsideQueue, queueByApproach)
    return this.metrics
  }
}

export function sampleVehicle(vehicle: Vehicle, network: Network, time = 0): LaneSample {
  const lane = network.lanes.find(item => item.id === vehicle.laneId)!
  const target = sampleLane(lane, vehicle.s - vehicle.length / 2)
  if (!vehicle.laneChange) return target
  const change = vehicle.laneChange
  const source = network.lanes.find(item => item.id === change.fromLaneId)!
  const from = sampleLane(source, change.fromS + vehicle.s - change.toS - vehicle.length / 2)
  const blend = laneChangeBlend(time - change.startedAt, change.duration)
  return { position: { x: from.position.x + (target.position.x - from.position.x) * blend, y: from.position.y + (target.position.y - from.position.y) * blend, z: from.position.z + (target.position.z - from.position.z) * blend }, tangent: target.tangent }
}
