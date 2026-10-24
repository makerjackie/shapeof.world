import { projectToLane, sampleLane } from './sim/geometry'
import { describe, expect, it } from 'vitest'
import { buildServiceInterchange, diamond } from './designs/diamond'
import { ddi } from './designs/ddi'
import { distance } from './designs/kit'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { TrafficSimulation } from './sim/simulation'
import type { Vehicle } from './sim/types'

function checkBodies(vehicles: Vehicle[]) {
  const lanes = new Map<string, Vehicle[]>()
  for (const v of vehicles) {
    expect(Number.isFinite(v.v)).toBe(true)
    expect(v.v).toBeGreaterThanOrEqual(0)
    const group = lanes.get(v.laneId) ?? []; group.push(v); lanes.set(v.laneId, group)
  }
  for (const group of lanes.values()) {
    group.sort((a, b) => a.s - b.s)
    for (let i = 1; i < group.length; i++) expect(group[i].s - group[i].length - group[i - 1].s).toBeGreaterThanOrEqual(-1e-5)
  }
}

describe('service interchange geometry and the NCHRP 959 conflict boundary', () => {
  it('computes conventional diamond conflicts with and without the actual ramp-through lanes', () => {
    expect(summarizeConflicts(calculateConflicts(buildServiceInterchange(false, true)))).toEqual({ total: 26, crossing: 10, merge: 8, diverge: 8 })
    const without = buildServiceInterchange(false, false)
    expect(summarizeConflicts(calculateConflicts(without))).toEqual({ total: 18, crossing: 6, merge: 6, diverge: 6 })
    expect(without.lanes.some(lane => lane.id.endsWith('-rr'))).toBe(false)
  })
  it('computes the DDI crossovers and physically switches to left-side travel between them', () => {
    const network = ddi.build()
    expect(summarizeConflicts(calculateConflicts(network))).toEqual({ total: 14, crossing: 2, merge: 6, diverge: 6 })
    const eastbound = network.lanes.find(lane => lane.id === 'right-e-in')!, westbound = network.lanes.find(lane => lane.id === 'left-e-in')!
    expect(eastbound.points.at(-1)!.x).toBeGreaterThan(eastbound.points[0].x)
    expect(westbound.points.at(-1)!.x).toBeLessThan(westbound.points[0].x)
    expect(eastbound.points.every(p => p.z < 0)).toBe(true)
    expect(westbound.points.every(p => p.z > 0)).toBe(true)
    expect(network.lanes.some(lane => lane.id.endsWith('-rr'))).toBe(false)
  })
  for (const design of [diamond, ddi]) it(`${design.id}: connected routes, two independent local gates and highway clearance`, () => {
    const network = design.build(), byId = new Map(network.lanes.map(lane => [lane.id, lane]))
    for (const movement of network.movements) for (let i = 1; i < movement.lanes.length; i++) {
      const before = byId.get(movement.lanes[i - 1])!, after = byId.get(movement.lanes[i])!
      expect([...before.next, before.left, before.right]).toContain(after.id)
      if (before.next.includes(after.id)) expect(distance(before.points.at(-1)!, after.points[0])).toBeLessThan(1e-8)
      else for (const fraction of [.2, .5, .8]) {
        const p = sampleLane(before, before.length * fraction).position
        expect(distance(p, sampleLane(after, projectToLane(after, p)).position)).toBeLessThanOrEqual(after.width + .05)
      }
    }
    const crossing = network.movements.find(m => m.id === 'west-east')!
    expect(crossing.lanes.map(id => byId.get(id)!).filter(l => l.signalGroups).map(l => l.controlPoint)).toEqual(['left', 'right'])
    for (const road of network.carriageways) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i]
      expect(Math.abs(a.y - b.y) / Math.max(0.001, Math.hypot(a.x - b.x, a.z - b.z))).toBeLessThanOrEqual(0.061)
    }
    const highways=network.carriageways.filter(road=>road.kind==='main')
    const medianWidth=Math.abs(highways[0].points[0].x-highways[1].points[0].x)-highways.reduce((sum,road)=>sum+road.laneCount*road.laneWidth/2+(road.shoulder??0),0)
    expect(medianWidth).toBeGreaterThanOrEqual(3)
    const high = network.carriageways.find(road => road.id === 'left-highway')!.points.find(p => Math.abs(p.z) < 5)!
    // 1.75 m box girder below the deck still leaves > 5.5 m above the arterial.
    expect(high.y - 1.75 - 0.12).toBeGreaterThanOrEqual(5.5)
  })
})

describe('service interchange microscopic traffic', () => {
  it('drains both diamond terminals after a queue spills back between them', () => {
    // This seed produces opposing left turns behind two full central links.
    // A queued through driver with no receiving space must not retain priority
    // forever and prevent either left turn from freeing the central storage.
    const sim = new TrafficSimulation(diamond.build(), { seed: 42, demand: 380 })
    sim.advance(925)
    sim.setDemand(0)
    for (let second = 0; second < 1200; second++) {
      sim.advance(1)
      checkBodies(sim.vehicles)
    }
    expect(sim.outsideQueue).toBe(0)
    expect(sim.vehicles).toHaveLength(0)
  }, 30_000)
  for (const design of [diamond, ddi]) it(`${design.id}: 30 min low-demand service agrees within 10%, with no overlap or permanent queue`, () => {
    const demand = 220, sim = new TrafficSimulation(design.build(), { seed: 271828, demand })
    sim.warmup(300)
    const before = sim.metrics.completed
    let fiveMinuteCompletions = before
    for (let second = 0; second < 1800; second++) {
      sim.advance(1)
      checkBodies(sim.vehicles)
      if ((second + 1) % 300 === 0) {
        expect(sim.metrics.completed - fiveMinuteCompletions).toBeGreaterThan(demand * 4 * 300 / 3600 * 0.65)
        fiveMinuteCompletions = sim.metrics.completed
      }
    }
    const throughput = (sim.metrics.completed - before) * 2
    expect(Math.abs(throughput - demand * 4) / (demand * 4)).toBeLessThanOrEqual(0.1)
    expect(sim.outsideQueue).toBe(0)
    expect(sim.vehicles.filter(v => v.v < 0.1 && v.waitingSince !== undefined && sim.time - v.waitingSince > 180)).toHaveLength(0)
  }, 30_000)
})
