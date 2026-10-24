import type { DesignSpec, Lane, Network, Vec3 } from '../sim/types'
import { createDefaultOD } from '../sim/demand'
import { buildUrban } from './urban'
import { MOVEMENT_NAMES } from './movement-names'
import { buildChannelizedCrossroads } from './crossroads-channelized'
import { bezier, GROUND, lane, line, point, joinPaths } from './kit'
const D = [
		{ x: 0, z: -1 },
		{ x: 1, z: 0 },
		{ x: 0, z: 1 },
		{ x: -1, z: 0 },
	],
	W = 3.5
const at = (arm: number, longitudinal: number, lateral: number): Vec3 =>
	point(D[arm].x * longitudinal + D[arm].z * lateral, D[arm].z * longitudinal - D[arm].x * lateral)
/** Partial displaced-left-turn / continuous-flow intersection. Only the main
 * north–south left turns cross upstream; east–west left turns remain permitted. */
export function buildContinuousFlow(): Network {
	const n = buildChannelizedCrossroads()
	n.id = 'continuous-flow'
	n.control = {
		kind: 'signal',
		phases: [
			{ id: 'ns', groups: ['ns'], green: 36, yellow: 3, allRed: 2 },
			{ id: 'ew', groups: ['ew'], green: 36, yellow: 3, allRed: 2 },
		],
	}
	for (const l of n.lanes) {
		if (l.signalGroups) l.signalGroups = [l.id.startsWith('north') || l.id.startsWith('south') ? 'ns' : 'ew']
		if (l.waitingArea) {
			l.waitingArea = false
			l.protectedTurn = false
		}
		if (l.turn === 'left') l.protectedTurn = false
	}
	for (const m of n.movements) m.signalGroup = m.from === 'north' || m.from === 'south' ? 'ns' : 'ew'
	for (const [name, arm, toArm] of [
		['north', 0, 1],
		['south', 2, 3],
	] as const) {
		const entry = n.lanes.find((l) => l.id === `${name}-in-0`)!,
			entryPoints = line(at(arm, 360, W / 2), at(arm, 150, W / 2), 8)
		Object.assign(
			entry,
			lane(entry.id, entryPoints, {
				speedLimit: 50 / 3.6,
				level: 0,
				width: W,
				kind: 'urban',
				next: [`${name}-through-feeder`, `${name}-crossover-gate`],
				entry: name,
				right: `${name}-in-1`,
			}),
		)
		n.lanes.push(
			lane(`${name}-through-feeder`, line(at(arm, 150, W / 2), at(arm, 120, W / 2), 3), {
				kind: 'urban',
				width: W,
				level: 0,
				speedLimit: 50 / 3.6,
				next: [`${name}-approach-0`],
			}),
		)
		for (const m of n.movements) if (m.lanes[0] === entry.id && m.turn !== 'left') m.lanes.splice(1, 0, `${name}-through-feeder`)
		const gate = lane(`${name}-crossover-gate`, line(at(arm, 150, W / 2), at(arm, 140, W / 2), 1), {
			kind: 'urban',
			width: W,
			level: 0,
			speedLimit: 35 / 3.6,
			next: [`${name}-crossover`],
			signalGroups: ['ew'],
			controlPoint: `${name}-upstream`,
			protectedTurn: true,
		})
		gate.stopLine = gate.length - 1
		const cross = lane(`${name}-crossover`, bezier(at(arm, 140, W / 2), at(arm, 128, W / 2), at(arm, 118, -12.25), at(arm, 105, -12.25), 48), {
			kind: 'connector',
			width: W,
			level: 0,
			speedLimit: 30 / 3.6,
			next: [`${name}-displaced-left`],
			turn: 'left',
			controlPoint: `${name}-upstream`,
			protectedTurn: true,
		})
		const displaced = lane(`${name}-displaced-left`, line(at(arm, 105, -12.25), at(arm, 28, -12.25), 3), {
			kind: 'urban',
			width: W,
			level: 0,
			speedLimit: 35 / 3.6,
			next: [],
			signalGroups: ['ns'],
			controlPoint: 'center',
			protectedTurn: true,
		})
		displaced.stopLine = displaced.length - 1
		n.lanes.push(gate, cross, displaced)
		n.carriageways.push({
			id: `${name}-displaced-pavement`,
			points: [...cross.points, ...displaced.points.slice(1)],
			laneCount: 1,
			laneWidth: W,
			shoulder: 0.45,
			level: 0,
			bridge: false,
			speedLimit: 35 / 3.6,
			kind: 'urban',
			oneWay: true,
		})
		const m = n.movements.find((m) => m.from === name && m.turn === 'left')!,
			connector = n.lanes.find((l) => l.id === m.lanes.at(-2))!
		const a = displaced.points.at(-1)!,
			b = at(toArm, 28, -W / 2)
		const points = bezier(a, point(a.x - D[arm].x * 18, a.z - D[arm].z * 18), point(b.x - D[toArm].x * 18, b.z - D[toArm].z * 18), b, 48)
		Object.assign(
			connector,
			lane(connector.id, points, {
				kind: 'connector',
				width: W,
				level: 0,
				speedLimit: 30 / 3.6,
				next: [m.lanes.at(-1)!],
				turn: 'left',
				controlPoint: 'center',
				protectedTurn: true,
			}),
		)
		displaced.next = [connector.id]
		m.lanes = [entry.id, gate.id, cross.id, displaced.id, connector.id, m.lanes.at(-1)!]
		n.lanes = n.lanes.filter((l) => l.id !== `${name}-left-pocket` && l.id !== `${name}-left-wait`)
		// Receiving traffic at the upstream crossover has its own physical gate.
		for (let i = 0; i < 3; i++) {
			const old = n.lanes.find((l) => l.id === `${name}-out-${i}`)!,
				offset = -W * (i + 0.5)
			const first = lane(old.id, line(at(arm, 28, offset), at(arm, 105, offset), 3), {
				kind: 'urban',
				width: W,
				level: 0,
				speedLimit: 50 / 3.6,
				next: [`${old.id}-crossing`],
				signalGroups: ['ns'],
				controlPoint: `${name}-upstream`,
				protectedTurn: true,
			})
			first.stopLine = first.length - 1
			const middle = lane(`${old.id}-crossing`, line(at(arm, 105, offset), at(arm, 150, offset), 3), {
				kind: 'connector',
				width: W,
				level: 0,
				speedLimit: 50 / 3.6,
				next: [`${old.id}-tail`],
				controlPoint: `${name}-upstream`,
				protectedTurn: true,
				turn: 'straight',
			})
			const tail = lane(`${old.id}-tail`, line(at(arm, 150, offset), at(arm, 360, offset), 8), {
				kind: 'urban',
				width: W,
				level: 0,
				speedLimit: 50 / 3.6,
				next: [],
				exit: name,
			})
			Object.assign(old, first)
			delete old.exit
			n.lanes.push(middle, tail)
			for (const movement of n.movements) if (movement.lanes.at(-1) === old.id) movement.lanes.push(middle.id, tail.id)
		}
	}
	// A one-lane-per-direction conflict diagram, independently of the physical
	// lane fan. Separate local paths carry their actual upstream signal phases.
	n.schematicMovements = buildUrban('cfi-main-diagram', false, true).schematicMovements
	for (const [name, arm, toArm] of [
		['north', 0, 1],
		['south', 2, 3],
	] as const) {
		const movement = n.schematicMovements.find((m) => m.from === name && m.turn === 'left')!
		const outgoing = movement.points.filter((p) => p.x * D[toArm].x + p.z * D[toArm].z >= 20 - 1e-6)
		const start = at(arm, 20, -12.25),
			end = at(toArm, 20, -W / 2)
		movement.points = joinPaths(
			line(at(arm, 32, -12.25), start, 1),
			bezier(start, point(start.x - D[arm].x * 14, start.z - D[arm].z * 14), point(end.x - D[toArm].x * 14, end.z - D[toArm].z * 14), end, 48),
			outgoing,
		)
		const shared = line(at(arm, 165, W / 2), at(arm, 140, W / 2), 1)
		const crossover = n.lanes.find((l) => l.id === `${name}-crossover`)!.points
		n.schematicMovements.push(
			{
				id: `${name}-upstream-left`,
				name: movement.name,
				from: `${name}-upstream-in`,
				to: `${name}-displaced`,
				turn: 'left',
				signalGroup: 'ew',
				points: joinPaths(shared, crossover, line(crossover.at(-1)!, at(arm, 90, -12.25), 1)),
			},
			{
				id: `${name}-upstream-through`,
				name: MOVEMENT_NAMES[name].straight,
				from: `${name}-upstream-in`,
				to: `${name}-ordinary`,
				turn: 'straight',
				signalGroup: 'ns',
				points: joinPaths(shared, line(at(arm, 140, W / 2), at(arm, 90, W / 2), 1)),
			},
			{
				id: `${name}-upstream-outgoing`,
				name: MOVEMENT_NAMES[name === 'north' ? 'south' : 'north'].straight,
				from: `${name}-center-out`,
				to: `${name}-beyond`,
				turn: 'straight',
				signalGroup: 'ns',
				points: line(at(arm, 90, -W / 2), at(arm, 165, -W / 2), 1),
			},
		)
	}
	n.measurementArea = { minX: -165, maxX: 165, minZ: -165, maxZ: 165 }
	n.defaultOD = createDefaultOD(n, { urbanPerApproach: 700 })
	return n
}
export const continuousFlow: DesignSpec = {
	id: 'continuous-flow',
	name: '连续流交叉口',
	nameEn: 'Continuous-flow intersection',
	chapter: 1,
	description: '左转在上游先穿过对向车道，来到道路外侧等待。到主路口时，左转和对向直行可以一起走。',
	defaultDemand: 700,
	camera: { position: { x: 145, y: 170, z: 215 }, target: { x: 0, y: GROUND, z: 0 }, fov: 55 },
	build: buildContinuousFlow,
}
