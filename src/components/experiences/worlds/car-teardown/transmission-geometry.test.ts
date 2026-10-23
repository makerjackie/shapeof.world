import {describe, expect, it} from 'vitest'
import {Vector2} from 'three'
import {gearDimensions, involuteGearOutline} from './gear-geometry'
import {
	createGearboxGear,
	GEARBOX_CENTRE_DISTANCE,
	GEARBOX_GEARS,
	GEARBOX_MESH_PAIRS,
	gearboxGearAngle,
	type GearNode,
} from './transmission-geometry'
import {TRANSMISSION_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'

function section(node: GearNode, inputAngle: number, x: number) {
	const state = {inputAngle, layshaftAngle: (-inputAngle * 22) / 32}
	const twist =
		(x * Math.tan(((node.helixAngle ?? 0) * Math.PI) / 180)) / gearDimensions(node).pitchRadius
	const a = gearboxGearAngle(node, state) + twist
	return involuteGearOutline(node).map(
		(p) =>
			new Vector2(
				p.x * Math.cos(a) - p.y * Math.sin(a) - node.z,
				p.x * Math.sin(a) + p.y * Math.cos(a) + node.y,
			),
	)
}
const cross = (a: Vector2, b: Vector2, c: Vector2) =>
	(b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
function inside(point: Vector2, polygon: Vector2[]) {
	let yes = false
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i],
			b = polygon[j]
		if (
			a.y > point.y !== b.y > point.y &&
			point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
		)
			yes = !yes
	}
	return yes
}
/** Independent polygon collision check; does not inspect angular-ratio identities. */
function polygonsIntersect(a: Vector2[], b: Vector2[]) {
	const bounds = (ps: Vector2[]) => ({
		minX: Math.min(...ps.map((p) => p.x)),
		maxX: Math.max(...ps.map((p) => p.x)),
		minY: Math.min(...ps.map((p) => p.y)),
		maxY: Math.max(...ps.map((p) => p.y)),
	})
	const ab = bounds(a),
		bb = bounds(b)
	const inBounds = (p: Vector2, r: typeof ab) =>
		p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY
	for (const p of a) if (inBounds(p, bb) && inside(p, b)) return true
	for (const p of b) if (inBounds(p, ab) && inside(p, a)) return true
	for (let i = 0; i < a.length; i++) {
		const p = a[i],
			q = a[(i + 1) % a.length]
		if (
			Math.max(p.x, q.x) < bb.minX ||
			Math.min(p.x, q.x) > bb.maxX ||
			Math.max(p.y, q.y) < bb.minY ||
			Math.min(p.y, q.y) > bb.maxY
		)
			continue
		for (let j = 0; j < b.length; j++) {
			const r = b[j],
				s = b[(j + 1) % b.length]
			if (
				Math.max(p.x, q.x) < Math.min(r.x, s.x) ||
				Math.min(p.x, q.x) > Math.max(r.x, s.x) ||
				Math.max(p.y, q.y) < Math.min(r.y, s.y) ||
				Math.min(p.y, q.y) > Math.max(r.y, s.y)
			)
				continue
			if (cross(p, q, r) * cross(p, q, s) < -1e-24 && cross(r, s, p) * cross(r, s, q) < -1e-24)
				return true
		}
	}
	return false
}

describe('rendered helical gearbox meshes', () => {
	it('uses the same normal-module pitch distance for all forward pairs', () => {
		expect(GEARBOX_CENTRE_DISTANCE).toBeCloseTo(0.054 / Math.cos((22 * Math.PI) / 180), 12)
		for (const [aId, bId] of GEARBOX_MESH_PAIRS) {
			const a = GEARBOX_GEARS.find((n) => n.id === aId)!,
				b = GEARBOX_GEARS.find((n) => n.id === bId)!
			expect(Math.hypot(a.y - b.y, a.z - b.z)).toBeCloseTo(
				gearDimensions(a).pitchRadius + gearDimensions(b).pitchRadius,
				12,
			)
			expect((a.helixAngle ?? 0) + (b.helixAngle ?? 0)).toBe(0)
		}
	})
	it('does not intersect at the two faces or centre through a full input rotation', () => {
		for (const [aId, bId] of GEARBOX_MESH_PAIRS) {
			const a = GEARBOX_GEARS.find((n) => n.id === aId)!,
				b = GEARBOX_GEARS.find((n) => n.id === bId)!
			for (let sample = 0; sample < 37; sample++)
				for (const x of [-G.gearWidth / 2, 0, G.gearWidth / 2]) {
					const angle = (sample / 37) * Math.PI * 2
					expect(
						polygonsIntersect(section(a, angle, x), section(b, angle, x)),
						`${aId}/${bId}, input=${angle}, axial=${x}`,
					).toBe(false)
				}
		}
	}, 20000)
	it('generates finite real helical mesh vertices along the physical X axis', () => {
		const node = GEARBOX_GEARS.find((n) => n.id === 'gearbox-free-1')!
		const geometry = createGearboxGear(node)
		geometry.computeBoundingBox()
		expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(G.gearWidth, 7)
		const p = geometry.attributes.position
		for (let i = 0; i < p.count; i += 37)
			expect(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))).toBe(true)
		// The collision-tested sections must also be present in the actual GPU mesh.
		for (const x of [-G.gearWidth / 2, 0, G.gearWidth / 2]) {
			const candidates: Vector2[] = []
			for (let i = 0; i < p.count; i++)
				if (Math.abs(p.getX(i) - x) < 1e-7) {
					const u = -p.getZ(i),
						v = p.getY(i),
						a = node.phase
					candidates.push(
						new Vector2(
							u * Math.cos(a) - v * Math.sin(a) - node.z,
							u * Math.sin(a) + v * Math.cos(a) + node.y,
						),
					)
				}
			const outline = section(node, 0, x)
			for (let i = 0; i < outline.length; i += 23)
				expect(Math.min(...candidates.map((q) => q.distanceTo(outline[i])))).toBeLessThan(1e-7)
		}
		geometry.dispose()
	})
	it('detects an intentionally wrong half-tooth phase as a collision', () => {
		const a = GEARBOX_GEARS[0],
			b = GEARBOX_GEARS[1]
		expect(
			polygonsIntersect(
				section(a, 0, 0),
				section({...b, phase: b.phase + Math.PI / b.teeth}, 0, 0),
			),
		).toBe(true)
	})
	it('covers every specified gear and makes direct fourth without a fictitious ratio pair', () => {
		expect(GEARBOX_GEARS).toHaveLength(13)
		for (const node of GEARBOX_GEARS)
			expect(Math.abs(node.helixAngle ?? 0), `${node.id} must be helical`).toBe(S.transmission.helixAngle)
		expect(GEARBOX_GEARS.find((n) => n.id === 'gearbox-driver-4')).toBeUndefined()
		for (const gear of [1, 2, 3, 5, 'R'] as const) {
			expect(GEARBOX_GEARS.find((n) => n.id === `gearbox-driver-${gear}`)!.teeth).toBe(
				S.transmission.gears[gear].driver,
			)
			expect(GEARBOX_GEARS.find((n) => n.id === `gearbox-free-${gear}`)!.teeth).toBe(
				S.transmission.gears[gear].driven,
			)
		}
	})
})
