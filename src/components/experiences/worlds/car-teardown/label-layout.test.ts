import {describe, expect, it} from 'vitest'
import {layoutLeaders} from './label-layout'
describe('projected engineering leaders', () => {
	it('uses the projected side and preserves vertical order even with a crowded column', () => {
		const anchors = Array.from({length: 18}, (_, i) => ({
			id: String(i),
			x: i < 13 ? 450 + i * 3 : 850,
			y: 200 + ((i * 7) % 18) * 8,
			visible: true,
		}))
		const result = layoutLeaders(anchors, {top: 240, bottom: 800, gap: 48})
		expect(result).toHaveLength(18)
		for (const left of [true, false]) {
			const column = result.filter((a) => a.left === left)
			column.forEach((a, i) => {
				expect(a.labelY).toBeGreaterThanOrEqual(240)
				expect(a.labelY).toBeLessThanOrEqual(800)
				expect(a.x <= 650).toBe(left)
				if (i) {
					expect(a.y).toBeGreaterThanOrEqual(column[i - 1].y)
					expect(a.labelY).toBeGreaterThan(column[i - 1].labelY)
				}
			})
		}
	})
	it('omits off-camera anchors', () =>
		expect(
			layoutLeaders([{id: 'hidden', x: 0, y: 0, visible: false}], {top: 0, bottom: 100, gap: 10}),
		).toEqual([]))
})
