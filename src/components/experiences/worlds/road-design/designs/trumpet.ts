import { addAccelerationLanes } from './acceleration-lanes'
import type { Carriageway, DesignSpec, Lane, Movement, Network, Vec3 } from '../sim/types'
import { createDefaultOD } from '../sim/demand'
import { arc, GROUND, joinPaths, lane, line, point, rotate, routePoints } from './kit'
import { HIGHWAY_CENTER as CENTER, HIGHWAY_LANE as W, HIGHWAY_OUTER as OUTER, verticalEase } from './freeway-kit'
import { MOVEMENT_NAMES } from './movement-names'
const BOUNDS = [-1500, -650, -80, 80, 650, 1500]
const elevation = (x: number) => GROUND + 8 * (1 - verticalEase((Math.abs(x) - 300) / 350))
const mainId = (d: number, i: number, s: number) => `main-${d}-${i}-${s}`
function main(d: number, a: number, b: number, lateral: number) {
	return line(point(a, lateral), point(b, lateral), 8).map((p) => rotate({ ...p, y: elevation(p.x) }, (d * Math.PI) / 2))
}
export function buildTrumpet(): Network {
	const lanes: Lane[] = [],
		carriageways: Carriageway[] = [],
		movements: Movement[] = []
	for (const d of [0, 2]) {
		carriageways.push({
			id: `highway-${d}`,
			points: main(d, -1500, 1500, CENTER),
			laneCount: 3,
			laneWidth: W,
			shoulder: 3,
			speedLimit: 120 / 3.6,
			level: 1,
			bridge: true,
			kind: 'main',
		})
		for (let i = 0; i < 3; i++)
			for (let s = 0; s < BOUNDS.length - 1; s++) {
				const l = lane(mainId(d, i, s), main(d, BOUNDS[s], BOUNDS[s + 1], CENTER + (i - 1) * W), {
					kind: 'main',
					width: W,
					level: 1,
					speedLimit: 120 / 3.6,
					next: s < 4 ? [mainId(d, i, s + 1)] : [],
					...(s === 0 ? { entry: d === 0 ? 'west' : 'east' } : {}),
					...(s === 4 ? { exit: d === 0 ? 'east' : 'west' } : {}),
				})
				if (i > 0) l.left = mainId(d, i - 1, s)
				if (i < 2) l.right = mainId(d, i + 1, s)
				lanes.push(l)
			}
	}
	const stemOffset = 5.5
	for (const incoming of [true, false]) {
		const points = line(
			point(incoming ? stemOffset : -stemOffset, incoming ? 1500 : 650),
			point(incoming ? stemOffset : -stemOffset, incoming ? 650 : 1500),
			8,
		)
		lanes.push(
			lane(incoming ? 'south-in' : 'south-out', points, {
				kind: 'main',
				width: W,
				level: 0,
				speedLimit: 90 / 3.6,
				next: [],
				...(incoming ? { entry: 'south' } : { exit: 'south' }),
			}),
		)
		carriageways.push({
			id: incoming ? 'stem-inbound' : 'stem-outbound',
			points,
			laneCount: 1,
			laneWidth: W,
			shoulder: 2,
			speedLimit: 90 / 3.6,
			level: 0,
			bridge: false,
			kind: 'main',
		})
	}
	// The loop peels from the western end of the eastbound-to-westbound deck,
	// descends through 270 degrees, and joins the outbound stem underneath it.
	const radius = 66.125,
		center = point(-80, -80)
	const loop = joinPaths(
		arc(center, radius, Math.PI / 2, Math.PI * 1.5, 144).map((p, i) => ({ ...p, y: GROUND + 8 * (1 - verticalEase(i / 144)) })),
		line(point(-OUTER, -80), point(-stemOffset, 650), 8),
	)
	const rightWest = joinPaths(
		line(point(-650, OUTER), point(-226.125, OUTER), 8),
		arc(point(-226.125, 240), 226.125, -Math.PI / 2, Math.PI / 2, 100),
		line(point(0, 240), point(-stemOffset, 650), 8),
	)
	// Mirror the outer direct ramp for the stem-to-east right turn.
	const rightSouth = joinPaths(
		line(point(stemOffset, 650), point(stemOffset, 240), 8),
		arc(point(231.625, 240), 226.125, Math.PI, Math.PI / 2, 100),
		line(point(231.625, OUTER), point(650, OUTER), 8),
	)
	const semiFlat = joinPaths(
		line(point(stemOffset, 650), point(stemOffset, 225.5), 8),
		arc(point(-214.5, 225.5), 220, 0, -Math.PI / 2, 100),
		line(point(-214.5, stemOffset), point(-650, -OUTER), 8),
	)
	const semiDistance = [0]
	semiFlat.slice(1).forEach((p, i) => semiDistance.push(semiDistance[i] + Math.hypot(p.x - semiFlat[i].x, p.z - semiFlat[i].z)))
	const semi = semiFlat.map((p, i) => ({
		...p,
		y: GROUND + 16 * Math.min(verticalEase(semiDistance[i] / 460), verticalEase((semiDistance.at(-1)! - semiDistance[i]) / 460)),
	}))
	const addRamp = (id: string, points: Vec3[], next: string, level: number, speed: number) => {
		lanes.push(lane(id, points, { kind: 'ramp', width: W, level, speedLimit: speed / 3.6, next: [next], merge: true }))
		carriageways.push({
			id: `${id}-road`,
			points,
			laneCount: 1,
			laneWidth: W,
			shoulder: 1.2,
			level,
			speedLimit: speed / 3.6,
			bridge: level > 0 || id === 'loop',
			kind: 'ramp',
			superelevation: id === 'loop' ? -0.06 : 0.04,
		})
	}
	addRamp('loop', loop, 'south-out', 0, 40)
	addRamp('west-right', rightWest, 'south-out', 0, 60)
	addRamp('south-right', rightSouth, mainId(0, 2, 4), 0, 60)
	addRamp('south-left', semi, mainId(2, 2, 4), 2, 60)
	const add = (from: string, to: string, turn: 'left' | 'straight' | 'right', route: string[], weight: number, suffix = '') => {
		movements.push({
			id: `${from}-${turn}${suffix}`,
			name: MOVEMENT_NAMES[from][turn],
			from,
			to,
			turn,
			lanes: route,
			weight,
			priority: turn === 'straight' ? 3 : 1,
		})
		for (let i = 1; i < route.length; i++) {
			const l = lanes.find((l) => l.id === route[i - 1])!
			if (!l.next.includes(route[i])) l.next.push(route[i])
		}
	}
	for (const d of [0, 2])
		for (let i = 0; i < 3; i++)
			add(
				d === 0 ? 'west' : 'east',
				d === 0 ? 'east' : 'west',
				'straight',
				BOUNDS.slice(0, -1).map((_, s) => mainId(d, i, s)),
				0.85 / 3,
				`-${i}`,
			)
	add('west', 'south', 'right', [mainId(0, 2, 0), 'west-right', 'south-out'], 0.15)
	add('east', 'south', 'left', [mainId(2, 2, 0), mainId(2, 2, 1), mainId(2, 2, 2), 'loop', 'south-out'], 0.15)
	add('south', 'west', 'left', ['south-in', 'south-left', mainId(2, 2, 4)], 0.5)
	add('south', 'east', 'right', ['south-in', 'south-right', mainId(0, 2, 4)], 0.5)
	const network: Network = {
		id: 'trumpet',
		lanes,
		movements,
		carriageways,
		schematicMovements: movements
			.filter((m) => m.turn !== 'straight' || m.id.endsWith('-2'))
			.map((m) => ({ ...m, points: routePoints(lanes, m.lanes) })),
		weaving: [],
		control: { kind: 'free' },
		measurementArea: { minX: -680, maxX: 680, minZ: -180, maxZ: 680 },
	}
	addAccelerationLanes(network)
	network.defaultOD = createDefaultOD(network, { highwayPerLane: 1500 })
	return network
}
export const trumpet: DesignSpec = {
	id: 'trumpet',
	name: '喇叭形立交',
	nameEn: 'Trumpet interchange',
	chapter: 3,
	description: '三条高速相遇，一个慢速环道加一条半定向匝道，就能让所有方向互通。',
	defaultDemand: 3200,
	camera: { position: { x: 340, y: 230, z: 490 }, target: { x: -30, y: 8, z: 110 }, fov: 54 },
	build: buildTrumpet,
}
