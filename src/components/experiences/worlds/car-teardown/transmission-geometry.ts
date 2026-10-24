import * as T from 'three'
import { createInvoluteGearGeometry, gearDimensions, type GearParameters } from './gear-geometry'
import { freeGearAngle, type TransmissionState } from './transmission-model'
import { TRANSMISSION_GEOMETRY as G, VEHICLE_SPEC as S, type Gear } from './vehicle-spec'

const TR = S.transmission
const HALF_PI = Math.PI / 2
export const GEARBOX_CENTRE_DISTANCE = gearDimensions({
	teeth: TR.constantMesh.driver + TR.constantMesh.driven,
	helixAngle: TR.helixAngle,
}).pitchRadius
export const LAYSHAFT_Y = TR.axisY - GEARBOX_CENTRE_DISTANCE

/** Intersection of pitch-centre circles: the reverse idler is not placed by eye. */
export function reverseIdlerCentre(): [number, number] {
	// Reverse shares the forward train's normal module and helix magnitude.
	// Sum transverse pitch radii, not spur radii, for each idler mesh.
	const pitchRadius = (teeth: number) =>
		gearDimensions({ teeth, helixAngle: TR.helixAngle }).pitchRadius
	const a = pitchRadius(TR.gears.R.driver) + pitchRadius(G.reverseIdlerTeeth)
	const b = pitchRadius(TR.gears.R.driven) + pitchRadius(G.reverseIdlerTeeth)
	const c = GEARBOX_CENTRE_DISTANCE
	const yFromLayshaft = (a * a - b * b + c * c) / (2 * c)
	return [LAYSHAFT_Y + yFromLayshaft, Math.sqrt(a * a - yFromLayshaft * yFromLayshaft)]
}

export type GearNode = GearParameters & {
	id: string
	x: number
	y: number
	z: number
	phase: number
	shaft: 'input' | 'layshaft' | 'free' | 'idler'
	gear?: Exclude<Gear, 'N'>
}

function createGearNodes(): GearNode[] {
	const h = TR.helixAngle
	const nodes: GearNode[] = [
		{
			id: 'gearbox-input-gear',
			teeth: TR.constantMesh.driver,
			x: G.stations.primary,
			y: TR.axisY,
			z: 0,
			phase: -HALF_PI,
			shaft: 'input',
			helixAngle: h,
		},
		{
			id: 'gearbox-primary-driven',
			teeth: TR.constantMesh.driven,
			x: G.stations.primary,
			y: LAYSHAFT_Y,
			z: 0,
			phase: HALF_PI - Math.PI / TR.constantMesh.driven,
			shaft: 'layshaft',
			helixAngle: -h,
		},
	]
	for (const gear of [1, 2, 3, 5] as const) {
		const pair = TR.gears[gear]
		nodes.push(
			{
				id: `gearbox-driver-${gear}`,
				teeth: pair.driver,
				x: G.stations[gear],
				y: LAYSHAFT_Y,
				z: 0,
				phase: HALF_PI,
				shaft: 'layshaft',
				gear,
				helixAngle: h,
			},
			{
				id: `gearbox-free-${gear}`,
				teeth: pair.driven,
				x: G.stations[gear],
				y: TR.axisY,
				z: 0,
				phase: -HALF_PI - Math.PI / pair.driven,
				shaft: 'free',
				gear,
				helixAngle: -h,
			},
		)
	}
	const [iy, iz] = reverseIdlerCentre()
	// In the YZ plane, local polar zero points to -Z after the mesh's Y rotation.
	const driverTowardIdler = Math.atan2(iy - LAYSHAFT_Y, -iz)
	const idlerTowardOutput = Math.atan2(TR.axisY - iy, iz)
	const idlerPhase = driverTowardIdler + Math.PI - Math.PI / G.reverseIdlerTeeth
	const outputPhase =
		idlerTowardOutput +
		Math.PI -
		Math.PI / TR.gears.R.driven -
		((idlerPhase - idlerTowardOutput) * G.reverseIdlerTeeth) / TR.gears.R.driven
	nodes.push(
		{
			id: 'gearbox-driver-R',
			teeth: TR.gears.R.driver,
			x: G.stations.R,
			y: LAYSHAFT_Y,
			z: 0,
			phase: driverTowardIdler,
			shaft: 'layshaft',
			gear: 'R',
			helixAngle: h,
		},
		{
			id: 'gearbox-reverse-idler',
			teeth: G.reverseIdlerTeeth,
			x: G.stations.R,
			y: iy,
			z: iz,
			phase: idlerPhase,
			shaft: 'idler',
			helixAngle: -h,
		},
		{
			id: 'gearbox-free-R',
			teeth: TR.gears.R.driven,
			x: G.stations.R,
			y: TR.axisY,
			z: 0,
			phase: outputPhase,
			shaft: 'free',
			gear: 'R',
			helixAngle: h,
		},
	)
	return nodes.map((node) => ({ ...node, backlash: G.gearBacklash }))
}
export const GEARBOX_GEARS = createGearNodes()
export const GEARBOX_MESH_PAIRS = [
	['gearbox-input-gear', 'gearbox-primary-driven'],
	...[1, 2, 3, 5].map((gear) => [`gearbox-driver-${gear}`, `gearbox-free-${gear}`]),
	['gearbox-driver-R', 'gearbox-reverse-idler'],
	['gearbox-reverse-idler', 'gearbox-free-R'],
] as const

export function gearboxGearAngle(
	node: GearNode,
	state: Pick<TransmissionState, 'inputAngle' | 'layshaftAngle'>,
): number {
	const rotation =
		node.shaft === 'input'
			? state.inputAngle
			: node.shaft === 'layshaft'
				? state.layshaftAngle
				: node.shaft === 'idler'
					? (-state.layshaftAngle * TR.gears.R.driver) / G.reverseIdlerTeeth
					: freeGearAngle(state.inputAngle, node.gear!)
	return rotation + node.phase
}

export function createGearboxGear(node: GearNode): T.BufferGeometry {
	return createInvoluteGearGeometry(node, G.gearWidth, G.gearBore).rotateY(HALF_PI)
}

/** Hollow shaft/sleeve, axis X; the bore stays a physical opening in X-ray. */
export function createAnnulus(outer: number, inner: number, width: number): T.BufferGeometry {
	const profile = [
		new T.Vector2(outer, -width / 2),
		new T.Vector2(outer, width / 2),
		new T.Vector2(inner, width / 2),
		new T.Vector2(inner, -width / 2),
		new T.Vector2(outer, -width / 2),
	]
	return new T.LatheGeometry(profile, 64).rotateZ(-HALF_PI)
}

/** Rounded casting with a closed wall section, a tail bearing neck and front flange. */
export function createGearboxCase(section?: 'front' | 'rear'): T.BufferGeometry {
	let outer: [number, number][] = [
		[G.caseHalfWidth * 0.58, G.caseRearX],
		[G.caseHalfWidth * 0.7, G.stations.R - G.gearWidth],
		[G.caseHalfWidth, G.stations.R],
		[G.caseHalfWidth, G.stations[1]],
		[G.caseHalfWidth * 1.08, G.stations[3]],
		[G.caseHalfWidth * 1.1, G.caseFrontX],
	]
	if (section) {
		const split = (G.caseRearX + G.caseFrontX) / 2
		const upperIndex = outer.findIndex(([, x]) => x >= split)
		const [r0, x0] = outer[upperIndex - 1],
			[r1, x1] = outer[upperIndex]
		const seam: [number, number] = [r0 + ((r1 - r0) * (split - x0)) / (x1 - x0), split]
		outer =
			section === 'front'
				? [seam, ...outer.slice(upperIndex)]
				: [...outer.slice(0, upperIndex), seam]
	}

	const profile = [
		...outer,
		...outer
			.slice()
			.reverse()
			.map(([r, x]) => [r - G.caseWall, x] as [number, number]),
		outer[0],
	]
	const geometry = new T.LatheGeometry(
		profile.map(([r, x]) => new T.Vector2(r, x)),
		64,
	)
	geometry.rotateZ(-HALF_PI)
	geometry.scale(1, (G.caseTop - G.caseBottom) / (2 * G.caseHalfWidth), 1)
	geometry.translate(0, TR.axisY + (G.caseTop + G.caseBottom) / 2, 0)
	return geometry
}

export function createBellHousing(): T.BufferGeometry {
	const front = G.inputFrontX
	const back = G.bellRearX
	const points = [
		[G.bellFrontRadius, front],
		[G.bellFrontRadius * 0.96, front - G.caseWall * 3],
		[G.bellRearRadius, back],
		[G.bellRearRadius - G.caseWall, back],
		[G.bellFrontRadius - G.caseWall, front],
		[G.bellFrontRadius, front],
	]
	return new T.LatheGeometry(
		points.map(([r, x]) => new T.Vector2(r, x)),
		64,
	)
		.rotateZ(-HALF_PI)
		.translate(0, TR.axisY, 0)
}

/**
 * Straight-bevel illustration: involute transverse sections lofted along the
 * two complementary pitch cones. This is not a manufactured hypoid tooth
 * surface; the internal differential and its detailed tooth contact are R3.
 * The cone apex is the rear-axle centre, local +Z is the gear's shaft axis.
 */
export function createFinalDriveGear(
	teeth: number,
	mateTeeth: number,
	bore: number,
): T.BufferGeometry {
	const pitchRadius = (G.finalDriveModule * teeth) / 2
	const pitchAngle = Math.atan(teeth / mateTeeth)
	const coneDistance = pitchRadius / Math.sin(pitchAngle)
	const outerAxial = coneDistance * Math.cos(pitchAngle)
	const innerFraction = 1 - G.finalDriveFaceWidth / coneDistance
	const thickness = outerAxial * (1 - innerFraction)
	const geometry = createInvoluteGearGeometry(
		{ teeth, module: G.finalDriveModule, backlash: G.gearBacklash },
		thickness,
		bore,
	)
	const positions = geometry.attributes.position
	for (let i = 0; i < positions.count; i++) {
		const f = innerFraction + (positions.getZ(i) / thickness + 0.5) * (1 - innerFraction)
		positions.setXYZ(i, positions.getX(i) * f, positions.getY(i) * f, outerAxial * f)
	}
	geometry.computeVertexNormals()
	geometry.computeBoundingBox()
	geometry.computeBoundingSphere()
	return geometry
}
