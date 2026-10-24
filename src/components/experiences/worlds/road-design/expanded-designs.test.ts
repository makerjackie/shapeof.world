import { projectToLane, sampleLane } from './sim/geometry'
import { describe, expect, it } from 'vitest'
import { stack } from './designs/stack'
import { turbine } from './designs/turbine'
import { trumpet } from './designs/trumpet'
import { parclo } from './designs/parclo'
import { continuousFlow } from './designs/continuous-flow'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { distance } from './designs/kit'
import { TrafficSimulation } from './sim/simulation'
import type { Network, Vec3, Vehicle } from './sim/types'
import { buildServiceInterchange } from './designs/diamond'
import { signalState } from './sim/control'

const DESIGNS = [stack, turbine, trumpet, parclo, continuousFlow]
function bodies(vehicles: Vehicle[]) {
	const groups = new Map<string, Vehicle[]>()
	for (const v of vehicles) {
		expect(Number.isFinite(v.v)).toBe(true)
		expect(v.v).toBeGreaterThanOrEqual(0)
		const group = groups.get(v.laneId) ?? []
		group.push(v)
		groups.set(v.laneId, group)
	}
	for (const group of groups.values()) {
		group.sort((a, b) => a.s - b.s)
		for (let i = 1; i < group.length; i++) expect(group[i].s - group[i].length - group[i - 1].s).toBeGreaterThanOrEqual(-1e-5)
	}
}

/** Inspect actual rendered deck centre lines independently of the schematic
 * conflict graph. Tangential ramps joining a motorway are not overpasses. */
function transverseDeckCrossings(network: Network) {
	const crossings: { a: string; b: string; position: Vec3; clearance: number }[] = []
	for (let a = 0; a < network.carriageways.length; a++) for (let b = a + 1; b < network.carriageways.length; b++) {
		const first = network.carriageways[a], second = network.carriageways[b]
		for (let i = 1; i < first.points.length; i++) for (let j = 1; j < second.points.length; j++) {
			const p = first.points[i - 1], q = first.points[i], r = second.points[j - 1], s = second.points[j]
			const ax = q.x - p.x, az = q.z - p.z, bx = s.x - r.x, bz = s.z - r.z
			const determinant = ax * bz - az * bx
			if (Math.abs(determinant) / Math.max(1e-10, Math.hypot(ax, az) * Math.hypot(bx, bz)) < Math.sin(Math.PI / 9)) continue
			const t = ((r.x - p.x) * bz - (r.z - p.z) * bx) / determinant
			const u = ((r.x - p.x) * az - (r.z - p.z) * ax) / determinant
			if (t < 0 || t > 1 || u < 0 || u > 1) continue
			const position = { x: p.x + t * ax, y: p.y + t * (q.y - p.y), z: p.z + t * az }
			const clearance = Math.abs(position.y - (r.y + u * (s.y - r.y)))
			if (!crossings.some(c => c.a === first.id && c.b === second.id && Math.hypot(c.position.x - position.x, c.position.z - position.z) < 0.1))
				crossings.push({ a: first.id, b: second.id, position, clearance })
		}
	}
	return crossings
}

describe('expanded interchange geometry', () => {
	for (const design of DESIGNS)
		it(`${design.id}: connected driven routes, bounded grade, computed conflicts`, () => {
			const n = design.build(),
				byId = new Map(n.lanes.map((l) => [l.id, l]))
			expect(new Set(n.lanes.map((l) => l.id)).size).toBe(n.lanes.length)
			for (const l of n.lanes) {
				for (const nextId of l.next) {
					const next = byId.get(nextId)
					expect(next, `${l.id} has a dangling successor ${nextId}`).toBeDefined()
					expect(distance(l.points.at(-1)!, next!.points[0]), `${l.id} → ${nextId} is a physical join`).toBeLessThan(1e-5)
				}
				for (const adjacentId of [l.left, l.right].filter(Boolean)) expect(byId.has(adjacentId!), `${l.id} has dangling adjacent lane ${adjacentId}`).toBe(true)
			}
			for (const m of n.movements)
				for (let i = 1; i < m.lanes.length; i++) {
					const before = byId.get(m.lanes[i - 1])!,
						after = byId.get(m.lanes[i])!
					expect(before, `${m.id} ${m.lanes[i - 1]}`).toBeDefined()
					expect(after, `${m.id} ${m.lanes[i]}`).toBeDefined()
					expect([...before.next, before.left, before.right], `${m.id} ${before.id} → ${after.id}`).toContain(after.id)
          if (before.next.includes(after.id)) expect(distance(before.points.at(-1)!, after.points[0]), `${m.id}: ${before.id} → ${after.id}`).toBeLessThan(1e-5)
          else for (const fraction of [.2, .5, .8]) {
            const p = sampleLane(before, before.length * fraction).position
            const q = sampleLane(after, projectToLane(after, p)).position
            expect(distance(p, q), `${before.id} has a physically adjacent receiving lane`).toBeLessThanOrEqual(after.width + .05)
          }
				}
			for (const l of n.lanes)
				for (let i = 1; i < l.points.length; i++) {
					const a = l.points[i - 1],
						b = l.points[i]
					expect(Math.abs(a.y - b.y) / Math.hypot(a.x - b.x, a.z - b.z), l.id).toBeLessThanOrEqual(0.06001)
				}
			const conflicts = summarizeConflicts(calculateConflicts(n))
			console.info(design.id, conflicts)
			if (design.id === 'parclo')
				expect(
					calculateConflicts({
						...n,
						schematicMovements: n.schematicMovements.map((m) => ({ ...m, points: m.points.map((p) => ({ ...p, y: (p.y * 2.5) / 5.5 })) })),
					}).filter((c) => c.type === 'crossing' && Math.abs(c.position.z) > 25),
					'Loop crossings outside the signals must have 5.5 m clearance',
				).toHaveLength(0)
			if (design.chapter === 3) {
				const crossings = transverseDeckCrossings(n)
				expect(crossings.length).toBeGreaterThan(0)
				for (const c of crossings) expect(c.clearance, `${c.a} × ${c.b} at ${c.position.x.toFixed(1)}, ${c.position.z.toFixed(1)}`).toBeGreaterThanOrEqual(5.5)
				expect(conflicts.crossing).toBe(0)
				const clearanceProbe = {
					...n,
					schematicMovements: n.schematicMovements.map((m) => ({ ...m, points: m.points.map((p) => ({ ...p, y: (p.y * 2.5) / 5.5 })) })),
				}
				expect(
					calculateConflicts(clearanceProbe).filter((c) => c.type === 'crossing'),
					'All transverse deck crossings must be at least 5.5 m apart',
				).toHaveLength(0)
			}
			expect(n.defaultOD?.reduce((sum, od) => sum + od.vehiclesPerHour, 0)).toBeGreaterThan(2000)
		})
	it('uses 220 m stack turns, a 66 m trumpet loop, and separate turbine ramps without weaving', () => {
		for (const design of [stack, turbine]) {
			const n = design.build()
			expect(n.weaving).toHaveLength(0)
			const points = n.lanes.find((l) => l.id === 'left-0')!.points
			let minRadius = Infinity
			for (let i = 1; i < points.length - 1; i++) {
				const a = points[i - 1],
					b = points[i],
					c = points[i + 1],
					ab = Math.hypot(a.x - b.x, a.z - b.z),
					bc = Math.hypot(b.x - c.x, b.z - c.z),
					ac = Math.hypot(a.x - c.x, a.z - c.z),
					area = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x))
				if (area > 1e-6) minRadius = Math.min(minRadius, (ab * bc * ac) / (2 * area))
			}
			expect(minRadius).toBeGreaterThan(150)
		}
		expect(trumpet.build().carriageways.filter((c) => c.id === 'loop-road')).toHaveLength(1)
	})
	it('keeps compact service terminals 200–250 m apart with two driven arterial lanes per direction', () => {
		for (const ddi of [false, true]) {
			const network = buildServiceInterchange(ddi)
			const terminals = network.urbanJunctions!
			const spacing = distance(terminals[0].position, terminals[1].position)
			expect(spacing).toBeGreaterThanOrEqual(200)
			expect(spacing).toBeLessThanOrEqual(250)
			for (const direction of ['east', 'west']) {
				const entries = network.lanes.filter(lane => lane.entry === direction)
				expect(entries).toHaveLength(2)
				expect(entries.every(lane => lane.width === 3.5)).toBe(true)
				const flows = network.movements.filter(movement => movement.from === direction && movement.turn === 'straight')
				expect(new Set(flows.map(movement => movement.lanes[0])).size).toBe(2)
			}
		}
	})
	it('holds displaced left turns at the upstream red, crosses on EW green, then releases on NS green', () => {
		for (const name of ['north', 'south']) {
			const sim = new TrafficSimulation(continuousFlow.build(), { seed: 7, demand: 0 })
			const movement = sim.network.movements.find(m => m.from === name && m.turn === 'left')!
			const gate = sim.laneMap.get(`${name}-crossover-gate`)!
			const car = sim.createVehicle(movement.id, { routeIndex: 1, s: gate.length - 2, speed: 0 })
			let entered = -1, released = -1
			sim.advance(39)
			expect(car.laneId).toBe(gate.id)
			expect(car.v).toBeLessThan(0.1)
			sim.advance(65, state => {
				if (car.routeIndex >= 2 && entered < 0) entered = state.time
				if (car.routeIndex >= 4 && released < 0) released = state.time
			})
			expect(entered).toBeGreaterThan(39)
			expect(released).toBeGreaterThan(entered)
			expect(signalState(sim.network.control, entered, 'ew')).toBe('green')
			expect(signalState(sim.network.control, released, 'ns')).toBe('green')
			// The displaced left no longer intersects the simultaneous opposing
			// through connector at the central junction.
			const left = sim.laneMap.get(movement.lanes[4])!
			const opposing = sim.network.movements.find(m => m.from === (name === 'north' ? 'south' : 'north') && m.turn === 'straight')!
			const through = opposing.lanes.map(id => sim.laneMap.get(id)!).find(lane => lane.kind === 'connector')!
			const probe: Network = { ...sim.network, schematicMovements: [
				{ ...movement, points: left.points },
				{ ...opposing, points: through.points },
			] }
			expect(calculateConflicts(probe).filter(point => point.type === 'crossing')).toHaveLength(0)
		}
	})
	it('puts continuous-flow left turns through an upstream opposite-phase gate before the main gate', () => {
		const n = continuousFlow.build(),
			byId = new Map(n.lanes.map((l) => [l.id, l]))
		for (const name of ['north', 'south']) {
			const m = n.movements.find((m) => m.from === name && m.turn === 'left')!,
				gates = m.lanes.map((id) => byId.get(id)!).filter((l) => l.signalGroups)
			expect(gates.map((l) => l.controlPoint)).toEqual([`${name}-upstream`, 'center'])
			expect(gates.map((l) => l.signalGroups)).toEqual([['ew'], ['ns']])
			const crossover = byId.get(`${name}-crossover`)!
			expect(Math.abs(crossover.points[0].z)).toBeGreaterThanOrEqual(100)
			expect(Math.abs(crossover.points[0].z)).toBeLessThanOrEqual(150)
		}
		expect(n.control.phases).toHaveLength(2)
	})
})

describe('expanded atlas microscopic traffic', () => {
	for (const design of DESIGNS)
		it(`${design.id}: 30 minutes has no overlaps, negative speeds, or permanent deadlock`, () => {
			const demand = design.chapter === 1 ? 350 : 400,
				sim = new TrafficSimulation(design.build(), { seed: 271828, demand })
			sim.warmup(240)
			let completed = sim.metrics.completed
			for (let second = 0; second < 1800; second++) {
				sim.advance(1)
				if (second % 5 === 0) bodies(sim.vehicles)
				if ((second + 1) % 300 === 0) {
					expect(sim.metrics.completed - completed).toBeGreaterThan(40)
					completed = sim.metrics.completed
				}
			}
			sim.setDemand(0)
			sim.advance(900)
			expect(sim.outsideQueue).toBe(0)
			expect(sim.vehicles).toHaveLength(0)
		}, 90_000)
})
