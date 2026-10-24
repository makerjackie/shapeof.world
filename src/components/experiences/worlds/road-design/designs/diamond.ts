import { addAccelerationLanes } from './acceleration-lanes'
import type { Carriageway, DesignSpec, Lane, Movement, Network, SchematicMovement, Turn, Vec3 } from '../sim/types'
import { bezier, GROUND, joinPaths, lane, line, point, smoothstep } from './kit'
import { cumulativeLengths, sampleLane } from '../sim/geometry'
import { createDefaultOD } from '../sim/demand'
import { MOVEMENT_NAMES } from './movement-names'

const HALF_SPACING = 105,
	HALF_NODE = 20,
	WIDTH = 3.5,
	OFFSET = WIDTH / 2
const HIGHWAY_WIDTH = 3.75,
	HIGHWAY_CENTER = 8.25,
	OUTER = HIGHWAY_CENTER + HIGHWAY_WIDTH / 2
const TERMINALS = ['left', 'right'] as const
const ARMS = ['w', 'e', 'r'] as const
type Arm = (typeof ARMS)[number]
type Terminal = (typeof TERMINALS)[number]

function highwayElevation(z: number) {
	return GROUND + 8 * (1 - smoothstep((Math.abs(z) - 200) / 400))
}
function transform(p: Vec3, terminal: Terminal) {
	const direction = terminal === 'left' ? 1 : -1
	return point(direction * (p.x - HALF_SPACING), direction * p.z, p.y)
}
function port(arm: Arm, incoming: boolean, ddi: boolean, extent = HALF_NODE) {
	if (arm === 'r') return point(0, incoming ? -extent : extent)
	const x = arm === 'w' ? -extent : extent
	const lateral = ddi ? 6 : OFFSET
	const z = arm === 'w' ? (incoming ? lateral : -lateral) : (incoming ? -lateral : lateral) * (ddi ? -1 : 1)
	return point(x, z)
}
function connection(from: Arm, to: Arm, ddi: boolean) {
	const a = port(from, true, ddi),
		d = port(to, false, ddi)
	const fi = from === 'w' ? { x: 1, z: 0 } : from === 'e' ? { x: -1, z: 0 } : { x: 0, z: 1 }
	const ti = to === 'w' ? { x: -1, z: 0 } : to === 'e' ? { x: 1, z: 0 } : { x: 0, z: 1 }
	if ((!ddi && from !== 'r' && to !== 'r') || (from === 'r' && to === 'r')) return line(a, d, 1)
	const handle = from !== 'r' && to !== 'r' ? 11 : 12
	return bezier(a, point(a.x + fi.x * handle, a.z + fi.z * handle), point(d.x - ti.x * handle, d.z - ti.z * handle), d, 48)
}
function turnAt(from: Arm, to: Arm): Turn {
	if ((from === 'r' && to === 'r') || (from !== 'r' && to !== 'r')) return 'straight'
	return from === 'w' || to === 'w' ? 'right' : 'left'
}

/**
 * The two service designs share their motorway, ramps and route construction.
 * Changing the crossover connector and the central driving side produces DDI.
 * The FHWA comparison diagram deliberately ends at the ramp terminals: highway
 * merge/diverge points are outside that published 26/18/14-point boundary.
 */
export function buildServiceInterchange(ddi: boolean, includeRampThrough = !ddi, accelerationLanes = true, turnPockets = !ddi): Network {
	const id = ddi ? 'ddi' : 'diamond'
	const lanes: Lane[] = [],
		carriageways: Carriageway[] = [],
		movements: Movement[] = [],
		schematicMovements: SchematicMovement[] = []
	const addLane = (id: string, points: Vec3[], options: Partial<Lane> = {}) => {
		const result = lane(id, points, { speedLimit: 50 / 3.6, level: 0, width: WIDTH, kind: 'urban', next: [], ...options })
		lanes.push(result)
		return result
	}
	const road = (id: string, points: Vec3[], options: Partial<Carriageway> = {}) => {
		carriageways.push({
			id,
			points,
			laneCount: 1,
			laneWidth: WIDTH,
			speedLimit: 50 / 3.6,
			level: 0,
			bridge: false,
			kind: 'urban',
			shoulder: 0.4,
			...options,
		})
	}
	const main = (terminal: Terminal, laneIndex: number, segment: number) => `${terminal}-main-${laneIndex}-${segment}`
	for (const terminal of TERMINALS) {
		const direction = terminal === 'left' ? 1 : -1
		for (let index = 0; index < 2; index++) {
			const x = -(HIGHWAY_CENTER + (index - 0.5) * HIGHWAY_WIDTH) * direction
			for (let segment = 0; segment < 3; segment++) {
				const bounds = [-1500, -450, 450, 1500]
				const points = line(point(x, bounds[segment] * direction), point(x, bounds[segment + 1] * direction), 8).map((p) => ({
					...p,
					y: highwayElevation(p.z),
				}))
				const l = addLane(main(terminal, index, segment), points, { kind: 'main', width: HIGHWAY_WIDTH, level: 1, speedLimit: 100 / 3.6 })
				if (segment === 0) l.entry = terminal === 'left' ? 'north' : 'south'
				if (segment === 2) l.exit = terminal === 'left' ? 'south' : 'north'
				if (index) l.left = main(terminal, 0, segment)
				else l.right = main(terminal, 1, segment)
			}
		}
		road(
			`${terminal}-highway`,
			line(point(-HIGHWAY_CENTER * direction, -1500 * direction), point(-HIGHWAY_CENTER * direction, 1500 * direction), 8).map((p) => ({
				...p,
				y: highwayElevation(p.z),
			})),
			{ kind: 'main', laneCount: 2, laneWidth: HIGHWAY_WIDTH, shoulder: 3, level: 1, bridge: true, speedLimit: 100 / 3.6 },
		)

		const offStart = point(-OUTER, -450, highwayElevation(-450)),
			offEnd = transform(port('r', true, ddi), 'left')
		const off = bezier(offStart, point(-OUTER, -280, offStart.y), point(-HALF_SPACING, -165, GROUND), offEnd, 100).map((p) =>
			terminal === 'left' ? p : point(-p.x, -p.z, p.y),
		)
		const onStart = transform(port('r', false, ddi), 'left'),
			onEnd = point(-OUTER, 450, highwayElevation(450))
		const on = bezier(onStart, point(-HALF_SPACING, 165, GROUND), point(-OUTER, 280, onEnd.y), onEnd, 100).map((p) =>
			terminal === 'left' ? p : point(-p.x, -p.z, p.y),
		)
		const rampGate = addLane(`${terminal}-r-in`, off, {
			kind: 'ramp',
			speedLimit: 45 / 3.6,
			signalGroups: ddi ? ['eastbound', 'westbound'] : ['ramps'],
			controlPoint: terminal,
			protectedTurn: ddi,
		})
		rampGate.stopLine = rampGate.length - 2
		rampGate.solid = [{ start: rampGate.length - 45, end: rampGate.length }]
		addLane(`${terminal}-r-out`, on, { kind: 'ramp', speedLimit: 50 / 3.6, merge: true })
		road(`${terminal}-off-ramp`, off, { kind: 'ramp', laneWidth: 3.5, shoulder: 1.1, bridge: false })
		road(`${terminal}-on-ramp`, on, { kind: 'ramp', laneWidth: 3.5, shoulder: 1.1, bridge: false })

		const outerIn = transform(port('w', true, ddi), terminal),
			outerOut = transform(port('w', false, ddi), terminal)
		const outerStart = point(direction * -800, outerIn.z),
			outerEnd = point(direction * -800, outerOut.z)
		const gate = addLane(`${terminal}-w-in`, line(outerStart, outerIn, 4), {
			entry: terminal === 'left' ? 'west' : 'east',
			signalGroups: ddi ? [terminal === 'left' ? 'eastbound' : 'westbound'] : ['arterial'],
			controlPoint: terminal,
			protectedTurn: ddi,
		})
		gate.stopLine = gate.length - 2
		gate.solid = [{ start: gate.length - 45, end: gate.length }]
		addLane(`${terminal}-w-out`, line(outerOut, outerEnd, 4), { exit: terminal === 'left' ? 'west' : 'east', controlPoint: terminal })
		if (ddi) {
			road(`${terminal}-outer-inbound`, line(outerStart, outerIn, 4), { oneWay: true })
			road(`${terminal}-outer-outbound`, line(outerOut, outerEnd, 4), { oneWay: true })
		} else road(`${terminal}-outer-arterial`, line(point(direction * -800, 0), point(direction * (-HALF_SPACING - HALF_NODE), 0)), { laneCount: 2 })

		for (const from of ARMS)
			for (const to of ARMS) {
				if (from === to && (from !== 'r' || !includeRampThrough)) continue
				const points = connection(from, to, ddi).map((p) => transform(p, terminal))
				const turn = turnAt(from, to),
					connectorId = `${terminal}-${from}${to}`
				addLane(connectorId, points, {
					kind: 'connector',
					speedLimit: turn === 'straight' ? 40 / 3.6 : 25 / 3.6,
					controlPoint: terminal,
					protectedTurn: ddi,
					turn,
				})
				if (ddi) road(`${connectorId}-pavement`, points, { kind: 'ramp', shoulder: 0.35, oneWay: true })
				const fromDirection =
					from === 'r'
						? terminal === 'left'
							? 'north'
							: 'south'
						: from === 'w'
							? terminal === 'left'
								? 'west'
								: 'east'
							: terminal === 'left'
								? 'east'
								: 'west'
				const name = MOVEMENT_NAMES[fromDirection][turn]
				schematicMovements.push({
					id: connectorId,
					name,
					from: `${terminal}-${from}-in`,
					to: `${terminal}-${to}-out`,
					turn,
					level: 0,
					signalGroup: ddi
						? from === 'r'
							? 'ramp-gap'
							: (from === 'w') === (terminal === 'left')
								? 'eastbound'
								: 'westbound'
						: from === 'r'
							? 'ramps'
							: 'arterial',
					points: joinPaths(
						line(transform(port(from, true, ddi, 46), terminal), points[0], 1),
						points,
						line(points.at(-1)!, transform(port(to, false, ddi, 46), terminal), 1),
					),
				})
			}
	}
	// Central links connect the two separately controlled terminals. In the DDI,
	// eastbound is north of the median and westbound south of it: left-side travel.
	for (const terminal of TERMINALS) {
		const other = terminal === 'left' ? 'right' : 'left'
		const start = transform(port('e', false, ddi), other),
			end = transform(port('e', true, ddi), terminal)
		const gate = addLane(`${terminal}-e-in`, line(start, end, 2), {
			signalGroups: ddi ? [terminal === 'left' ? 'westbound' : 'eastbound'] : ['arterial', 'arterial-left'],
			controlPoint: terminal,
			protectedTurn: ddi,
		})
		gate.stopLine = gate.length - 2
		gate.solid = [{ start: gate.length - 45, end: gate.length }]
		if (ddi) road(`${terminal}-central-oneway`, gate.points, { oneWay: true })
	}
	if (!ddi) road('central-arterial', line(point(-HALF_SPACING + HALF_NODE, 0), point(HALF_SPACING - HALF_NODE, 0)), { laneCount: 2 })

	const addMovement = (from: string, to: string, turn: Turn, route: string[], weight: number, suffix = '') => {
		movements.push({
			id: `${from}-${to}${suffix}`,
			name: MOVEMENT_NAMES[from][turn],
			from,
			to,
			turn,
			lanes: route,
			weight,
			priority: turn === 'straight' ? 2 : 1,
			signalGroup: from === 'east' || from === 'west' ? 'arterial' : 'ramps',
		})
		for (let i = 1; i < route.length; i++) {
			const previous = lanes.find((l) => l.id === route[i - 1])!
			if (!previous.next.includes(route[i])) previous.next.push(route[i])
		}
	}
	for (const terminal of TERMINALS) {
		const other = terminal === 'left' ? 'right' : 'left'
		const motorwayFrom = terminal === 'left' ? 'north' : 'south',
			motorwayTo = terminal === 'left' ? 'south' : 'north'
		const arterialFrom = terminal === 'left' ? 'west' : 'east',
			arterialTo = terminal === 'left' ? 'east' : 'west'
		for (let index = 0; index < 2; index++)
			addMovement(
				motorwayFrom,
				motorwayTo,
				'straight',
				[main(terminal, index, 0), main(terminal, index, 1), main(terminal, index, 2)],
				(includeRampThrough ? 0.62 : 0.65) / 2,
				`-main-${index}`,
			)
		addMovement(motorwayFrom, arterialFrom, 'right', [main(terminal, 1, 0), `${terminal}-r-in`, `${terminal}-rw`, `${terminal}-w-out`], 0.15)
		addMovement(
			motorwayFrom,
			arterialTo,
			'left',
			[main(terminal, 1, 0), `${terminal}-r-in`, `${terminal}-re`, `${other}-e-in`, `${other}-ew`, `${other}-w-out`],
			0.2,
		)
		if (includeRampThrough)
			addMovement(
				motorwayFrom,
				motorwayTo,
				'straight',
				[main(terminal, 1, 0), `${terminal}-r-in`, `${terminal}-rr`, `${terminal}-r-out`, main(terminal, 1, 2)],
				0.03,
				'-ramp-through',
			)
		addMovement(arterialFrom, arterialTo, 'straight', [`${terminal}-w-in`, `${terminal}-we`, `${other}-e-in`, `${other}-ew`, `${other}-w-out`], 0.6)
		addMovement(arterialFrom, motorwayTo, 'right', [`${terminal}-w-in`, `${terminal}-wr`, `${terminal}-r-out`, main(terminal, 1, 2)], 0.2)
		addMovement(
			arterialFrom,
			motorwayFrom,
			'left',
			[`${terminal}-w-in`, `${terminal}-we`, `${other}-e-in`, `${other}-er`, `${other}-r-out`, main(other, 1, 2)],
			0.2,
		)
	}
	// A second physical lane in each direction. The original IDs remain the
	// inside lane; right turns use the outside lane before the stop line.
	const outerId = (id: string) => `${id}-outer`
	const shift = (points: Vec3[], amount: number) =>
		points.map((p, i) => {
			const a = points[Math.max(0, i - 1)],
				b = points[Math.min(points.length - 1, i + 1)],
				length = Math.hypot(b.x - a.x, b.z - a.z) || 1
			return point(p.x - ((b.z - a.z) / length) * amount, p.z + ((b.x - a.x) / length) * amount, p.y)
		})
	for (const original of [...lanes].filter((l) => /-(w|e)-(in|out)$/.test(l.id))) {
		const outside = addLane(outerId(original.id), shift(original.points, WIDTH), {
			speedLimit: original.speedLimit,
			level: original.level,
			width: WIDTH,
			kind: original.kind,
			next: [],
			entry: original.entry,
			exit: original.exit,
			signalGroups: original.signalGroups,
			controlPoint: original.controlPoint,
			protectedTurn: original.protectedTurn,
			solid: original.solid,
			left: original.id,
		})
		original.right = outside.id
		if (original.stopLine !== undefined) outside.stopLine = outside.length - 2
	}
	for (const terminal of TERMINALS)
		for (const pair of ['we', 'ew']) {
			const original = lanes.find((l) => l.id === `${terminal}-${pair}`)!
			const start = lanes.find((l) => l.id === outerId(`${terminal}-${pair[0]}-in`))!.points.at(-1)!
			const destination = pair[1] === 'e' ? `${terminal === 'left' ? 'right' : 'left'}-e-in` : `${terminal}-w-out`
			const end = lanes.find((l) => l.id === outerId(destination))!.points[0]
			const points = original.points.map((p, i) => {
				const t = i / (original.points.length - 1),
					a = original.points[0],
					b = original.points.at(-1)!
				return point(p.x + (start.x - a.x) * (1 - t) + (end.x - b.x) * t, p.z + (start.z - a.z) * (1 - t) + (end.z - b.z) * t, p.y)
			})
			addLane(outerId(original.id), points, {
				speedLimit: original.speedLimit,
				level: original.level,
				width: WIDTH,
				kind: original.kind,
				next: [],
				controlPoint: original.controlPoint,
				protectedTurn: original.protectedTurn,
				turn: original.turn,
			})
			if (ddi) road(`${original.id}-outer-pavement`, points, { kind: 'ramp', oneWay: true, shoulder: 0.35 })
		}
	// Through O-D routes now have two independently driven lane paths.
	for (const m of [...movements].filter((m) => (m.from === 'west' && m.to === 'east') || (m.from === 'east' && m.to === 'west'))) {
		m.weight = (m.weight ?? 1) / 2
		addMovement(m.from, m.to, m.turn, m.lanes.map(outerId), m.weight, '-outer')
	}
	// Shift the physical right-turn entrance to the outside arterial lane.
	for (const terminal of TERMINALS) {
		const connector = lanes.find((l) => l.id === `${terminal}-wr`)!,
			oldStart = connector.points[0],
			start = lanes.find((l) => l.id === outerId(`${terminal}-w-in`))!.points.at(-1)!
		connector.points = connector.points.map((p, i) => {
			const t = i / (connector.points.length - 1)
			return point(p.x + (start.x - oldStart.x) * (1 - t), p.z + (start.z - oldStart.z) * (1 - t), p.y)
		})
		const rebuilt = lane(connector.id, connector.points, {
			speedLimit: connector.speedLimit,
			level: 0,
			width: WIDTH,
			kind: 'connector',
			next: connector.next,
		})
		connector.length = rebuilt.length
		connector.cumulative = rebuilt.cumulative
		const formerApproach = lanes.find((l) => l.id === `${terminal}-w-in`)!
		formerApproach.next = formerApproach.next.filter((id) => id !== connector.id)
		const pavement = carriageways.find((c) => c.id === `${connector.id}-pavement`)
		if (pavement) pavement.points = connector.points
		for (const m of movements) if (m.lanes.includes(connector.id)) m.lanes = m.lanes.map((id) => (id === `${terminal}-w-in` ? outerId(id) : id))
	}
	// Rebuild successor links after the lane assignment, without creating fake
	// junction jumps; adjacent lanes remain available to MOBIL upstream.
	for (const m of movements)
		for (let i = 1; i < m.lanes.length; i++) {
			const before = lanes.find((l) => l.id === m.lanes[i - 1])!
			if (!before.next.includes(m.lanes[i])) before.next.push(m.lanes[i])
		}
	for (const c of carriageways) {
		if (c.id.endsWith('outer-arterial') || c.id === 'central-arterial') c.laneCount = 4
		if (ddi && (c.id.includes('outer-inbound') || c.id.includes('outer-outbound') || c.id.includes('central-oneway'))) {
			c.points = shift(c.points, WIDTH / 2)
			c.laneCount = 2
		}
	}
	const network: Network = {
		id,
		lanes,
		carriageways,
		movements,
		schematicMovements,
		weaving: [],
		measurementArea: { minX: -165, maxX: 165, minZ: -470, maxZ: 470 },
		control: {
			kind: 'signal',
			phases: ddi
				? [
						{ id: 'eastbound', groups: ['eastbound'], green: 27, yellow: 3, allRed: 2 },
						{ id: 'westbound', groups: ['westbound'], green: 27, yellow: 3, allRed: 2 },
					]
				: [
						{ id: 'arterial', groups: ['arterial'], green: 40, yellow: 3, allRed: 2 },
						{ id: 'arterial-left', groups: ['arterial-left'], green: 12, yellow: 3, allRed: 2 },
						{ id: 'ramps', groups: ['ramps'], green: 38, yellow: 3, allRed: 2 },
					],
		},
		urbanJunctions: TERMINALS.map((terminal) => ({
			id: terminal,
			position: point(terminal === 'left' ? -HALF_SPACING : HALF_SPACING, 0),
			arms: (['north', 'east', 'south', 'west'] as const).map((direction) => ({
				direction,
				halfWidth: direction === 'north' || direction === 'south' ? 2.15 : ddi ? 11.65 : 7.4,
				reach: 45,
			})),
			cornerRadius: ddi ? 18 : 12,
		})),
	}
	if (turnPockets) addDiamondTurnPockets(network)
	if (ddi) addDDIRampStorage(network)
	if (accelerationLanes) addAccelerationLanes(network)
	network.defaultOD = createDefaultOD(network, { urbanTurnShares: { left: .1, straight: .8, right: .1 } })
	return network
}

/** A short two-lane off-ramp flare separates the two receiving queues. Without
 * it a left-turn driver waiting for central-link storage traps every right turn
 * behind it, despite those cars having an independent receiving carriageway. */
function addDDIRampStorage(network: Network) {
  const byId = new Map(network.lanes.map(item => [item.id, item]))
  const refresh = (item: Lane) => { item.cumulative = cumulativeLengths(item.points); item.length = item.cumulative.at(-1)! }
  for (const terminal of TERMINALS) {
    const original = byId.get(`${terminal}-r-in`)!, length = original.length, splitAt = length - 110
    const samples = Array.from({ length: 45 }, (_, i) => sampleLane(original, splitAt + 110 * i / 44))
    const leftPoints = samples.map(sample => sample.position)
    const rightPoints = samples.map((sample, i) => {
      const offset = WIDTH * smoothstep(Math.min(1, i / 16))
      return point(sample.position.x - sample.tangent.z * offset, sample.position.z + sample.tangent.x * offset, sample.position.y)
    })
    const leftId = `${terminal}-r-left-bay`, rightId = `${terminal}-r-right-bay`
    for (const [id, points, next] of [[leftId, leftPoints, `${terminal}-re`], [rightId, rightPoints, `${terminal}-rw`]] as const) {
      const bay = lane(id, points, { kind: 'ramp', width: WIDTH, level: 0, speedLimit: original.speedLimit, next: [next], signalGroups: original.signalGroups, protectedTurn: true, controlPoint: terminal })
      bay.stopLine = bay.length - 2; network.lanes.push(bay)
    }
    const connector = byId.get(`${terminal}-rw`)!, oldStart = connector.points[0], newStart = rightPoints.at(-1)!
    connector.points = connector.points.map((p, i) => { const t = 1 - i / (connector.points.length - 1); return point(p.x + (newStart.x - oldStart.x) * t, p.z + (newStart.z - oldStart.z) * t, p.y) })
    refresh(connector)
    const pavement = network.carriageways.find(item => item.id === `${terminal}-rw-pavement`)!
    pavement.points = connector.points
    original.points = [...original.points.filter((_, i) => original.cumulative![i] < splitAt), leftPoints[0]]; refresh(original)
    original.next = [leftId, rightId]; delete original.signalGroups; delete original.stopLine; delete original.solid
    for (const movement of network.movements) {
      const at = movement.lanes.indexOf(original.id)
      if (at >= 0) movement.lanes.splice(at + 1, 0, movement.lanes[at + 1] === `${terminal}-rw` ? rightId : leftId)
    }
    const road = network.carriageways.find(item => item.id === `${terminal}-off-ramp`)!
    road.points = original.points
    network.carriageways.push({ ...road, id: `${terminal}-off-ramp-flare`, points: leftPoints.map((p, i) => point((p.x + rightPoints[i].x) / 2, (p.z + rightPoints[i].z) / 2, p.y)), laneCount: 2 })
  }
}

/** Two running lanes each way, with short inside left pockets at the terminals.
 * The 210 m central link widens around its median; through traffic can pass a
 * permissive left-turn queue without needing an unrealistically small gap. */
function addDiamondTurnPockets(network: Network) {
  const byId = new Map(network.lanes.map(item => [item.id, item]))
  const refresh = (item: Lane) => { item.cumulative = cumulativeLengths(item.points); item.length = item.cumulative.at(-1)! }
  const endpoints = new Map<string, { oldStart: Vec3; oldEnd: Vec3 }>()
  for (const terminal of TERMINALS) for (const suffix of ['', '-outer']) {
    const item = byId.get(`${terminal}-e-in${suffix}`)!
    endpoints.set(item.id, { oldStart: item.points[0], oldEnd: item.points.at(-1)! })
    const sign = terminal === 'left' ? -1 : 1
    item.points = item.points.map(p => ({ ...p, z: p.z + sign * WIDTH }))
    refresh(item)
  }
  // Follow the shifted through-road ends inside each terminal's pavement.
  for (const connector of network.lanes.filter(item => item.kind === 'connector')) {
    const incoming = network.movements.find(m => m.lanes.includes(connector.id))
    if (!incoming) continue
    const at = incoming.lanes.indexOf(connector.id), before = byId.get(incoming.lanes[at - 1]), after = byId.get(incoming.lanes[at + 1])
    const oldA = before && endpoints.get(before.id), oldB = after && endpoints.get(after.id)
    const moveStart = oldA && !connector.id.endsWith('-er') ? before!.points.at(-1)!.z - oldA.oldEnd.z : 0
    const moveEnd = oldB ? after!.points[0].z - oldB.oldStart.z : 0
    if (moveStart || moveEnd) {
      connector.points = connector.points.map((p, i) => { const t = i / (connector.points.length - 1); return { ...p, z: p.z + moveStart * (1 - t) + moveEnd * t } })
      refresh(connector)
    }
  }
  for (const terminal of TERMINALS) {
    const original = byId.get(`${terminal}-e-in`)!, old = endpoints.get(original.id)!, length = original.length
    const split = sampleLane(original, length - 70).position, end = original.points.at(-1)!
    const throughId = `${terminal}-e-through`, leftId = `${terminal}-e-left-pocket`
    const through = lane(throughId, line(split, end, 3), { kind: 'urban', width: WIDTH, level: 0, speedLimit: original.speedLimit, signalGroups: original.signalGroups, controlPoint: terminal, next: [`${terminal}-ew`], left: leftId, right: `${terminal}-e-in-outer`, solid: [{ start: 25, end: 70 }] })
    refresh(through); through.stopLine = through.length - 2
    const heading = terminal === 'left' ? -1 : 1
    const pocketPoints = bezier(split, point(split.x + heading * 25, split.z), point(old.oldEnd.x - heading * 25, old.oldEnd.z), old.oldEnd, 48)
    const pocket = lane(leftId, pocketPoints, { kind: 'urban', width: WIDTH, level: 0, speedLimit: 40 / 3.6, next: [`${terminal}-er`], signalGroups: ['arterial', 'arterial-left'], controlPoint: terminal, solid: [{ start: 25, end: 75 }] })
    pocket.stopLine = pocket.length - 2
    original.points = line(original.points[0], split, 3); refresh(original)
    original.next = [throughId, leftId]; delete original.signalGroups; delete original.stopLine; delete original.solid
    network.lanes.push(through, pocket)
    for (const movement of network.movements) {
      const at = movement.lanes.indexOf(original.id)
      if (at >= 0) movement.lanes.splice(at + 1, 0, movement.lanes[at + 1] === `${terminal}-er` ? leftId : throughId)
    }
  }
  const road = network.carriageways.find(item => item.id === 'central-arterial')!
  road.laneCount = 6
  for (const junction of network.urbanJunctions ?? []) for (const arm of junction.arms) if (arm.direction === (junction.id === 'left' ? 'east' : 'west')) arm.halfWidth = 10.9
}

export const diamond: DesignSpec = {
	id: 'diamond',
	name: '菱形立交',
	nameEn: 'Diamond interchange',
	chapter: 2,
	description: '高速跨过主干道。四条匝道把转向交给两端的信号路口，两个路口要一起协调。',
	defaultDemand: 300,
	camera: { position: { x: 285, y: 225, z: 310 }, target: { x: 0, y: 0, z: 0 }, fov: 45 },
	build: () => buildServiceInterchange(false),
}
