import { DESIGN_BASIS, rightRampPath } from './design-basis'
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
const mainId = (d: number, i: number, segment: number) => `main-${d}-${i}-${segment}`
/** A linear central grade with 12% parabolic vertical transitions at its ends. */
export function verticalEase(t: number) {
	t = Math.max(0, Math.min(1, t))
	const e = 0.12
	return t < e ? (t * t) / (2 * e * (1 - e)) : t > 1 - e ? 1 - (1 - t) ** 2 / (2 * e * (1 - e)) : (t - e / 2) / (1 - e)
}
function mainElevation(direction: number, station: number, plateau = 720) {
	return GROUND + (direction % 2 ? 8 * (1 - verticalEase((Math.abs(station) - plateau) / 300)) : 0)
}
function mainPath(d: number, from: number, to: number, lateral: number, plateau = 720) {
	return line(point(from, lateral), point(to, lateral), 12).map((p) => rotate({ ...p, y: mainElevation(d, p.x, plateau) }, (d * Math.PI) / 2))
}
function withDeck(points: Vec3[], startHeight: number, endHeight: number, deck: number) {
	const cumulative = [0]
	points.slice(1).forEach((p, i) => cumulative.push(cumulative[i] + Math.hypot(p.x - points[i].x, p.z - points[i].z)))
	const total = cumulative.at(-1)!
	return points.map((p, i) => ({
		...p,
		y:
			GROUND +
			Math.min(
				startHeight + (deck - startHeight) * verticalEase(cumulative[i] / ((deck-startHeight)/(DESIGN_BASIS.maximumGrade*.88))),
				endHeight + (deck - endHeight) * verticalEase((total - cumulative[i]) / ((deck-endHeight)/(DESIGN_BASIS.maximumGrade*.88))),
			),
	}))
}

/** Four physical motorway carriageways and separate, non-weaving off/on ramps.
 * Only the centre lines differ between the stack and turbine layouts. */
export function buildDirectionalInterchange(kind: 'stack' | 'turbine'): Network {
 const leftStation = kind === 'stack' ? 720 : 800
 const plateau = kind === 'turbine' ? 60 : 720
 const elevation = (d: number,s: number) => mainElevation(d,s,plateau)
 const BOUNDS = [-1500, -leftStation, -330, 330, leftStation, 1500]
	const lanes: Lane[] = [],
		carriageways: Carriageway[] = [],
		movements: Movement[] = []
	for (let d = 0; d < 4; d++) {
		carriageways.push({
			id: `highway-${d}`,
			points: mainPath(d, -1500, 1500, HIGHWAY_CENTER, plateau),
			laneCount: 3,
			laneWidth: HIGHWAY_LANE,
			shoulder: 3,
			speedLimit: DESIGN_BASIS.mainKmh / 3.6,
			level: d % 2,
			bridge: Boolean(d % 2),
			kind: 'main',
		})
		for (let i = 0; i < 3; i++)
			for (let s = 0; s < BOUNDS.length - 1; s++) {
				const l = lane(mainId(d, i, s), mainPath(d, BOUNDS[s], BOUNDS[s + 1], HIGHWAY_CENTER + (i - 1) * HIGHWAY_LANE, plateau), {
					kind: 'main',
					width: HIGHWAY_LANE,
					level: d % 2,
					speedLimit: DESIGN_BASIS.mainKmh / 3.6,
					next: s < BOUNDS.length - 2 ? [mainId(d, i, s + 1)] : [],
					...(s === 0 ? { entry: APPROACHES[d] } : {}),
					...(s === BOUNDS.length - 2 ? { exit: OUTGOING[d] } : {}),
				})
				if (i > 0) l.left = mainId(d, i - 1, s)
				if (i < 2) l.right = mainId(d, i + 1, s)
				if (i === 2 && s === 0) l.next.push(`left-${d}`)
				if (i === 2 && s === 1) l.next.push(`right-${d}`)
				lanes.push(l)
			}
		const rightTarget = (d + 1) % 4,
			leftTarget = (d + 3) % 4
		const right = rightRampPath(HIGHWAY_OUTER).map(
			(p,i,all) => rotate({...p,y: elevation(d,-330)+(elevation(rightTarget,330)-elevation(d,-330))*verticalEase(i/(all.length-1))}, (d * Math.PI) / 2),
		)
		// Stack left turns use R150 curves; tangent length is set by the 4% grade.
		const radius = DESIGN_BASIS.directionalRadius,
			center = point(HIGHWAY_OUTER - radius, HIGHWAY_OUTER - radius)
		const flatLeft =
			kind === 'stack'
				? joinPaths(
						line(point(-leftStation, HIGHWAY_OUTER), point(center.x, HIGHWAY_OUTER), 8),
						arc(center, radius, Math.PI / 2, -Math.PI / 2, 90),
						line(point(HIGHWAY_OUTER, center.z), point(HIGHWAY_OUTER, -leftStation), 8),
					)
				: bezier(point(-leftStation, HIGHWAY_OUTER), point(280, HIGHWAY_OUTER), point(HIGHWAY_OUTER, -180), point(HIGHWAY_OUTER, -leftStation), 180)
		const deck = kind === 'turbine' ? 16 : d % 2 ? 26 : 16
		const elevatedLeft = withDeck(flatLeft, elevation(d, -leftStation) - GROUND, elevation(leftTarget, leftStation) - GROUND, deck)
		if (kind === 'turbine') {
      // A rotational three-level braid: pass the preceding arm at 8.8 m,
      // climb outside the centre, then pass the following arm at 16 m.
      // This eliminates the artificial fourth storey of the old paired ramps.
      const distances=[0]
      flatLeft.slice(1).forEach((p,i)=>distances.push(distances[i]+Math.hypot(p.x-flatLeft[i].x,p.z-flatLeft[i].z)))
      elevatedLeft.forEach((p,i)=>{ const s=distances[i],total=distances.at(-1)!
        p.y=GROUND+Math.min(8.8*verticalEase(s/270)+7.2*verticalEase((s-600)/210),16*verticalEase((total-s)/480))
      })
    }
    const left = elevatedLeft.map(p => rotate(p, d * Math.PI / 2))
		for (const [turn, points, target, level] of [
			['right', right, rightTarget, 0],
			['left', left, leftTarget, Math.round(deck / 8)],
		] as const) {
			const merge = turn === 'right' ? 3 : 4
			lanes.push(
				lane(`${turn}-${d}`, points, {
					kind: 'ramp',
					width: HIGHWAY_LANE,
					level,
					speedLimit: 60 / 3.6,
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
				speedLimit: 60 / 3.6,
				bridge: turn === 'left' || points.some(p => p.y - GROUND > 2.5),
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
					...(turn === 'right' ? [mainId(d, 2, 1)] : []),
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
		measurementArea: { minX: -830, maxX: 830, minZ: -830, maxZ: 830 },
	}
	addAccelerationLanes(network)
	network.defaultOD = createDefaultOD(network)
	return network
}
