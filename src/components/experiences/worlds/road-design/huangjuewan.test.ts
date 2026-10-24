import { describe, expect, it } from 'vitest'
import roadData from './data/huangjuewan-roads.json'
import { buildHuangjuewan, huangjuewanTopologySummary, HUANGJUEWAN_METADATA } from './designs/huangjuewan'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { TrafficSimulation } from './sim/simulation'

describe('observed Huangjuewan road graph and inferred vertical geometry', () => {
  it('preserves shared nodes and checks every full-road crossing instead of trusting OSM level labels', () => {
    expect(HUANGJUEWAN_METADATA.sameLayerOrderInferences).toHaveLength(0)
    for (const road of roadData.roads) for (let i = 1; i < road.nodes.length; i++) {
      const a = roadData.nodes[road.nodes[i - 1]], b = roadData.nodes[road.nodes[i]]
      const grade = Math.abs(Number(a[2]) - Number(b[2])) / Math.hypot(Number(a[1]) - Number(b[1]), Number(a[3]) - Number(b[3]))
      expect(grade).toBeLessThanOrEqual(.06)
    }
    for (const crossing of roadData.crossings) {
      const [a, b, t] = crossing.a, [c, d, u] = crossing.b
      const first = Number(roadData.nodes[a][2]) * (1 - t) + Number(roadData.nodes[b][2]) * t
      const second = Number(roadData.nodes[c][2]) * (1 - u) + Number(roadData.nodes[d][2]) * u
      expect(crossing.taggedOrder).toBe(true)
      expect((first - second) * crossing.sign).toBeGreaterThanOrEqual(5.5)
    }
    const network = buildHuangjuewan(), conflicts = summarizeConflicts(calculateConflicts(network))
    expect(new Set(network.lanes.map(lane => lane.id)).size).toBe(network.lanes.length)
    for (const auxiliary of network.lanes.filter(lane => lane.id.startsWith('hjw-accel-'))) {
      expect(auxiliary.length).toBeLessThanOrEqual(240.001)
      expect(auxiliary.length).toBeGreaterThan(60)
      expect(auxiliary.next).toHaveLength(0)
      expect(network.lanes.some(lane => lane.id === (auxiliary.left ?? auxiliary.right))).toBe(true)
    }
    console.info('Huangjuewan topology', huangjuewanTopologySummary(), conflicts, HUANGJUEWAN_METADATA)
    expect(conflicts.crossing).toBe(0)
    expect(conflicts.merge).toBeGreaterThan(0)
    expect(conflicts.diverge).toBeGreaterThan(0)
  })
  it('routes real O-D movements for thirty minutes without negative speed, overlap or permanent starvation', async () => {
    const network = buildHuangjuewan(), sim = new TrafficSimulation(network, { seed: 42, demandMultiplier: 1 })
    const byId = new Map(network.lanes.map(lane => [lane.id, lane]))
    for (const movement of network.movements) for (let i = 1; i < movement.lanes.length; i++) {
      const previous = byId.get(movement.lanes[i - 1])!, next = movement.lanes[i]
      expect([...previous.next, previous.left, previous.right]).toContain(next)
    }
    for (let second = 0; second < 1800; second++) {
      sim.advance(1)
      if (second % 100 === 99) await new Promise(resolve => setTimeout(resolve, 0))
      if (second % 10 === 0) {
        const groups = new Map<string, typeof sim.vehicles>()
        for (const car of sim.vehicles) { expect(car.v).toBeGreaterThanOrEqual(0); const list = groups.get(car.laneId) ?? []; list.push(car); groups.set(car.laneId, list) }
        for (const list of groups.values()) { list.sort((a, b) => a.s - b.s); for (let i = 1; i < list.length; i++) expect(list[i].s - list[i].length - list[i - 1].s).toBeGreaterThanOrEqual(-1e-5) }
      }
      if (second % 300 === 299) console.info('Huangjuewan', second + 1, sim.metrics.demand, sim.metrics.throughput, sim.metrics.averageDelay, sim.vehicles.length, sim.outsideQueue, Math.max(0, ...sim.vehicles.map(car => car.waitingSince === undefined ? 0 : sim.time - car.waitingSince)))
    }
    expect(Math.abs(sim.metrics.throughput - sim.totalDemand) / sim.totalDemand).toBeLessThanOrEqual(.1)
    expect(Math.max(0, ...sim.vehicles.map(car => car.waitingSince === undefined ? 0 : sim.time - car.waitingSince))).toBeLessThan(180)
    sim.setDemandMultiplier(0)
    // A route can traverse several kilometres after leaving a queue. Allow
    // twenty minutes to drain, but reject a continuously frozen vehicle much
    // earlier; an arbitrary ten-minute travel deadline is not a deadlock test.
    for (let second = 0; second < 1200 && (sim.vehicles.length || sim.outsideQueue); second++) {
      sim.advance(1)
      if (second % 100 === 99) await new Promise(resolve => setTimeout(resolve, 0))
      if (second % 60 === 59) {
        const longestStop = Math.max(0, ...sim.vehicles.map(car => car.waitingSince === undefined ? 0 : sim.time - car.waitingSince))
        expect(longestStop, `drain ${second + 1}s: ${sim.vehicles.length} remaining`).toBeLessThan(180)
      }
      if (second === 599) console.info('Huangjuewan remaining after ten-minute drain', sim.vehicles.map(car => ({ lane: car.laneId, v: car.v, stopped: car.waitingSince === undefined ? 0 : sim.time - car.waitingSince })))
    }
    console.info('Huangjuewan cleared', sim.time - 1800, 'seconds after arrivals stop')
    expect(sim.vehicles.length).toBe(0)
  }, 300000)
})
