import * as T from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {ENGINE_GEOMETRY as C, VEHICLE_SPEC} from './vehicle-spec'
import {
	CYLINDERS,
	cylinderX,
	ENGINE_CENTER_X as X,
	createPitchLoop,
	createTube,
} from './engine-geometry'

const E = VEHICLE_SPEC.engine
const G = E.geometry
const TAU = Math.PI * 2
type Point = readonly [number, number, number]

function combine(geometries: T.BufferGeometry[]) {
	const normalized = geometries.map((geometry) => {
		const result = geometry.index ? geometry.toNonIndexed() : geometry
		result.deleteAttribute('uv')
		if (!result.getAttribute('normal')) result.computeVertexNormals()
		return result
	})
	const result = mergeGeometries(normalized, false)
	if (!result) throw new Error('Engine casting geometry attributes do not match')
	for (const geometry of new Set([...geometries, ...normalized])) geometry.dispose()
	result.computeBoundingBox()
	result.computeBoundingSphere()
	return result
}

function roundedRectangle(length: number, width: number, radius = C.cornerRadius) {
	const l = length / 2,
		w = width / 2,
		r = Math.min(radius, l, w)
	const shape = new T.Shape()
	shape.moveTo(-l + r, -w)
	shape.lineTo(l - r, -w)
	shape.quadraticCurveTo(l, -w, l, -w + r)
	shape.lineTo(l, w - r)
	shape.quadraticCurveTo(l, w, l - r, w)
	shape.lineTo(-l + r, w)
	shape.quadraticCurveTo(-l, w, -l, w - r)
	shape.lineTo(-l, -w + r)
	shape.quadraticCurveTo(-l, -w, -l + r, -w)
	return shape
}

function circleHole(shape: T.Shape, x: number, y: number, radius: number) {
	const hole = new T.Path()
	hole.absarc(x, y, radius, 0, TAU, true)
	shape.holes.push(hole)
}

function horizontal(shape: T.Shape, depth: number, y: number, centerX = X) {
	const geometry = new T.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: 36})
	geometry.rotateX(-Math.PI / 2)
	geometry.translate(centerX, y, 0)
	return geometry
}

function crosswise(shape: T.Shape, depth: number, x: number) {
	const geometry = new T.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: 36})
	geometry.translate(0, 0, -depth / 2)
	geometry.rotateY(Math.PI / 2)
	geometry.translate(x, 0, 0)
	return geometry
}

function box(size: Point, position: Point) {
	const geometry = new T.BoxGeometry(...size)
	geometry.translate(...position)
	return geometry
}

function cylinder(
	radius: number,
	length: number,
	position: Point,
	axis: 'x' | 'y' | 'z' = 'y',
	sides = 36,
) {
	const geometry = new T.CylinderGeometry(radius, radius, length, sides)
	if (axis === 'x') geometry.rotateZ(-Math.PI / 2)
	if (axis === 'z') geometry.rotateX(Math.PI / 2)
	geometry.translate(...position)
	return geometry
}

function ringShape(length: number, width: number, innerLength: number, innerWidth: number) {
	const shape = roundedRectangle(length, width)
	shape.holes.push(new T.Path(roundedRectangle(innerLength, innerWidth).getPoints(24)))
	return shape
}

function cylinderSleeve(radius: number, wall: number, bottomY: number, height: number, x: number) {
	const shape = new T.Shape()
	shape.absarc(0, 0, radius + wall, 0, TAU, false)
	circleHole(shape, 0, 0, radius)
	return horizontal(shape, height, bottomY, x)
}

/** Two open skirts flare out below the water jacket. The crankcase ends stay
 * open around the crank; separate saddles and caps carry its journals. */
function skirtWall(side: number) {
	const vertices: number[] = []
	for (const inset of [0, C.wall])
		for (const [y, length, width] of [
			[C.cylinderBottomY, G.blockLength, G.blockWidth],
			[C.skirtBottomY, C.skirtLength, C.skirtWidth],
		])
			for (const sign of [-1, 1])
				vertices.push(X + (sign * length) / 2, y, side * (width / 2 - inset))
	const geometry = new T.BufferGeometry()
	geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
	geometry.setIndex([
		0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3,
		5, 3, 7, 5,
	])
	if (side < 0) {
		const indices = geometry.index!
		for (let i = 0; i < indices.count; i += 3) {
			const b = indices.getX(i + 1)
			indices.setX(i + 1, indices.getX(i + 2))
			indices.setX(i + 2, b)
		}
	}
	geometry.computeVertexNormals()
	return geometry
}

function bearingSaddle(x: number, cap = false) {
	const shape = new T.Shape()
	const halfWidth = C.bearingCapWidth / 2
	const radius = G.crankMainRadius + G.ringTube / 3
	const y = E.crankY
	if (cap) {
		shape.moveTo(-halfWidth, y)
		shape.lineTo(-radius, y)
		shape.absarc(0, y, radius, Math.PI, TAU, false)
		shape.lineTo(halfWidth, y)
		shape.lineTo(halfWidth, y - C.bearingCapHeight)
		shape.lineTo(-halfWidth, y - C.bearingCapHeight)
	} else {
		shape.moveTo(-C.skirtWidth / 2 + C.wall, y)
		shape.lineTo(-C.skirtWidth / 2 + C.wall, C.cylinderBottomY + C.wall)
		shape.lineTo(C.skirtWidth / 2 - C.wall, C.cylinderBottomY + C.wall)
		shape.lineTo(C.skirtWidth / 2 - C.wall, y)
		shape.lineTo(radius, y)
		shape.absarc(0, y, radius, 0, Math.PI, false)
	}
	shape.closePath()
	return crosswise(shape, C.bearingWebThickness, x)
}

export function createEngineBlock() {
	const deck = roundedRectangle(G.blockLength, G.blockWidth)
	for (const c of CYLINDERS) {
		circleHole(deck, cylinderX(c) - X, 0, E.bore / 2)
		for (const side of [-1, 1])
			circleHole(deck, cylinderX(c) - X, (side * C.jacketInnerWidth) / 2, C.coolantPortRadius)
	}
	const pieces: T.BufferGeometry[] = [
		horizontal(deck, C.deckThickness, G.deckY - C.deckThickness),
		horizontal(
			ringShape(
				G.blockLength,
				G.blockWidth,
				G.blockLength - C.jacketEndWall * 2,
				C.jacketInnerWidth,
			),
			G.deckY - C.deckThickness - C.cylinderBottomY,
			C.cylinderBottomY,
		),
		skirtWall(-1),
		skirtWall(1),
	]
	for (const c of CYLINDERS) {
		pieces.push(
			cylinderSleeve(
				E.bore / 2,
				C.linerWall,
				C.cylinderBottomY,
				G.deckY - C.deckThickness - C.cylinderBottomY,
				cylinderX(c),
			),
		)
		for (const side of [-1, 1]) {
			pieces.push(
				cylinder(
					C.corePlugRadius,
					C.wall,
					[cylinderX(c), (G.deckY + C.cylinderBottomY) / 2, (side * G.blockWidth) / 2],
					'z',
				),
			)
			pieces.push(
				createTube(
					[
						[
							cylinderX(c) + E.cylinderSpacing / 3,
							G.deckY - C.deckThickness,
							(side * G.blockWidth) / 2,
						],
						[
							cylinderX(c) + E.cylinderSpacing / 3,
							C.cylinderBottomY,
							(side * (G.blockWidth + C.ribDepth)) / 2,
						],
						[cylinderX(c) + E.cylinderSpacing / 3, C.skirtBottomY, (side * C.skirtWidth) / 2],
					],
					C.ribWidth / 2,
				),
			)
		}
	}
	for (let i = 0; i < 5; i++)
		pieces.push(bearingSaddle(E.cylinder1X + E.cylinderSpacing / 2 - i * E.cylinderSpacing))
	pieces.push(
		horizontal(
			ringShape(C.skirtLength, C.skirtWidth, C.skirtLength - C.wall * 2, C.skirtWidth - C.wall * 2),
			C.wall,
			C.skirtBottomY,
		),
	)
	return combine(pieces)
}

export function createMainBearingCap(index: number) {
	const x = E.cylinder1X + E.cylinderSpacing / 2 - index * E.cylinderSpacing
	return combine([
		bearingSaddle(x, true),
		...[-1, 1].map((side) =>
			cylinder(
				C.boltRadius * 1.3,
				C.wall,
				[x, E.crankY - C.bearingCapHeight, side * C.bearingCapWidth * 0.39],
				'y',
				6,
			),
		),
	])
}

function invertSurface(geometry: T.BufferGeometry) {
	const index = geometry.index!
	for (let i = 0; i < index.count; i += 3) {
		const b = index.getX(i + 1)
		index.setX(i + 1, index.getX(i + 2))
		index.setX(i + 2, b)
	}
	const normals = geometry.getAttribute('normal')
	for (let i = 0; i < normals.count; i++)
		normals.setXYZ(i, -normals.getX(i), -normals.getY(i), -normals.getZ(i))
	return geometry
}

/** Hollow runners and ports: both outside and inside surfaces, with annular ends. */
export function createHollowTube(points: readonly Point[], radius: number, wall: number) {
	const curve = new T.CatmullRomCurve3(points.map((point) => new T.Vector3(...point)))
	const pieces: T.BufferGeometry[] = [
		new T.TubeGeometry(curve, 48, radius, 24, false),
		invertSurface(new T.TubeGeometry(curve, 48, radius - wall, 24, false)),
	]
	for (const t of [0, 1]) {
		const ring = new T.RingGeometry(radius - wall, radius, 24)
		const tangent = curve.getTangent(t).multiplyScalar(t === 0 ? -1 : 1)
		ring.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), tangent))
		ring.translate(...curve.getPoint(t).toArray())
		pieces.push(ring)
	}
	return combine(pieces)
}

function headSide(side: number) {
	const shape = new T.Shape()
	shape.moveTo(X - G.blockLength / 2, G.deckY)
	shape.lineTo(X + G.blockLength / 2, G.deckY)
	shape.lineTo(X + G.blockLength / 2, G.deckY + G.headHeight)
	shape.lineTo(X - G.blockLength / 2, G.deckY + G.headHeight)
	shape.closePath()
	for (const c of CYLINDERS) circleHole(shape, cylinderX(c), C.headPortY, C.headPortRadius)
	const geometry = new T.ExtrudeGeometry(shape, {
		depth: C.wall,
		bevelEnabled: false,
		curveSegments: 36,
	})
	geometry.translate(0, 0, side > 0 ? G.headWidth / 2 - C.wall : -G.headWidth / 2)
	return geometry
}

export function createCylinderHead() {
	const fireDeck = roundedRectangle(G.blockLength, G.headWidth)
	for (const c of CYLINDERS) {
		circleHole(fireDeck, cylinderX(c) - X, 0, G.sparkPlugRadius)
		for (const side of [-1, 1])
			for (const along of [-1, 1])
				circleHole(
					fireDeck,
					cylinderX(c) - X + along * G.valveXOffset,
					side * G.valveZOffset,
					G.valveRadius * 1.02,
				)
	}
	const pieces: T.BufferGeometry[] = [
		horizontal(fireDeck, C.headFireDeckThickness, G.deckY),
		headSide(-1),
		headSide(1),
	]
	for (const side of [-1, 1]) {
		pieces.push(
			box(
				[C.headEndWall, G.headHeight, G.headWidth],
				[X + (side * (G.blockLength - C.headEndWall)) / 2, G.deckY + G.headHeight / 2, 0],
			),
		)
		pieces.push(
			box(
				[G.blockLength, C.wall * 2, C.camCarrierWidth],
				[X, G.deckY + G.headHeight, side * G.camZ],
			),
		)
		for (const c of CYLINDERS)
			for (const along of [-1, 1]) {
				pieces.push(
					createHollowTube(
						[
							[cylinderX(c) + along * G.valveXOffset, G.valveSeatY + C.wall, side * G.valveZOffset],
							[cylinderX(c) + along * G.valveXOffset, C.headPortY - C.wall, side * G.camZ],
							[cylinderX(c), C.headPortY, (side * G.headWidth) / 2],
						],
						C.headPortRadius,
						C.headPortWall,
					),
				)
			}
		for (let i = 0; i < 5; i++) {
			const x = E.cylinder1X + E.cylinderSpacing / 2 - i * E.cylinderSpacing
			const saddle = new T.Shape()
			const z = side * G.camZ
			saddle.moveTo(-z - C.camCarrierWidth / 2, G.deckY + G.headHeight)
			saddle.lineTo(-z + C.camCarrierWidth / 2, G.deckY + G.headHeight)
			saddle.lineTo(-z + C.camCarrierWidth / 2, G.camY + G.camShaftRadius * 1.4)
			saddle.lineTo(-z - C.camCarrierWidth / 2, G.camY + G.camShaftRadius * 1.4)
			saddle.closePath()
			circleHole(saddle, -z, G.camY, G.camShaftRadius * 1.02)
			pieces.push(crosswise(saddle, C.camCarrierThickness, x))
		}
	}
	// Machined chamber rims make the four combustion chambers legible from below.
	for (const c of CYLINDERS) {
		const rim = new T.TorusGeometry(E.bore / 2 - C.wall / 2, C.wall / 2, 8, 56)
		rim.rotateX(Math.PI / 2)
		rim.translate(cylinderX(c), G.deckY, 0)
		pieces.push(rim)
	}
	return combine(pieces)
}

export function camCoverRoofY(z: number) {
	const distance = (Math.abs(z) - G.camZ) / C.coverLobeWidth
	return C.coverValleyY + C.coverLobeHeight * Math.exp(-distance * distance)
}

/** Uniform subdivision keeps shared edges conforming before the roof bends.
 * Adaptive longest-edge splits leave T-junctions that appear in X-ray outlines. */
function refineSurface(source: T.BufferGeometry, subdivisions: number) {
	const geometry = source.index ? source.toNonIndexed() : source
	const p = geometry.getAttribute('position'),
		n = geometry.getAttribute('normal')
	type Vertex = {p: T.Vector3; n: T.Vector3}
	const positions: number[] = [],
		normals: number[] = []
	const midpoint = (a: Vertex, b: Vertex): Vertex => ({
		p: a.p.clone().add(b.p).multiplyScalar(0.5),
		n: a.n.clone().add(b.n).normalize(),
	})
	const emit = (a: Vertex, b: Vertex, c: Vertex, depth: number) => {
		if (depth < subdivisions) {
			const ab = midpoint(a, b),
				bc = midpoint(b, c),
				ca = midpoint(c, a)
			emit(a, ab, ca, depth + 1)
			emit(ab, b, bc, depth + 1)
			emit(ca, bc, c, depth + 1)
			emit(ab, bc, ca, depth + 1)
		} else
			for (const v of [a, b, c]) {
				positions.push(...v.p.toArray())
				normals.push(...v.n.toArray())
			}
	}
	for (let i = 0; i < p.count; i += 3) {
		const vertex = (j: number): Vertex => ({
			p: new T.Vector3().fromBufferAttribute(p, j),
			n: new T.Vector3().fromBufferAttribute(n, j),
		})
		emit(vertex(i), vertex(i + 1), vertex(i + 2), 0)
	}
	const result = new T.BufferGeometry()
	result.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
	result.setAttribute('normal', new T.Float32BufferAttribute(normals, 3))
	geometry.dispose()
	if (source !== geometry) source.dispose()
	return result
}

export function createCamCover() {
	const roofShape = roundedRectangle(C.coverLength, C.coverWidth)
	for (const c of CYLINDERS) circleHole(roofShape, cylinderX(c) - X, 0, C.coverPlugWellRadius)
	const roof = refineSurface(horizontal(roofShape, C.wall, 0), 3)
	const points = roof.getAttribute('position'),
		normals = roof.getAttribute('normal')
	for (let i = 0; i < points.count; i++) {
		const z = points.getZ(i),
			distance = (Math.abs(z) - G.camZ) / C.coverLobeWidth
		const slope =
			((C.coverLobeHeight * Math.exp(-distance * distance) * -2 * distance) / C.coverLobeWidth) *
			Math.sign(z)
		points.setY(i, points.getY(i) + camCoverRoofY(z))
		const normal = new T.Vector3(
			normals.getX(i),
			normals.getY(i),
			normals.getZ(i) - normals.getY(i) * slope,
		).normalize()
		normals.setXYZ(i, normal.x, normal.y, normal.z)
	}
	const outline = roundedRectangle(C.coverLength, C.coverWidth).getPoints(24)
	const positions: number[] = [],
		indices: number[] = []
	for (let i = 0; i < outline.length - 1; i++) {
		const p = outline[i],
			q = outline[i + 1]
		for (const [point, y] of [
			[p, C.coverFlangeY],
			[p, camCoverRoofY(-p.y)],
			[q, C.coverFlangeY],
			[q, camCoverRoofY(-q.y)],
		] as const)
			positions.push(X + point.x, y, -point.y)
		const n = i * 4
		indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3)
	}
	const walls = new T.BufferGeometry()
	walls.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
	walls.setIndex(indices)
	walls.computeVertexNormals()
	const pieces = [
		roof,
		walls,
		horizontal(
			ringShape(
				C.coverLength + C.wall * 2,
				C.coverWidth + C.wall * 2,
				C.coverLength - C.wall * 2,
				C.coverWidth - C.wall * 2,
			),
			C.coverFlangeThickness,
			C.coverFlangeY,
		),
	]
	for (const c of CYLINDERS)
		pieces.push(
			cylinderSleeve(
				C.coverPlugWellRadius,
				C.wall / 2,
				C.coverFlangeY,
				camCoverRoofY(0) - C.coverFlangeY,
				cylinderX(c),
			),
		)
	return combine(pieces)
}

export function createHeadGasket() {
	const shape = roundedRectangle(G.blockLength, C.gasketWidth)
	for (const c of CYLINDERS) {
		circleHole(shape, cylinderX(c) - X, 0, E.bore / 2)
		for (const side of [-1, 1])
			circleHole(shape, cylinderX(c) - X, (side * C.jacketInnerWidth) / 2, C.coolantPortRadius)
	}
	return horizontal(shape, C.gasketThickness, G.deckY)
}

/** A tapered open sump with an offset deep collection well, not a solid box. */
export function createOilPan() {
	const stations = [
		{x: X, y: C.skirtBottomY, length: C.skirtLength, width: C.skirtWidth},
		{
			x: X,
			y: C.skirtBottomY - C.wall * 3,
			length: C.skirtLength - C.wall * 2,
			width: C.skirtWidth - C.wall * 2,
		},
		{
			x: X + C.sumpOffsetX,
			y: C.skirtBottomY - C.sumpDepth,
			length: C.sumpBottomLength,
			width: C.sumpBottomWidth,
		},
	]
	const rings = stations.map((station) =>
		roundedRectangle(station.length, station.width).getPoints(20).slice(0, -1),
	)
	const count = rings[0].length,
		positions: number[] = [],
		indices: number[] = []
	for (let surface = 0; surface < 2; surface++)
		stations.forEach((station, layer) => {
			rings[layer].forEach((point) => {
				const inward = surface ? C.wall : 0
				positions.push(
					station.x + point.x * (1 - (inward * 2) / station.length),
					station.y + (surface && layer === stations.length - 1 ? C.wall : 0),
					point.y * (1 - (inward * 2) / station.width),
				)
			})
		})
	const span = stations.length * count
	for (let surface = 0; surface < 2; surface++)
		for (let layer = 0; layer < stations.length - 1; layer++)
			for (let i = 0; i < count; i++) {
				const a = surface * span + layer * count + i,
					b = surface * span + layer * count + ((i + 1) % count)
				const quad = surface
					? [a, a + count, b, b, a + count, b + count]
					: [a, b, a + count, b, b + count, a + count]
				indices.push(...quad)
			}
	for (let i = 0; i < count; i++) {
		const next = (i + 1) % count
		indices.push(i, i + span, next, next, i + span, next + span)
	}
	const walls = new T.BufferGeometry()
	walls.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
	walls.setIndex(indices)
	walls.computeVertexNormals()
	const bottom = horizontal(
		roundedRectangle(C.sumpBottomLength, C.sumpBottomWidth),
		C.wall,
		C.skirtBottomY - C.sumpDepth,
		X + C.sumpOffsetX,
	)
	const lip = horizontal(
		ringShape(
			C.skirtLength + C.wall * 2,
			C.skirtWidth + C.wall * 2,
			C.skirtLength - C.wall * 2,
			C.skirtWidth - C.wall * 2,
		),
		C.wall,
		C.skirtBottomY,
	)
	const pieces = [walls, bottom, lip]
	for (const side of [-1, 1])
		for (let i = 0; i < 4; i++) {
			const x = X - C.sumpBottomLength / 2 + (i * C.sumpBottomLength) / 3
			pieces.push(
				createTube(
					[
						[x, C.skirtBottomY - C.wall * 3, (side * C.skirtWidth) / 2],
						[x + C.sumpOffsetX, C.skirtBottomY - C.sumpDepth, (side * C.sumpBottomWidth) / 2],
					],
					C.ribWidth / 2,
				),
			)
		}
	pieces.push(
		cylinder(
			C.boltRadius * 2,
			C.wall * 2,
			[X + C.sumpOffsetX, C.skirtBottomY - C.sumpDepth + C.wall * 3, C.sumpBottomWidth / 2],
			'z',
			6,
		),
	)
	return combine(pieces)
}

export function createTimingCover() {
	const path = createPitchLoop(
		[
			{y: E.crankY, z: 0, radius: G.crankSprocketRadius + C.timingCoverClearance},
			{y: G.camY, z: -G.camZ, radius: G.camSprocketRadius + C.timingCoverClearance},
			{y: G.camY, z: G.camZ, radius: G.camSprocketRadius + C.timingCoverClearance},
		],
		0,
	)
	const outline = path.getPoints(128)
	const shape = new T.Shape(outline.map((point) => new T.Vector2(-point.z, point.y)))
	circleHole(shape, 0, E.crankY, G.crankMainRadius * 1.08)
	const frontX = G.timingFrontX + G.timingThickness + C.timingCoverDepth
	const face = crosswise(shape, C.timingCoverFaceThickness, frontX)
	const pieces: T.BufferGeometry[] = [face]
	for (const side of [-1, 1]) {
		pieces.push(
			createTube(
				[
					[frontX, E.crankY, side * G.crankSprocketRadius],
					[frontX, (E.crankY + G.camY) / 2, side * G.camZ],
					[frontX, G.camY, side * (G.camZ + G.camSprocketRadius * 0.7)],
				],
				C.ribWidth / 2,
			),
		)
	}
	for (let i = 0; i < 14; i++) {
		const p = path.getPointAt(i / 14)
		pieces.push(cylinder(C.boltRadius * 1.15, C.wall, [frontX, p.y, p.z], 'x', 6))
	}
	// Continuous skirt follows the same three-lobe envelope as the front face.
	const positions: number[] = [],
		indices: number[] = []
	for (let i = 0; i < outline.length - 1; i++) {
		const p = outline[i],
			q = outline[i + 1]
		positions.push(
			frontX,
			p.y,
			p.z,
			frontX - C.timingCoverDepth,
			p.y,
			p.z,
			frontX,
			q.y,
			q.z,
			frontX - C.timingCoverDepth,
			q.y,
			q.z,
		)
		const n = i * 4
		indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3)
	}
	const skirt = new T.BufferGeometry()
	skirt.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
	skirt.setIndex(indices)
	skirt.computeVertexNormals()
	pieces.push(skirt)
	return combine(pieces)
}

export function createIntakeManifold() {
	const runners = CYLINDERS.map((c) =>
		createHollowTube(
			[
				[cylinderX(c), C.headPortY, -G.headWidth / 2],
				[cylinderX(c), C.headPortY + C.intakeRunnerRadius, -G.headWidth * 0.8],
				[
					cylinderX(c),
					C.intakePlenumY + C.intakePlenumRadius,
					C.intakePlenumZ - C.intakePlenumRadius / 2,
				],
				[cylinderX(c), C.intakePlenumY, C.intakePlenumZ],
			],
			C.intakeRunnerRadius,
			C.intakeRunnerWall,
		),
	)
	const plenum = new T.CapsuleGeometry(
		C.intakePlenumRadius,
		C.intakePlenumLength - C.intakePlenumRadius * 2,
		8,
		36,
	)
	plenum.rotateZ(-Math.PI / 2)
	plenum.translate(X, C.intakePlenumY, C.intakePlenumZ)
	return combine([...runners, plenum])
}

export function createExhaustManifold() {
	const collector: Point = [C.exhaustCollectorX, C.exhaustCollectorY, C.exhaustCollectorZ]
	const runners = CYLINDERS.map((c, index) =>
		createHollowTube(
			[
				[cylinderX(c), C.headPortY, G.headWidth / 2],
				[cylinderX(c), C.headPortY, G.headWidth * 0.9 + (index * C.exhaustRunnerRadius) / 2],
				[
					cylinderX(c) - E.cylinderSpacing * 0.14,
					C.exhaustCollectorY + C.exhaustCollectorLength,
					C.exhaustCollectorZ + (index - 1.5) * C.exhaustRunnerRadius,
				],
				[
					collector[0] + (index - 1.5) * C.exhaustRunnerRadius * 0.65,
					collector[1] + C.exhaustCollectorLength / 2,
					collector[2],
				],
			],
			C.exhaustRunnerRadius,
			C.exhaustRunnerWall,
		),
	)
	runners.push(
		createHollowTube(
			[
				[collector[0], collector[1] + C.exhaustCollectorLength / 2, collector[2]],
				collector,
				[
					collector[0] - C.exhaustCollectorLength / 2,
					collector[1] - C.exhaustCollectorLength / 2,
					collector[2],
				],
			],
			C.exhaustCollectorRadius,
			C.exhaustRunnerWall,
		),
	)
	return combine(runners)
}

export function createEngineCastings() {
	return {
		block: createEngineBlock(),
		head: createCylinderHead(),
		cover: createCamCover(),
		gasket: createHeadGasket(),
		pan: createOilPan(),
		timingCover: createTimingCover(),
		intake: createIntakeManifold(),
		exhaust: createExhaustManifold(),
		bearingCaps: Array.from({length: 5}, (_, index) => createMainBearingCap(index)),
	}
}
