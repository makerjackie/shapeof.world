import { addAccelerationLanes } from './acceleration-lanes'
import type { Carriageway, Lane, Movement, Network, Vec3 } from '../sim/types'
import { createDefaultOD } from '../sim/demand'
import { arc, bezier, GROUND, joinPaths, lane, line, point, rotate, routePoints } from './kit'
import { MOVEMENT_NAMES } from './movement-names'

export const HIGHWAY_LANE = 3.75,
	HIGHWAY_CENTER = 10.125,
	HIGHWAY_OUTER = HIGHWAY_CENTER + HIGHWAY_LANE
export const APPROACHES = ['west', 'north', 'east', 'south']
const OUTGOING = ['east', 'south', 'west', 'north']
const BOUNDS = [-1500, -760, -700, 700, 760, 1500]
const mainId = (d: number, i: number, segment: number) => `main-${d}-${i}-${segment}`
/** A linear central grade with 12% parabolic vertical transitions at its ends. */
export function verticalEase(t: number) {
	t = Math.max(0, Math.min(1, t))
	const e = 0.12
	return t < e ? (t * t) / (2 * e * (1 - e)) : t > 1 - e ? 1 - (1 - t) ** 2 / (2 * e * (1 - e)) : (t - e / 2) / (1 - e)
}
function mainElevation(direction: number, station: number) {
	return GROUND + (direction % 2 ? 8 * (1 - verticalEase((Math.abs(station) - 380) / 300)) : 0)
}
function mainPath(d: number, from: number, to: number, lateral: number) {
	return line(point(from, lateral), point(to, lateral), 12).map((p) => rotate({ ...p, y: mainElevation(d, p.x) }, (d * Math.PI) / 2))
}
function withDeck(points: Vec3[], startHeight: number, endHeight: number, deck: number, transition: number) {
	const cumulative = [0]
	points.slice(1).forEach((p, i) => cumulative.push(cumulative[i] + Math.hypot(p.x - points[i].x, p.z - points[i].z)))
	const total = cumulative.at(-1)!
	return points.map((p, i) => ({
		...p,
		y:
			GROUND +
			Math.min(
				startHeight + (deck - startHeight) * verticalEase(cumulative[i] / transition),
				endHeight + (deck - endHeight) * verticalEase((total - cumulative[i]) / transition),
			),
	}))
}

/** Four physical motorway carriageways and separate, non-weaving off/on ramps.
 * Only the centre lines differ between the stack and turbine layouts. */
export function buildDirectionalInterchange(kind: 'stack' | 'turbine'): Network {
	const lanes: Lane[] = [],
		carriageways: Carriageway[] = [],
		movements: Movement[] = []
	for (let d = 0; d < 4; d++) {
		carriageways.push({
			id: `highway-${d}`,
			points: mainPath(d, -1500, 1500, HIGHWAY_CENTER),
			laneCount: 3,
			laneWidth: HIGHWAY_LANE,
			shoulder: 3,
			speedLimit: 110 / 3.6,
			level: d % 2,
			bridge: Boolean(d % 2),
			kind: 'main',
		})
		for (let i = 0; i < 3; i++)
			for (let s = 0; s < BOUNDS.length - 1; s++) {
				const l = lane(mainId(d, i, s), mainPath(d, BOUNDS[s], BOUNDS[s + 1], HIGHWAY_CENTER + (i - 1) * HIGHWAY_LANE), {
					kind: 'main',
					width: HIGHWAY_LANE,
					level: d % 2,
					speedLimit: 110 / 3.6,
					next: s < BOUNDS.length - 2 ? [mainId(d, i, s + 1)] : [],
					...(s === 0 ? { entry: APPROACHES[d] } : {}),
					...(s === BOUNDS.length - 2 ? { exit: OUTGOING[d] } : {}),
				})
				if (i > 0) l.left = mainId(d, i - 1, s)
				if (i < 2) l.right = mainId(d, i + 1, s)
				if (i === 2 && s === 0) l.next.push(`right-${d}`)
				if (i === 2 && s === 1) l.next.push(`left-${d}`)
				lanes.push(l)
			}
		const rightTarget = (d + 1) % 4,
			leftTarget = (d + 3) % 4
		const right = bezier(point(-760, HIGHWAY_OUTER), point(-350, HIGHWAY_OUTER), point(-HIGHWAY_OUTER, 350), point(-HIGHWAY_OUTER, 760), 150).map(
			(p) => rotate(p, (d * Math.PI) / 2),
		)
		// Stack left turns use 220 m constant-radius curves, with long tangent ramps.
		const radius = 220,
			center = point(HIGHWAY_OUTER - radius, HIGHWAY_OUTER - radius)
		const flatLeft =
			kind === 'stack'
				? joinPaths(
						line(point(-700, HIGHWAY_OUTER), point(center.x, HIGHWAY_OUTER), 8),
						arc(center, radius, Math.PI / 2, -Math.PI / 2, 90),
						line(point(HIGHWAY_OUTER, center.z), point(HIGHWAY_OUTER, -700), 8),
					)
				: bezier(point(-700, HIGHWAY_OUTER), point(280, HIGHWAY_OUTER), point(HIGHWAY_OUTER, -180), point(HIGHWAY_OUTER, -700), 180)
		const deck = d % 2 ? (kind === 'stack' ? 26 : 24) : 16
		const elevatedLeft = withDeck(flatLeft, mainElevation(d, -700) - GROUND, mainElevation(leftTarget, 700) - GROUND, deck, 500)
		const left = elevatedLeft.map((p) => rotate(p, (d * Math.PI) / 2))
		for (const [turn, points, target, level] of [
			['right', right, rightTarget, 0],
			['left', left, leftTarget, Math.round(deck / 8)],
		] as const) {
			const merge = turn === 'right' ? 4 : 3
			lanes.push(
				lane(`${turn}-${d}`, points, {
					kind: 'ramp',
					width: HIGHWAY_LANE,
					level,
					speedLimit: (kind === 'turbine' || turn === 'right' ? 70 : 75) / 3.6,
					next: [mainId(target, 2, merge)],
					merge: true,
				}),
			)
			carriageways.push({
				id: `${turn}-road-${d}`,
				points,
				laneCount: 1,
				laneWidth: HIGHWAY_LANE,
				shoulder: 1.25,
				level,
				speedLimit: 70 / 3.6,
				bridge: turn === 'left',
				kind: 'ramp',
				superelevation: turn === 'left' ? 0.04 : -0.04,
			})
			movements.push({
				id: `${APPROACHES[d]}-${turn}`,
				name: MOVEMENT_NAMES[APPROACHES[d]][turn],
				from: APPROACHES[d],
				to: OUTGOING[target],
				turn,
				lanes: [
					mainId(d, 2, 0),
					...(turn === 'left' ? [mainId(d, 2, 1)] : []),
					`${turn}-${d}`,
					...BOUNDS.slice(merge, -1).map((_, i) => mainId(target, 2, merge + i)),
				],
				weight: turn === 'left' ? 0.08 : 0.07,
				priority: 1,
			})
		}
		for (let i = 0; i < 3; i++)
			movements.push({
				id: `${APPROACHES[d]}-straight-${i}`,
				name: MOVEMENT_NAMES[APPROACHES[d]].straight,
				from: APPROACHES[d],
				to: OUTGOING[d],
				turn: 'straight',
				lanes: BOUNDS.slice(0, -1).map((_, s) => mainId(d, i, s)),
				weight: 0.85 / 3,
				priority: 3,
			})
	}
	const schematicMovements = movements
		.filter((m) => m.turn !== 'straight' || m.id.endsWith('-2'))
		.map((m) => ({ ...m, points: routePoints(lanes, m.lanes) }))
	const network: Network = {
		id: kind,
		lanes,
		movements,
		carriageways,
		schematicMovements,
		weaving: [],
		control: { kind: 'free' },
		measurementArea: { minX: -790, maxX: 790, minZ: -790, maxZ: 790 },
	}
	addAccelerationLanes(network)
	network.defaultOD = createDefaultOD(network)
	return network
}
