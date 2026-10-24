import { describe, expect, it } from 'vitest'
import {
	stampedBeam,
	stampedFlange,
	stampedFloor,
	stampedTower,
	stampedBulkhead,
} from './stamped-geometry'
import { BODY_GEOMETRY as B, BODY_TEARDOWN_SPEC as S } from './vehicle-spec'
describe('stamped body in white', () => {
	it('has broad straight box faces, a narrower top and weld flanges outside the box', () => {
		const points = [
				[0, 0, 0],
				[0, 1, 0],
			] as const,
			g = stampedBeam(points, 0.2, 0.1, 0.5),
			p = g.getAttribute('position'),
			n = p.count / 49
		const width = (row: number) => {
			const x = Array.from({ length: n }, (_, j) => p.getX(row * n + j))
			return Math.max(...x) - Math.min(...x)
		}
		expect(width(0)).toBeCloseTo(0.2)
		expect(width(48)).toBeCloseTo(0.1)
		// Four samples form each rounded corner. The span between corners is planar.
		expect(p.getZ(3)).toBeCloseTo(p.getZ(4))
		expect(Math.abs(p.getX(3) - p.getX(4))).toBeGreaterThan(0.15)
		const flange = stampedFlange(points, 0.2, 0.1, 0.5),
			f = flange.getAttribute('position')
		expect(Math.abs(f.getX(1)) - Math.abs(f.getX(0))).toBeCloseTo(S.structure.flangeWidth)
		g.dispose()
		flange.dispose()
	})
	it('forms the tunnel and beads from the floor sheet and leaves the strut bore open', () => {
		const floor = stampedFloor()
		floor.computeBoundingBox()
		expect(floor.boundingBox!.max.y).toBeCloseTo(B.unibody.floorY + B.unibody.tunnelHeight, 4)
		const tower = stampedTower(),
			p = tower.getAttribute('position')
		for (let i = 0; i < p.count; i++)
			expect(Math.hypot(p.getX(i), p.getZ(i))).toBeGreaterThanOrEqual(
				S.structure.towerBoreRadius - 1e-7,
			)
		for (const geometry of [floor, tower, stampedBulkhead()]) {
			for (const attribute of ['position', 'normal'])
				expect(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true)
			geometry.dispose()
		}
	})
})
