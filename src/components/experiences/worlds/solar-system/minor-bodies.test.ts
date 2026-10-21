import { describe, expect, it } from 'vitest'
import records from './minor-data.json'
import { orbitalPosition } from './orbital-model'
describe('frozen small-body orbits', () => {
	it('places even nearly parabolic comets at the correct perihelion and aphelion', () => {
		for (const b of records) {
			const atPerihelion = b.perihelionDays - b.epochDays
			const q = Math.hypot(...orbitalPosition(b.elements, atPerihelion, b.periodDays))
			const Q = Math.hypot(...orbitalPosition(b.elements, atPerihelion + b.periodDays / 2, b.periodDays))
			expect(q / b.elements.a, b.id).toBeCloseTo(1 - b.elements.e, 4)
			expect(Q / b.elements.a, b.id).toBeCloseTo(1 + b.elements.e, 4)
		}
	})
	it('preserves the high-inclination retrograde orbit of Halley', () => {
		const b = records.find((b) => b.id === 'halley')!
		expect(b.elements.i).toBeGreaterThan(90)
		const p = orbitalPosition(b.elements, 0, b.periodDays),
			q = orbitalPosition(b.elements, 0.01, b.periodDays)
		// Y-up angular momentum is negative for a retrograde orbit.
		expect(p[2] * q[0] - p[0] * q[2]).toBeLessThan(0)
	})
})
