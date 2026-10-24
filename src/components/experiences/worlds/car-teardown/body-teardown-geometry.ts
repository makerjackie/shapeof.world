import * as THREE from 'three'
import { BODY_GEOMETRY as B, BODY_TEARDOWN_SPEC as S } from './vehicle-spec'
import { createBodyGeometry, createCabinGeometry } from './body-geometry'

type Vertex = { p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 }
type Polygon = Vertex[]
type Distance = (v: Vertex) => number
export type BodyPanelId =
	| 'hood'
	| 'trunk'
	| 'door-front-left'
	| 'door-front-right'
	| 'door-rear-left'
	| 'door-rear-right'
	| 'fender-left'
	| 'fender-right'
	| 'quarter-left'
	| 'quarter-right'
	| 'bumper-front'
	| 'bumper-rear'
	| 'sill'
	| 'roof'
	| 'cage'
	| 'windscreen'
	| 'backlight'
	| 'glass-front-left'
	| 'glass-front-right'
	| 'glass-rear-left'
	| 'glass-rear-right'
	| 'glass-quarter-left'
	| 'glass-quarter-right'
const interpolate = (a: Vertex, b: Vertex, t: number): Vertex => ({
	p: a.p.clone().lerp(b.p, t),
	n: a.n.clone().lerp(b.n, t).normalize(),
	uv: a.uv.clone().lerp(b.uv, t),
})
/** Cut the actual triangles and interpolate the original loft normals. Adjacent
 * parts therefore meet at exactly the same seam without a highlight discontinuity. */
function split(poly: Polygon, distance: Distance): [Polygon, Polygon] {
	const positive: Polygon = [],
		negative: Polygon = []
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i],
			b = poly[(i + 1) % poly.length],
			da = distance(a),
			db = distance(b)
		if (da >= 0) positive.push(a)
		if (da <= 0) negative.push(a)
		if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
			const p = interpolate(a, b, da / (da - db))
			positive.push(p)
			negative.push(p)
		}
	}
	return [positive, negative]
}
function rearSeam(y: number) {
	const rows = B.rearDoorSeam
	let index = 0
	while (index < rows.length - 2 && rows[index + 1][0] < y) index++
	const a = rows[index],
		b = rows[index + 1]
	return THREE.MathUtils.lerp(a[1], b[1], THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1))
}
function partition(
	source: THREE.BufferGeometry,
	distribute: (poly: Polygon, emit: (id: BodyPanelId, p: Polygon) => void) => void,
) {
	const output = new Map<BodyPanelId, { p: number[]; n: number[]; uv: number[] }>()
	const emit = (id: BodyPanelId, poly: Polygon) => {
		if (poly.length < 3) return
		if (!output.has(id)) output.set(id, { p: [], n: [], uv: [] })
		const data = output.get(id)!
		for (let i = 1; i < poly.length - 1; i++)
			for (const v of [poly[0], poly[i], poly[i + 1]]) {
				data.p.push(v.p.x, v.p.y, v.p.z)
				data.n.push(v.n.x, v.n.y, v.n.z)
				data.uv.push(v.uv.x, v.uv.y)
			}
	}
	const p = source.getAttribute('position'),
		n = source.getAttribute('normal'),
		uv = source.getAttribute('uv'),
		ix = source.index!
	for (let i = 0; i < ix.count; i += 3) {
		const polygon = [0, 1, 2].map((k) => {
			const j = ix.getX(i + k)
			return {
				p: new THREE.Vector3().fromBufferAttribute(p, j),
				n: new THREE.Vector3().fromBufferAttribute(n, j),
				uv: new THREE.Vector2(uv.getX(j), uv.getY(j)),
			}
		})
		distribute(polygon, emit)
	}
	const result = new Map<BodyPanelId, THREE.BufferGeometry>()
	for (const [id, data] of output) {
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(data.p, 3))
		g.setAttribute('normal', new THREE.Float32BufferAttribute(data.n, 3))
		g.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2))
		g.computeBoundingBox()
		g.computeBoundingSphere()
		result.set(id, g)
	}
	source.dispose()
	return result
}
export function createBodyPanelGeometry() {
	const shell = partition(createBodyGeometry(), (poly, emit) => {
		let end: Polygon
		;[end, poly] = split(poly, (v) => v.p.x - S.cuts.frontBumperX)
		emit('bumper-front', end)
		;[end, poly] = split(poly, (v) => S.cuts.rearBumperX - v.p.x)
		emit('bumper-rear', end)
		;[end, poly] = split(poly, (v) => B.rockerY - v.p.y)
		emit('sill', end)
		let top: Polygon
		;[top, poly] = split(poly, (v) => S.cuts.bonnetHalfParameter - Math.min(v.uv.y, 1 - v.uv.y) * 2)
		let hood: Polygon
		;[hood, top] = split(top, (v) => v.p.x - B.doorFrontX)
		emit('hood', hood)
		let trunk: Polygon
		;[trunk, top] = split(top, (v) => S.cuts.deckFrontX - v.p.x)
		emit('trunk', trunk)
		emit('sill', top) // beneath the cabin-opening shader cut; the remaining cowl stays on the body.
		const [right, left] = split(poly, (v) => v.p.z)
		for (const [side, initial] of [
			['left', left],
			['right', right],
		] as const) {
			let flank = initial
			let panel: Polygon
			;[panel, flank] = split(flank, (v) => v.p.x - B.doorFrontX)
			emit(`fender-${side}`, panel)
			;[panel, flank] = split(flank, (v) => rearSeam(v.p.y) - v.p.x)
			emit(`quarter-${side}`, panel)
			;[panel, flank] = split(flank, (v) => v.p.x - B.doorMiddleX)
			emit(`door-front-${side}`, panel)
			emit(`door-rear-${side}`, flank)
		}
	})
	const cabin = partition(createCabinGeometry(), (poly, emit) => {
		const G = B.glazing
		let middle: Polygon
		let front: Polygon
		let rear: Polygon
		;[front, middle] = split(poly, (v) => v.p.x - G.frontStart)
		;[rear, middle] = split(middle, (v) => G.rearEnd - v.p.x)
		// A second cut follows the sloping side-window front/rear edges, preserving the
		// six side panes. Shader glazing boundaries are unchanged from the assembled car.
		const boundary = (v: Vertex, front: boolean) => {
			const a = Math.abs((v.uv.y - 0.5) * Math.PI),
				h = THREE.MathUtils.clamp((a - G.sideTopAngle) / (G.sideBottomAngle - G.sideTopAngle), 0, 1)
			return (
				THREE.MathUtils.lerp(
					front ? G.sideFrontTop : G.sideRearTop,
					front ? G.sideFrontBottom : G.sideRearBottom,
					h,
				) + (front ? G.quarterPillarWidth : -G.quarterPillarWidth)
			)
		}
		const [wind, frontSide] = split(front, (v) => v.p.x - boundary(v, true))
		emit('windscreen', wind)
		const [back, rearSide] = split(rear, (v) => boundary(v, false) - v.p.x)
		emit('backlight', back)
		for (const region of [middle, frontSide, rearSide]) {
			let roof: Polygon
			let sides: Polygon
			;[roof, sides] = split(region, (v) => G.sideTopAngle - Math.abs((v.uv.y - 0.5) * Math.PI))
			emit('roof', roof)
			const [right, left] = split(sides, (v) => v.p.z)
			for (const [side, initial] of [
				['left', left],
				['right', right],
			] as const) {
				let rear: Polygon
				let panel: Polygon
				;[panel, rear] = split(initial, (v) => v.p.x - G.pillarEnd)
				emit(`glass-front-${side}`, panel)
				;[panel, rear] = split(rear, (v) => v.p.x - G.quarterPillarX)
				emit(`glass-rear-${side}`, panel)
				emit(`glass-quarter-${side}`, rear)
			}
		}
	})
	for (const [key, geometry] of cabin) shell.set(key, geometry)
	return shell
}
