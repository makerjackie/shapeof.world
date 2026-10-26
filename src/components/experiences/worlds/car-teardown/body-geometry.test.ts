import {describe, expect, it} from 'vitest'
import {bodySide, fasciaX, createBodyCap} from './body-geometry'
import {BODY_GEOMETRY as B} from './vehicle-spec'
describe('retained procedural body cap tooling', () => {
	it('joins the loft at both cap rims without a vertical gap', () => {
		for (const front of [false, true]) {
			const row = front ? B.sections.at(-1)! : B.sections[0]
			for (let i = 0; i <= 30; i++) {
				const y = row[4] + ((row[1] - row[4]) * i) / 30
				const z = bodySide(row[0], y).z
				expect(fasciaX(y, z, front)).toBeCloseTo(row[0], 7)
			}
			for (const y of [row[4], row[1]]) expect(fasciaX(y, 0, front)).toBeCloseTo(row[0], 7)
		}
	})
	it('keeps both ends inside the specified overhangs and produces finite normals', () => {
		for (const front of [false, true]) {
			const geometry = createBodyCap(front),
				positions = geometry.attributes.position,
				normals = geometry.attributes.normal
			for (let i = 0; i < positions.count; i++) {
				expect(positions.getX(i)).toBeLessThanOrEqual(B.envelope.front + 1e-6)
				expect(positions.getX(i)).toBeGreaterThanOrEqual(B.envelope.rear - 1e-6)
				expect(Number.isFinite(normals.getX(i) + normals.getY(i) + normals.getZ(i))).toBe(true)
			}
			geometry.dispose()
		}
	})
})
