import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createBodyGeometry, createCabinGeometry } from './body-geometry'
import { createBodyPanelGeometry, type BodyPanelId } from './body-teardown-geometry'
import { BODY_TEARDOWN } from './body-teardown'
import { BODY_GEOMETRY as B, BODY_TEARDOWN_SPEC as S } from './vehicle-spec'
function area(g: THREE.BufferGeometry) {
	const p = g.attributes.position,
		ix = g.index,
		count = ix?.count ?? p.count
	let result = 0
	const a = new THREE.Vector3(),
		b = new THREE.Vector3(),
		c = new THREE.Vector3()
	for (let i = 0; i < count; i += 3) {
		a.fromBufferAttribute(p, ix ? ix.getX(i) : i)
		b.fromBufferAttribute(p, ix ? ix.getX(i + 1) : i + 1)
		c.fromBufferAttribute(p, ix ? ix.getX(i + 2) : i + 2)
		result += b.sub(a).cross(c.sub(a)).length() / 2
	}
	return result
}
describe('body panels follow original loft seams', () => {
	let panels: Map<BodyPanelId, THREE.BufferGeometry>
	beforeAll(() => {
		panels = createBodyPanelGeometry()
	})
	afterAll(() => panels.forEach((g) => g.dispose()))
	it('partitions both complete lofts without duplicated or missing surface area', () => {
		const shell = createBodyGeometry(),
			cabin = createCabinGeometry()
		const expected = area(shell) + area(cabin),
			actual = [...panels.values()].reduce((sum, g) => sum + area(g), 0)
		expect(actual).toBeCloseTo(expected, 4)
		shell.dispose()
		cabin.dispose()
	})
	it('has four separate door skins with seams at the hinges and B pillar', () => {
		for (const side of ['left', 'right'])
			for (const end of ['front', 'rear']) {
				const box = panels.get(`door-${end}-${side}` as BodyPanelId)!.boundingBox!
				expect(box.min.y).toBeCloseTo(B.rockerY, 5)
				expect(box.max.x).toBeCloseTo(end === 'front' ? B.doorFrontX : B.doorMiddleX, 5)
				if (end === 'front') expect(box.min.x).toBeCloseTo(B.doorMiddleX, 5)
			}
	})
	it('keeps cut normals finite and unit length across independent skins', () => {
		for (const geometry of panels.values()) {
			const normal = geometry.attributes.normal
			for (let i = 0; i < normal.count; i += 97) {
				const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))
				expect(Number.isFinite(length)).toBe(true)
				expect(length).toBeCloseTo(1, 5)
			}
		}
	})
	it('moves outer glass and doors beyond the stationary safety cage', () => {
		expect(S.door.angle).toBeCloseTo(Math.PI / 3)
		const closedEdge = new THREE.Vector3(B.doorMiddleX - B.doorFrontX, 0, 0).applyAxisAngle(
			new THREE.Vector3(0, 1, 0),
			S.door.angle,
		)
		expect(closedEdge.z + S.door.frontOutward).toBeGreaterThan(S.offsets.sideGlass[2])
		expect(S.offsets.roof[1]).toBeGreaterThan(S.offsets.seats[1] + B.interior.headrestSize[1])
		expect(S.offsets.frontBumper[0]).toBeGreaterThan(S.offsets.hood[0])
	})
	it('documents all three representative steel grades and each assembly card', () => {
		expect(S.steel.hot.strengthMPa).toBe(1500)
		expect(S.steel.high.strengthMinMPa).toBe(340)
		for (const part of BODY_TEARDOWN) {
			expect(part.name.zh && part.name.en).toBeTruthy()
			expect(part.material.zh && part.material.en).toBeTruthy()
			expect(part.description.zh && part.description.en).toBeTruthy()
			expect(part.count).toBeGreaterThan(0)
			expect(part.offset.every(Number.isFinite)).toBe(true)
			expect(part.partIds.length).toBeGreaterThan(0)
		}
		expect(new Set(BODY_TEARDOWN.map((p) => p.id)).size).toBe(BODY_TEARDOWN.length)
	})
})
