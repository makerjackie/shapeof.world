import {describe, expect, it} from 'vitest'
import {
	createInvoluteGearGeometry,
	gearDimensions,
	involuteAngle,
	involuteGearOutline,
	involuteGearShape,
	meshingPhase,
	toothHalfAngle,
} from './gear-geometry'

describe('involute gear generation', () => {
	it('places the involute on the base circle and the tooth thickness on the pitch circle', () => {
		const parameters = {teeth: 32, module: 0.002, pressureAngle: 20}
		const d = gearDimensions(parameters)
		expect(d.pitchRadius).toBeCloseTo(0.032, 12)
		expect(d.baseRadius).toBeCloseTo(0.032 * Math.cos((20 * Math.PI) / 180), 12)
		expect(involuteAngle(d.baseRadius, d.baseRadius)).toBe(0)
		// Half the circular pitch is tooth; the other half is space.
		expect(2 * toothHalfAngle(d.pitchRadius, parameters) * d.pitchRadius).toBeCloseTo(
			(Math.PI * parameters.module) / 2,
			12,
		)
		expect(toothHalfAngle(d.addendumRadius, parameters)).toBeLessThan(
			toothHalfAngle(d.baseRadius, parameters),
		)
	})

	it('gives every 54-tooth pair one common centre distance', () => {
		for (const [a, b] of [
			[22, 32],
			[15, 39],
			[21, 33],
			[26, 28],
			[35, 19],
		]) {
			const da = gearDimensions({teeth: a})
			const db = gearDimensions({teeth: b})
			expect(da.pitchRadius + db.pitchRadius).toBeCloseTo(0.054, 12)
		}
	})

	it('generates counterclockwise, curved flanks within the dedendum/addendum radii', () => {
		const parameters = {teeth: 26}
		const d = gearDimensions(parameters)
		const points = involuteGearOutline(parameters)
		let twiceArea = 0
		for (let i = 0; i < points.length; i++) {
			const p = points[i]
			const q = points[(i + 1) % points.length]
			expect(p.length()).toBeGreaterThanOrEqual(d.rootRadius - 1e-12)
			expect(p.length()).toBeLessThanOrEqual(d.addendumRadius + 1e-12)
			twiceArea += p.x * q.y - q.x * p.y
		}
		expect(twiceArea / 2).toBeGreaterThan(Math.PI * d.rootRadius ** 2)
		expect(twiceArea / 2).toBeLessThan(Math.PI * d.addendumRadius ** 2)
		// Adjacent samples on a real involute cannot all lie on a straight triangle edge.
		const [a, b, c] = points.slice(4, 7)
		const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
		expect(Math.abs(cross)).toBeGreaterThan(1e-12)
	})

	it('supports a real bore and finite, centred helical extrusion', () => {
		const parameters = {teeth: 32, helixAngle: 22}
		expect(involuteGearShape(parameters, 0.008).holes).toHaveLength(1)
		const geometry = createInvoluteGearGeometry(parameters, 0.018, 0.008)
		expect(geometry.boundingBox!.min.z).toBeCloseTo(-0.009, 8)
		expect(geometry.boundingBox!.max.z).toBeCloseTo(0.009, 8)
		const positions = geometry.attributes.position
		const normals = geometry.attributes.normal
		expect(positions.count).toBeGreaterThan(1000)
		for (let i = 0; i < positions.count; i += 31) {
			expect(Number.isFinite(positions.getX(i) + positions.getY(i) + positions.getZ(i))).toBe(true)
			expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5)
		}
		geometry.dispose()
	})

	it('uses normal-module geometry for the helical transverse section', () => {
		const d = gearDimensions({teeth: 32, module: 0.002, helixAngle: 22})
		expect(d.pitchRadius).toBeCloseTo(0.032 / Math.cos((22 * Math.PI) / 180), 12)
		expect(d.transversePressure).toBeGreaterThan((20 * Math.PI) / 180)
		// At the point facing the driver, the driven gear starts midway between teeth.
		expect((Math.PI - meshingPhase(32)) * 32).toBeCloseTo(Math.PI, 12)
	})

	it('rejects nonphysical inputs instead of returning corrupted geometry', () => {
		expect(() => gearDimensions({teeth: 0})).toThrow(RangeError)
		expect(() => gearDimensions({teeth: 20.5})).toThrow(RangeError)
		expect(() => gearDimensions({teeth: 20, module: -1})).toThrow(RangeError)
		expect(() => involuteGearShape({teeth: 20}, 1)).toThrow(RangeError)
		expect(() => createInvoluteGearGeometry({teeth: 20}, 0)).toThrow(RangeError)
	})
})
