import type { DemandOD, Movement, Network } from './types'

export interface DemandProfile {
  /** Preserve a homogeneous city junction's established per-approach input. */
  urbanPerApproach?: number
  highwayPerLane?: number
  arterialPerLane?: number
  urbanTurnShares?: { left: number; straight: number; right: number }
  highwayOffRampShare?: number
}

/** Existing city scenario's 20/65/15 turn split, normalized over available turns. */
export function cityMovementShares(movements: Movement[], proportions = { left: 0.2, straight: 0.65, right: 0.15 }): Map<string, number> {
  const turns = [...new Set(movements.map(movement => movement.turn))]
  const total = turns.reduce((sum, turn) => sum + proportions[turn], 0)
  return new Map(movements.map(movement => {
    const weight = movements.filter(candidate => candidate.turn === movement.turn).reduce((sum, candidate) => sum + (candidate.weight ?? 1), 0)
    return [movement.id, proportions[movement.turn] / total * (movement.weight ?? 1) / weight]
  }))
}

/**
 * A reproducible planning assumption, not a capacity estimate or traffic count.
 * Motorway entrances carry 1,600 veh/h/lane, of which 15% use a ramp. An urban
 * arterial carries 600 veh/h/lane. A homogeneous city's calibrated input can
 * instead be retained through urbanPerApproach.
 */
export function createDefaultOD(network: Network, profile: DemandProfile = {}): DemandOD[] {
  const lanes = new Map(network.lanes.map(lane => [lane.id, lane]))
  return [...new Set(network.movements.map(movement => movement.from))].flatMap(origin => {
    const movements = network.movements.filter(movement => movement.from === origin)
    const entryIds = new Set(movements.map(movement => movement.lanes[0]))
    const entryTag = lanes.get(movements[0].lanes[0])?.entry
    for (const lane of network.lanes) if (entryTag && lane.entry === entryTag) entryIds.add(lane.id)
    const highway = [...entryIds].some(id => lanes.get(id)?.kind === 'main')
    if (!highway) {
      const total = profile.urbanPerApproach ?? entryIds.size * (profile.arterialPerLane ?? 600)
      const shares = cityMovementShares(movements, profile.urbanTurnShares)
      return movements.map(movement => ({ movementId: movement.id, vehiclesPerHour: total * shares.get(movement.id)! }))
    }
    const total = entryIds.size * (profile.highwayPerLane ?? 1600)
    const main = movements.filter(movement => movement.lanes.every(id => lanes.get(id)?.kind === 'main'))
    const ramps = movements.filter(movement => !main.includes(movement))
    const rampShare = main.length && ramps.length ? profile.highwayOffRampShare ?? 0.15 : ramps.length ? 1 : 0
    const rampWeight = ramps.reduce((sum, movement) => sum + (movement.weight ?? 1), 0)
    const rampRows = ramps.map(movement => ({ movementId: movement.id, vehiclesPerHour: total * rampShare * (movement.weight ?? 1) / rampWeight }))
    const laneTurning = new Map<string, number>()
    for (const row of rampRows) {
      const laneId = movements.find(movement => movement.id === row.movementId)!.lanes[0]
      laneTurning.set(laneId, (laneTurning.get(laneId) ?? 0) + row.vehiclesPerHour)
    }
    // O-D demand specifies a destination road, not a preferred parallel lane.
    // Allocate its through routes over the space remaining after exiting cars
    // have chosen their upstream lane, retaining the same total O-D arrivals.
    const spare = new Map([...new Set(main.map(movement => movement.lanes[0]))].map(id => [id, Math.max(0, total / entryIds.size - (laneTurning.get(id) ?? 0))]))
    const totalSpare = [...spare.values()].reduce((sum, value) => sum + value, 0)
    const mainRows = main.map(movement => {
      const siblings = main.filter(candidate => candidate.lanes[0] === movement.lanes[0])
      const siblingWeight = siblings.reduce((sum, candidate) => sum + (candidate.weight ?? 1), 0)
      const laneShare = totalSpare > 0 ? spare.get(movement.lanes[0])! / totalSpare : 1 / spare.size
      return { movementId: movement.id, vehiclesPerHour: total * (1 - rampShare) * laneShare * (movement.weight ?? 1) / siblingWeight }
    })
    return [...mainRows, ...rampRows]
  })
}

export function totalODDemand(od: readonly DemandOD[]): number {
  return od.reduce((sum, row) => sum + row.vehiclesPerHour, 0)
}

/** Keep each road O-D total while choosing upstream through lanes around the
 * lane-specific turning load. Used by observed graphs whose road classes have
 * separate rates rather than createDefaultOD's schematic profile. */
export function balanceThroughEntries(network: Network, rows: DemandOD[]): void {
  const byId = new Map(network.lanes.map(item => [item.id, item]))
  const rate = new Map(rows.map(row => [row.movementId, row]))
  for (const origin of new Set(network.movements.map(m => m.from))) {
    const movements = network.movements.filter(m => m.from === origin)
    const through = movements.filter(m => m.lanes.every(id => byId.get(id)?.kind === 'main'))
    if (!through.length) continue
    const total = movements.reduce((sum, m) => sum + (rate.get(m.id)?.vehiclesPerHour ?? 0), 0)
    const entryTag = byId.get(movements[0].lanes[0])?.entry
    const entryCount = network.lanes.filter(l => entryTag && l.entry === entryTag).length
    const turning = new Map<string, number>()
    for (const m of movements.filter(m => !through.includes(m))) turning.set(m.lanes[0], (turning.get(m.lanes[0]) ?? 0) + (rate.get(m.id)?.vehiclesPerHour ?? 0))
    const space = new Map([...new Set(through.map(m => m.lanes[0]))].map(id => [id, Math.max(0, total / entryCount - (turning.get(id) ?? 0))]))
    const sumSpace = [...space.values()].reduce((a, b) => a + b, 0)
    const original = new Map(through.map(m => [m.id, rate.get(m.id)!.vehiclesPerHour]))
    const totalThrough = [...original.values()].reduce((a, b) => a + b, 0)
    for (const m of through) {
      const siblings = through.filter(item => item.lanes[0] === m.lanes[0]).reduce((sum, item) => sum + original.get(item.id)!, 0)
      rate.get(m.id)!.vehiclesPerHour = totalThrough * space.get(m.lanes[0])! / sumSpace * original.get(m.id)! / siblings
    }
  }
}
