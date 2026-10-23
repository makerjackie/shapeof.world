import {describe, expect, it} from 'vitest'
import * as T from 'three'
import {
	createAxleHousing,
	createDifferentialResources,
	createRackTeeth,
	rackPinionQuaternion,
} from './differential-geometry'
import {COLUMN_AXIS, RACK_NORMAL, RACK_PINION_RADIUS} from './steering-model'
import {STEERING_GEOMETRY as G, VEHICLE_SPEC as S, TRANSMISSION_GEOMETRY as D} from './vehicle-spec'

describe('steering and differential working geometry', () => {
	it('builds a ring with clearance around the side gears and finite castings', () => {
		const geometries = {
			...createDifferentialResources(),
			housing: createAxleHousing(),
			rack: createRackTeeth(),
		}
		const ring = geometries.ring.attributes.position
		let minimumRadius = Infinity
		for (let i = 0; i < ring.count; i++)
			minimumRadius = Math.min(minimumRadius, Math.hypot(ring.getX(i), ring.getY(i)))
		expect(minimumRadius).toBeGreaterThan(
			G.bevelModule * (S.transmission.differential.sideTeeth / 2 + 1),
		)
		for (const geometry of Object.values(geometries)) {
			const positions = geometry.attributes.position
			for (let i = 0; i < positions.count; i += 23)
				expect(Number.isFinite(positions.getX(i) + positions.getY(i) + positions.getZ(i))).toBe(
					true,
				)
			geometry.dispose()
		}
	})
	it('uses complementary pitch cones with the same pitch-line speed', () => {
		const sideRadius = (G.bevelModule * S.transmission.differential.sideTeeth) / 2
		const planetRadius = (G.bevelModule * S.transmission.differential.planetTeeth) / 2
		expect(Math.atan(sideRadius / planetRadius) + Math.atan(planetRadius / sideRadius)).toBeCloseTo(
			Math.PI / 2,
			12,
		)
		// Relative to the carrier, the right side gear rotates at +delta.
		// Both opposed planets rotate negatively about their own outward axes.
		for (const planetSide of [-1, 1]) {
			const delta = 3.7,
				contact = new T.Vector3(0, planetSide * sideRadius, planetRadius)
			const sideVelocity = new T.Vector3(0, 0, delta).cross(contact)
			const planetVelocity = new T.Vector3(
				0,
				(-planetSide * delta * sideRadius) / planetRadius,
				0,
			).cross(contact)
			expect(planetVelocity.x).toBeCloseTo(sideVelocity.x, 12)
		}
		const pinionRadius = (D.finalDriveModule * S.transmission.finalDrive.driver) / 2
		const ringRadius = (D.finalDriveModule * S.transmission.finalDrive.driven) / 2
		expect((pinionRadius * 41) / 11).toBeCloseTo(ringRadius, 12)
	})
	it('starts the differential tooth against a gap on every pitch cone', () => {
		// A 16-tooth side gear faces a tooth at +/-Y. A 10-tooth planet
		// faces a gap at +/-Y in its own XY plane, so no extra half-pitch is added.
		expect(Math.cos((Math.PI / 2) * S.transmission.differential.sideTeeth)).toBeCloseTo(1, 12)
		expect(Math.cos((Math.PI / 2) * S.transmission.differential.planetTeeth)).toBeCloseTo(-1, 12)
		// The reversed 41-tooth ring meets the pinion at its local -X gap.
		expect(Math.cos(Math.PI * S.transmission.finalDrive.driven)).toBeCloseTo(-1, 12)
		expect(Math.cos(0 * S.transmission.finalDrive.driver)).toBe(1)
	})
	it('orients the pinion shaft and rack pitch line orthogonally', () => {
		const quaternion = rackPinionQuaternion()
		expect(
			new T.Vector3(0, 0, 1).applyQuaternion(quaternion).distanceTo(new T.Vector3(...COLUMN_AXIS)),
		).toBeLessThan(1e-12)
		expect(
			new T.Vector3(0, 1, 0).applyQuaternion(quaternion).distanceTo(new T.Vector3(...RACK_NORMAL)),
		).toBeLessThan(1e-12)
		const fullTravel = (RACK_PINION_RADIUS * S.steering.maxSteeringWheelAngle * Math.PI) / 180
		expect(fullTravel).toBeCloseTo(0.084823, 6)
		expect(2 * fullTravel).toBeLessThan(G.rackTeeth * Math.PI * G.rackModule)
	})
})
