import * as T from 'three'
import { BODY_TEARDOWN_SPEC as S, BODY_GEOMETRY as B } from './vehicle-spec'
type Point = readonly [number, number, number]
/** Sheet-metal box section, with broad faces and two visible spot-weld flanges.
 * A stable transverse frame avoids the twisting of a Frenet tube at straight spans. */
export function stampedBeam(points: readonly Point[], width: number, depth: number, taper = 1) {
	const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)))
	const positions: number[] = [],
		indices: number[] = []
	const steps = 48,
		corner = 3,
		profile: T.Vector2[] = []
	for (let k = 0; k < 4; k++)
		for (let j = 0; j <= corner; j++) {
			const angle = (k * Math.PI) / 2 + ((j / corner) * Math.PI) / 2
			profile.push(
				new T.Vector2(
					[0.39, -0.39, -0.39, 0.39][k] + Math.cos(angle) * 0.11,
					[0.34, 0.34, -0.34, -0.34][k] + Math.sin(angle) * 0.16,
				),
			)
		}
	// Rounded rectangle has planar spans between the corner samples.
	for (let i = 0; i <= steps; i++) {
		const t = i / steps,
			p = curve.getPoint(t),
			tangent = curve.getTangent(t).normalize()
		const reference = Math.abs(tangent.z) < 0.9 ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0)
		const wide = new T.Vector3().crossVectors(reference, tangent).normalize(),
			deep = new T.Vector3().crossVectors(tangent, wide).normalize()
		const w = width * T.MathUtils.lerp(1, taper, t)
		for (const q of profile) {
			const v = p
				.clone()
				.addScaledVector(wide, q.x * w)
				.addScaledVector(deep, q.y * depth)
			positions.push(v.x, v.y, v.z)
		}
	}
	const n = profile.length
	for (let i = 0; i < steps; i++)
		for (let j = 0; j < n; j++) {
			const a = i * n + j,
				b = i * n + ((j + 1) % n)
			indices.push(a, b, a + n, b, b + n, a + n)
		}
	const g = new T.BufferGeometry()
	g.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
	g.setIndex(indices)
	g.computeVertexNormals()
	return g
}
export function stampedFlange(
	points: readonly Point[],
	width: number,
	depth: number,
	taper = 1,
	side = 1,
) {
	const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
		p: number[] = [],
		idx: number[] = []
	for (let i = 0; i <= 48; i++) {
		const t = i / 48,
			c = curve.getPoint(t),
			tan = curve.getTangent(t).normalize(),
			ref = Math.abs(tan.z) < 0.9 ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0)
		const u = new T.Vector3().crossVectors(ref, tan).normalize(),
			v = new T.Vector3().crossVectors(tan, u).normalize(),
			w = width * T.MathUtils.lerp(1, taper, t)
		for (const edge of [0, S.structure.flangeWidth]) {
			const q = c
				.clone()
				.addScaledVector(u, side * (w / 2 + edge))
				.addScaledVector(v, -depth * 0.32)
			p.push(q.x, q.y, q.z)
		}
		if (i < 48) {
			const a = i * 2
			idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
		}
	}
	const g = new T.BufferGeometry()
	g.setAttribute('position', new T.Float32BufferAttribute(p, 3))
	g.setIndex(idx)
	g.computeVertexNormals()
	return g
}
export function stampedTower() {
	const Tspec = S.structure,
		r = Tspec.shockTowerRadius,
		h = Tspec.shockTowerHeight
	const profile = [
		[r * 1.22, -h / 2],
		[r * 1.12, -h / 2 + Tspec.towerLip],
		[r, h * 0.38],
		[r * 0.9, h * 0.5],
		[r * 0.72, h * 0.36],
		[r * 0.52, h * 0.12],
		[Tspec.towerBoreRadius, h * 0.08],
	]
	return new T.LatheGeometry(
		profile.map((p) => new T.Vector2(...p)),
		64,
	)
}
/** Beads are displaced into the sheet itself, rather than added as round rods. */
export function stampedFloor() {
	const U = B.unibody,
		nx = 160,
		nz = 64,
		p: number[] = [],
		idx: number[] = []
	for (let i = 0; i <= nx; i++)
		for (let j = 0; j <= nz; j++) {
			const x = U.floorX - U.floorLength / 2 + (U.floorLength * i) / nx,
				z = -U.floorWidth / 2 + (U.floorWidth * j) / nz
			const tunnel =
				U.tunnelHeight * Math.pow(Math.max(0, 1 - Math.pow(z / (U.tunnelWidth * 0.65), 2)), 0.6)
			const rib =
				U.beadRadius *
				0.9 *
				Math.pow(Math.max(0, Math.cos(((x - U.floorX) / U.beadSpacing) * Math.PI * 2)), 10) *
				(Math.abs(z) > U.tunnelWidth * 0.65 ? 1 : 0)
			p.push(x, U.floorY + tunnel + rib, z)
			if (i < nx && j < nz) {
				const a = i * (nz + 1) + j
				idx.push(a, a + 1, a + nz + 1, a + 1, a + nz + 2, a + nz + 1)
			}
		}
	const g = new T.BufferGeometry()
	g.setAttribute('position', new T.Float32BufferAttribute(p, 3))
	g.setIndex(idx)
	g.computeVertexNormals()
	return g
}
export function stampedBulkhead() {
	const g = new T.PlaneGeometry(S.structure.bulkheadWidth, S.structure.bulkheadHeight, 64, 32),
		p = g.getAttribute('position')
	for (let i = 0; i < p.count; i++) {
		const u = p.getX(i),
			v = p.getY(i),
			bead =
				S.structure.bulkheadBeadDepth *
				Math.pow(Math.max(0, Math.cos(u * S.structure.bulkheadBeadFrequency)), 8) *
				Math.sin(Math.PI * (v / S.structure.bulkheadHeight + 0.5)) ** 2
		p.setXYZ(i, S.structure.bulkheadX + bead, v + S.structure.bulkheadY, u)
	}
	g.computeVertexNormals()
	return g
}
