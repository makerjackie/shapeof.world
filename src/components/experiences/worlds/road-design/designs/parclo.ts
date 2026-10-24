import { addAccelerationLanes } from './acceleration-lanes'
import type { DesignSpec, Network } from '../sim/types'
import { createDefaultOD } from '../sim/demand'
import { buildServiceInterchange } from './diamond'
import { arc, GROUND, lane, line, point, rotate, routePoints, smoothstep } from './kit'
/** Two diagonally opposite loop entrances replace arterial left turns. The
 * loops merge into real split motorway links, rather than overlapping a lane. */
export function buildParclo(): Network {
	const network = buildServiceInterchange(false, false, false, false)
	network.id = 'parclo'
	for (const [from, to, terminal, other, rotation] of [
		['west', 'north', 'right', 'left', 0],
		['east', 'south', 'left', 'right', Math.PI],
	] as const) {
		const old = network.lanes.find((l) => l.id === `${terminal}-main-1-1`)!,
			radius = 85 - 10.125,
			mergeZ = 1.75 + radius
		const merge = rotate(point(10.125, mergeZ, GROUND + 8), rotation)
		// Keep the upstream ID; all original routes acquire the downstream segment.
		const beforePoints = line(old.points[0], merge, 6).map((p) => ({ ...p, y: GROUND + 8 * (1 - smoothstep((Math.abs(p.z) - 200) / 400)) }))
		const afterPoints = line(merge, old.points.at(-1)!, 6).map((p) => ({ ...p, y: GROUND + 8 * (1 - smoothstep((Math.abs(p.z) - 200) / 400)) }))
		const before = lane(old.id, beforePoints, {
			kind: 'main',
			width: 3.75,
			level: 1,
			speedLimit: 100 / 3.6,
			next: [`${old.id}-after-loop`],
			left: old.left,
		})
		const after = lane(`${old.id}-after-loop`, afterPoints, {
			kind: 'main',
			width: 3.75,
			level: 1,
			speedLimit: 100 / 3.6,
			next: old.next,
			left: old.left,
		})
		Object.assign(old, before)
		network.lanes.push(after)
		for (const m of network.movements) {
			const index = m.lanes.indexOf(old.id)
			if (index >= 0) m.lanes.splice(index + 1, 0, after.id)
		}
		// 75 m radius, 270-degree loop; the 8 m climb fits well below 6%.
		const points = arc(point(85, mergeZ), radius, -Math.PI / 2, Math.PI * 1.5, 144).map((p, i) =>
			rotate({ ...p, y: GROUND + 8 * smoothstep(i / (144 * 0.75)) }, rotation),
		)
		const loopId = `${from}-left-loop`
		network.lanes.push(lane(loopId, points, { kind: 'ramp', width: 3.75, level: 1, speedLimit: 40 / 3.6, next: [after.id], merge: true }))
		network.carriageways.push({
			id: `${loopId}-road`,
			points,
			laneCount: 1,
			laneWidth: 3.75,
			shoulder: 1.2,
			level: 1,
			speedLimit: 40 / 3.6,
			bridge: true,
			kind: 'ramp',
			superelevation: -0.06,
		})
		const m = network.movements.find((m) => m.from === from && m.to === to)!
		m.lanes = [`${other}-w-in`, `${other}-we`, `${terminal}-e-in`, loopId, after.id, `${terminal}-main-1-2`]
		for (let i = 1; i < m.lanes.length; i++) {
			const previous = network.lanes.find((l) => l.id === m.lanes[i - 1])!
			if (!previous.next.includes(m.lanes[i])) previous.next.push(m.lanes[i])
		}
	}
	// Full interchange boundary: include motorway joins/splits as well as both
	// terminal junctions. One representative lane per O-D movement avoids
	// multiplying a physical conflict by the two arterial through lanes.
	const diagramLanes = network.lanes.map((l) => {
		if (!l.id.endsWith('-wr')) return l
		const inside = network.lanes.find((lane) => lane.id === `${l.id.split('-')[0]}-w-in`)!.points.at(-1)!,
			start = l.points[0]
		return {
			...l,
			points: l.points.map((p, i) => {
				const t = i / (l.points.length - 1)
				return { ...p, x: p.x + (inside.x - start.x) * (1 - t), z: p.z + (inside.z - start.z) * (1 - t) }
			}),
		}
	})
	network.schematicMovements = network.movements
		.filter((m) => m.turn !== 'straight' || m.id.endsWith('-main-1') || (!m.id.includes('-main-') && !m.id.endsWith('-outer')))
		.map((m) => ({
			...m,
			points: routePoints(
				diagramLanes,
				m.lanes.map((id) => id.replace(/-outer$/, '')),
			),
		}))
	network.measurementArea = { minX: -190, maxX: 190, minZ: -470, maxZ: 470 }
	addAccelerationLanes(network)
	network.defaultOD = createDefaultOD(network, { urbanTurnShares: { left: .1, straight: .8, right: .1 } })
	return network
}
export const parclo: DesignSpec = {
	id: 'parclo',
	name: '部分苜蓿叶立交',
	nameEn: 'Partial cloverleaf',
	chapter: 2,
	description: '两个象限加上环形匝道，部分左转绕过去。留下的信号路口仍需等待，也多占了一块土地。',
	defaultDemand: 1200,
	camera: { position: { x: 270, y: 260, z: 380 }, target: { x: 0, y: 8, z: 0 }, fov: 56 },
	build: buildParclo,
}
