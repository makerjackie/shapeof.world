import { describe, expect, it } from 'vitest'
import { sampleHydrogenPosition } from './particle-model'

describe('hydrogen 1s measurements', () => {
	it('samples a normalized, isotropic distribution with mean radius 1.5 a₀', () => {
		let seed = 1234
		const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
		let radius = 0, x = 0, y = 0, z = 0
		for (let i = 0; i < 30000; i++) {
			const p = sampleHydrogenPosition(random)
			expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(p.r, 9)
			radius += p.r; x += p.x; y += p.y; z += p.z
		}
		expect(radius / 30000).toBeCloseTo(1.5, 1)
		for (const sum of [x, y, z]) expect(Math.abs(sum / 30000)).toBeLessThan(.025)
	})
	it('remains finite at random source boundaries', () => {
		for (const n of [0, 1]) for (const v of Object.values(sampleHydrogenPosition(() => n))) expect(Number.isFinite(v)).toBe(true)
	})
})
