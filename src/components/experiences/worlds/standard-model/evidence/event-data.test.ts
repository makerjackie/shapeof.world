import { describe, expect, it } from 'vitest'
import { cmsZmumuEvent, eventRay, invariantMassGeV, vectorMagnitude } from './event-data'

describe('CMS Z to two muons evidence extract', () => {
	it('recomputes the source invariant mass', () => {
		expect(invariantMassGeV(cmsZmumuEvent.muons)).toBeCloseTo(91.1845527329, 5)
	})
	it('preserves each momentum magnitude under z rotation', () => {
		for (const muon of cmsZmumuEvent.muons) {
			const atZero = eventRay(muon, 'transverse', 0)
			const atTurn = eventRay(muon, 'transverse', 1.7)
			expect(atZero.magnitude).toBeCloseTo(muon.pt, 8)
			expect(vectorMagnitude(muon)).toBeGreaterThan(muon.pt)
			expect(Math.hypot(atZero.x, atZero.y)).toBeCloseTo(Math.hypot(atTurn.x, atTurn.y), 8)
		}
	})
	it('uses a finite x-z projection with signed longitudinal momentum', () => {
		const [minus, plus] = cmsZmumuEvent.muons.map(muon => eventRay(muon, 'longitudinal', 0))
		expect(Math.hypot(minus.x, minus.y)).toBeGreaterThan(0)
		expect(Math.hypot(plus.x, plus.y)).toBeGreaterThan(0)
		expect(Math.sign(minus.y)).toBe(-1)
		expect(Math.sign(plus.y)).toBe(1)
	})
})
