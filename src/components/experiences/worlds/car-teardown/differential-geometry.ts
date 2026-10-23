import * as T from 'three'
import {createInvoluteGearGeometry} from './gear-geometry'
import {createFinalDriveGear} from './transmission-geometry'
import {STEERING_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'
import {COLUMN_AXIS, PINION_POSITION, RACK_NORMAL, RACK_PINION_RADIUS} from './steering-model'

/** Involute transverse flanks lofted along complementary pitch cones. These
 * are straight-bevel teaching geometry, not production hypoid tooth surfaces. */
export function createDifferentialBevel(teeth: number, mateTeeth: number, bore: number) {
	const radius = (G.bevelModule * teeth) / 2,
		cone = Math.atan(teeth / mateTeeth)
	const distance = radius / Math.sin(cone),
		axial = distance * Math.cos(cone)
	const inner = 1 - G.bevelFaceWidth / distance,
		thickness = axial * (1 - inner)
	const geometry = createInvoluteGearGeometry(
		{teeth, module: G.bevelModule, backlash: G.bevelBacklash},
		thickness,
		bore,
	)
	const p = geometry.attributes.position
	for (let i = 0; i < p.count; i++) {
		const f = inner + (p.getZ(i) / thickness + 0.5) * (1 - inner)
		p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, axial * f)
	}
	geometry.computeVertexNormals()
	geometry.computeBoundingBox()
	geometry.computeBoundingSphere()
	return geometry
}
export function createDifferentialResources() {
	const d = S.transmission.differential,
		final = S.transmission.finalDrive
	return {
		side: createDifferentialBevel(d.sideTeeth, d.planetTeeth, G.sideGearBore),
		planet: createDifferentialBevel(d.planetTeeth, d.sideTeeth, G.planetGearBore),
		ring: createFinalDriveGear(final.driven, final.driver, G.carrierRadius).rotateY(Math.PI),
		pinion: createFinalDriveGear(final.driver, final.driven, G.halfshaftRadius * 0.6).rotateY(
			Math.PI / 2,
		),
	}
}
export function createAxleHousing() {
	const half = S.wheels.rearTrack / 2 - G.axleTubeInset
	const profile: [number, number][] = [
		[G.axleTubeRadius, -half],
		[G.axleTubeRadius, -G.axleHousingLength],
		[G.axleHousingRadius * 0.72, -G.axleHousingLength * 0.6],
		[G.axleHousingRadius, -G.axleHousingLength * 0.25],
		[G.axleHousingRadius, G.axleHousingLength * 0.25],
		[G.axleHousingRadius * 0.72, G.axleHousingLength * 0.6],
		[G.axleTubeRadius, G.axleHousingLength],
		[G.axleTubeRadius, half],
	]
	const points = [
		...profile,
		...profile
			.slice()
			.reverse()
			.map(([r, z]) => [r - G.axleHousingWall, z] as [number, number]),
		profile[0],
	]
	return new T.LatheGeometry(
		points.map(([r, z]) => new T.Vector2(r, z)),
		72,
	).rotateX(Math.PI / 2)
}
/** Rack teeth are the straight-sided limit of an involute gear (20° pressure angle). */
export function createRackTeeth() {
	const pitch = Math.PI * G.rackModule,
		pressure = (G.rackPressureAngle * Math.PI) / 180
	const tip = G.rackModule,
		root = -1.25 * G.rackModule,
		halfPitch = pitch / 4
	const vertices: number[] = [],
		indices: number[] = []
	for (let tooth = 0; tooth < G.rackTeeth; tooth++) {
		const u = G.pinionZ + (tooth - (G.rackTeeth - 1) / 2) * pitch
		const shape = [
			[-halfPitch + root * Math.tan(pressure), root],
			[-halfPitch + tip * Math.tan(pressure), tip],
			[halfPitch - tip * Math.tan(pressure), tip],
			[halfPitch - root * Math.tan(pressure), root],
		]
		const offset = vertices.length / 3
		for (const side of [-1, 1])
			for (const [du, height] of shape) {
				const v = G.rackRadius + height,
					w = (side * G.rackToothWidth) / 2
				vertices.push(
					S.steering.rackPosition[0] + v * RACK_NORMAL[0] + w * COLUMN_AXIS[0],
					S.steering.rackPosition[1] + v * RACK_NORMAL[1] + w * COLUMN_AXIS[1],
					u + du,
				)
			}
		for (const face of [
			[0, 2, 1],
			[0, 3, 2],
			[4, 5, 6],
			[4, 6, 7],
			[0, 1, 5],
			[0, 5, 4],
			[1, 2, 6],
			[1, 6, 5],
			[2, 3, 7],
			[2, 7, 6],
			[3, 0, 4],
			[3, 4, 7],
		])
			indices.push(...face.map((i) => offset + i))
	}
	const geometry = new T.BufferGeometry()
	geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
	geometry.setIndex(indices)
	geometry.computeVertexNormals()
	return geometry
}
export function createRackPinion() {
	const geometry = createInvoluteGearGeometry(
		{teeth: G.pinionTeeth, module: G.rackModule, pressureAngle: G.rackPressureAngle},
		G.pinionWidth,
		G.shaftRadius * 0.45,
	)
	return geometry
}
/** Local X follows the rack, local Y points down to the pinion, Z is the shaft. */
export function rackPinionQuaternion() {
	const matrix = new T.Matrix4().makeBasis(
		new T.Vector3(0, 0, 1),
		new T.Vector3(...RACK_NORMAL),
		new T.Vector3(...COLUMN_AXIS),
	)
	return new T.Quaternion().setFromRotationMatrix(matrix)
}
export {PINION_POSITION, RACK_PINION_RADIUS}
