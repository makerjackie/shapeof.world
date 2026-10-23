import {describe, expect, it} from 'vitest'
import {brakePad, brakeRing, floatingCaliperBody} from './brake-geometry'
import {BRAKE_GEOMETRY as B, VEHICLE_SPEC as S} from './vehicle-spec'
import {BRAKE_PARTS} from './brake-parts'

const segmentRadius = (a: [number, number], b: [number, number]) => {
	const dx = b[0] - a[0],
		dy = b[1] - a[1]
	const t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)))
	return Math.hypot(a[0] + dx * t, a[1] + dy * t)
}

describe('brake geometry clearance', () => {
	for (const front of [true, false]) {
		const name = front ? 'front' : 'rear',
			spec = front ? S.brakes.front : S.brakes.rear
		it(`${name} caliper bridges go around the rotor rim rather than through its faces`, () => {
			const geometry = floatingCaliperBody(front),
				position = geometry.getAttribute('position')
			let bridges = 0
			for (let i = 0; i < position.count; i += 3) {
				const zs = [position.getZ(i), position.getZ(i + 1), position.getZ(i + 2)]
				if (Math.min(...zs) >= spec.thickness / 2 || Math.max(...zs) <= -spec.thickness / 2)
					continue
				const points = [0, 1, 2].map(
					(j) => [position.getX(i + j), position.getY(i + j)] as [number, number],
				)
				const nearest = Math.min(
					...points.map((point, j) => segmentRadius(point, points[(j + 1) % 3])),
				)
				expect(nearest).toBeGreaterThan(spec.diameter / 2 - 1e-6)
				bridges++
			}
			expect(bridges).toBeGreaterThan(0)
			geometry.dispose()
		})
		it(`${name} friction pad remains inside the disc friction annulus`, () => {
			const geometry = brakePad(front),
				position = geometry.getAttribute('position')
			for (let i = 0; i < position.count; i++) {
				const radius = Math.hypot(position.getX(i), position.getY(i))
				expect(radius).toBeGreaterThan(B.rotorInnerRadius)
				expect(radius).toBeLessThan(spec.diameter / 2)
			}
			geometry.dispose()
		})
	}
	it('leaves a ventilation channel between the two front faces', () => {
		const spec = S.brakes.front,
			geometry = brakeRing(B.rotorInnerRadius, spec.diameter / 2, B.rotorFaceThickness)
		geometry.computeBoundingBox()
		const faceDepth = geometry.boundingBox!.max.z - geometry.boundingBox!.min.z
		expect(faceDepth).toBeCloseTo(0.006, 8)
		expect(spec.thickness - 2 * faceDepth).toBeCloseTo(0.016, 8)
		expect(B.rotorHatRadius).toBeGreaterThan(B.rotorInnerRadius)
		geometry.dispose()
	})
	it('registers four individual caliper carriers and all eight guide pins', () => {
		const ids = new Set(BRAKE_PARTS.map((part) => part.id))
		for (let i = 1; i <= 4; i++) expect(ids.has(`caliper-bracket-${i}`)).toBe(true)
		for (let i = 1; i <= 8; i++) expect(ids.has(`brake-guide-pin-${i}`)).toBe(true)
		expect(ids.size).toBe(BRAKE_PARTS.length)
	})
})
