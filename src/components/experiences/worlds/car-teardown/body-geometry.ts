import * as THREE from 'three'
import {BODY_GEOMETRY as B, VEHICLE_SPEC as V} from './vehicle-spec'

type NumericRows = readonly (readonly number[])[]

/** Natural cubic splines keep both slope and curvature continuous. Spec stations
 * are styling constraints; they are not visible polygon rings in the body. */
function naturalSpline(rows: NumericRows, column: number) {
	const n = rows.length
	const x = rows.map((r) => r[0])
	const a = rows.map((r) => r[column])
	const h = x.slice(1).map((value, i) => value - x[i])
	const alpha = new Array<number>(n).fill(0)
	const l = new Array<number>(n).fill(1)
	const mu = new Array<number>(n).fill(0)
	const z = new Array<number>(n).fill(0)
	const c = new Array<number>(n).fill(0)
	const b = new Array<number>(n - 1).fill(0)
	const d = new Array<number>(n - 1).fill(0)
	for (let i = 1; i < n - 1; i++) alpha[i] = 3 * ((a[i + 1] - a[i]) / h[i] - (a[i] - a[i - 1]) / h[i - 1])
	for (let i = 1; i < n - 1; i++) {
		l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]
		mu[i] = h[i] / l[i]
		z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]
	}
	for (let i = n - 2; i >= 0; i--) {
		c[i] = z[i] - mu[i] * c[i + 1]
		b[i] = (a[i + 1] - a[i]) / h[i] - (h[i] * (c[i + 1] + 2 * c[i])) / 3
		d[i] = (c[i + 1] - c[i]) / (3 * h[i])
	}
	return (coordinate: number) => {
		const t = Math.max(x[0], Math.min(x[n - 1], coordinate))
		let i = 0
		while (i < n - 2 && x[i + 1] < t) i++
		const q = t - x[i]
		return a[i] + b[i] * q + c[i] * q * q + d[i] * q * q * q
	}
}

const shellSplines = [1, 2, 3, 4].map((column) => naturalSpline(B.sections, column))
const cabinSplines = [1, 2, 3].map((column) => naturalSpline(B.cabinSections, column))

export function bodySection(x: number) {
	return {
		top: shellSplines[0](x),
		shoulder: shellSplines[1](x),
		width: shellSplines[2](x),
		bottom: shellSplines[3](x),
	}
}

export function bodyPoint(x: number, angle: number, lift = 0) {
	const {top, shoulder, width, bottom} = bodySection(x)
	const c = Math.cos(angle)
	const s = Math.sin(angle)
	const exponent = c >= 0 ? B.upperExponent : B.lowerExponent
	const y = shoulder + Math.sign(c) * (c >= 0 ? top - shoulder : shoulder - bottom) * Math.abs(c) ** exponent
	return new THREE.Vector3(x, y + lift, Math.sign(s) * width * Math.abs(s) ** exponent)
}

/** Side surface at a given height, useful for door seams and arch trim. */
export function bodySide(x: number, y: number, side = 1, offset = 0) {
	const {top, shoulder, width, bottom} = bodySection(x)
	const ratio = Math.max(
		0,
		Math.min(1, Math.abs(y - shoulder) / (y >= shoulder ? top - shoulder : shoulder - bottom)),
	)
	const exponent = y >= shoulder ? B.upperExponent : B.lowerExponent
	const cosine = ratio ** (1 / exponent)
	return new THREE.Vector3(
		x,
		y,
		side * (width * Math.sqrt(Math.max(0, 1 - cosine * cosine)) ** exponent + offset),
	)
}

export function cabinPoint(x: number, angle: number, lift = 0) {
	const top = cabinSplines[0](x)
	const bottom = cabinSplines[1](x)
	const width = cabinSplines[2](x)
	return new THREE.Vector3(
		x,
		bottom + (top - bottom) * (1 - Math.abs(Math.sin(angle)) ** B.cabinExponent) + lift,
		width * Math.sin(angle),
	)
}

function createLoft(cabin: boolean) {
	const rows = cabin ? B.cabinSections : B.sections
	const [start, end] = [rows[0][0], rows[rows.length - 1][0]]
	const nx = B.longitudinalSegments
	const nt = cabin ? B.sectionSegments / 2 : B.sectionSegments
	const positions: number[] = []
	const uvs: number[] = []
	const indices: number[] = []
	for (let i = 0; i <= nx; i++) {
		const x = THREE.MathUtils.lerp(start, end, i / nx)
		for (let j = 0; j <= nt; j++) {
			const angle = cabin ? (j / nt - 0.5) * Math.PI : (j / nt) * Math.PI * 2
			const point = cabin ? cabinPoint(x, angle) : bodyPoint(x, angle)
			positions.push(point.x, point.y, point.z)
			uvs.push(i / nx, j / nt)
			if (i < nx && j < nt) {
				const a = i * (nt + 1) + j
				indices.push(a, a + 1, a + nt + 1, a + 1, a + nt + 2, a + nt + 1)
			}
		}
	}
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
	geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
	geometry.setIndex(indices)
	geometry.computeVertexNormals()
	if (!cabin) {
		// Weld the duplicated periodic normal, without welding UVs.
		const normal = geometry.getAttribute('normal')
		const v = new THREE.Vector3()
		for (let i = 0; i <= nx; i++) {
			const first = i * (nt + 1)
			const last = first + nt
			v.set(
				normal.getX(first) + normal.getX(last),
				normal.getY(first) + normal.getY(last),
				normal.getZ(first) + normal.getZ(last),
			).normalize()
			normal.setXYZ(first, v.x, v.y, v.z)
			normal.setXYZ(last, v.x, v.y, v.z)
		}
	}
	geometry.computeBoundingSphere()
	return geometry
}

export function createBodyGeometry() {
	return createLoft(false)
}
export function createCabinGeometry() {
	return createLoft(true)
}

/** Recessed central intake and a distinct lower bumper plane. The cap is a
 * sculpted grid rather than a flat fan; the outline still meets the loft. */
export function fasciaX(y: number, z: number, front: boolean) {
	const row = front ? B.sections[B.sections.length - 1] : B.sections[0]
	const halfWidth = Math.abs(bodySide(row[0], y).z)
	const lateralFade = Math.max(0, 1 - (Math.abs(z) / Math.max(halfWidth, Number.EPSILON)) ** 6)
	const mainRecess = B.fascia.frontRecess * Math.exp(-(((y - B.grille.y) / B.fascia.recessBlendHeight) ** 4))
	const lowerRecess =
		B.fascia.lowerRecess * Math.exp(-(((y - B.lowerIntake.y) / (B.fascia.recessBlendHeight / 2)) ** 2))
	const verticalFade = Math.sin(Math.PI * THREE.MathUtils.clamp((y - row[4]) / (row[1] - row[4]), 0, 1))
	return (
		row[0] + (front ? -1 : 1) * (front ? mainRecess + lowerRecess : lowerRecess) * lateralFade * verticalFade
	)
}

function fasciaGrid(
	front: boolean,
	ymin: number,
	ymax: number,
	widthAtY: (y: number) => number,
	lift: number,
) {
	const rows = B.fascia.segments
	const columns = B.fascia.segments
	const positions: number[] = []
	const indices: number[] = []
	for (let i = 0; i <= rows; i++) {
		const y = THREE.MathUtils.lerp(ymin, ymax, i / rows)
		const width = widthAtY(y)
		for (let j = 0; j <= columns; j++) {
			const z = ((j / columns) * 2 - 1) * width
			positions.push(fasciaX(y, z, front) + (front ? lift : -lift), y, z)
			if (i < rows && j < columns) {
				const a = i * (columns + 1) + j
				if (front) indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2)
				else indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1)
			}
		}
	}
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
	geometry.setIndex(indices)
	geometry.computeVertexNormals()
	return geometry
}

export function createBodyCap(front: boolean) {
	const row = front ? B.sections[B.sections.length - 1] : B.sections[0]
	return fasciaGrid(front, row[4], row[1], (y) => Math.abs(bodySide(row[0], y).z), 0)
}

export function createIntakeSurface(grille: {y: number; width: number; height: number}) {
	const radius = grille.height / 3
	return fasciaGrid(
		true,
		grille.y - grille.height / 2,
		grille.y + grille.height / 2,
		(y) => {
			const end = Math.max(0, Math.abs(y - grille.y) - (grille.height / 2 - radius))
			return grille.width / 2 - radius + Math.sqrt(Math.max(0, radius * radius - end * end))
		},
		B.seamRadius,
	)
}

const f = (value: number) => value.toFixed(6)
const wheelClip = `
  if (abs(vCarPosition.z) > ${f(B.wheelArchCutZ)}) {
    vec2 frontArch = vCarPosition.xy - vec2(${f(V.dimensions.frontAxleX)}, ${f(V.wheels.radius)});
    vec2 rearArch = vCarPosition.xy - vec2(${f(V.dimensions.rearAxleX)}, ${f(V.wheels.radius)});
    if (dot(frontArch, frontArch) < ${f(B.wheelArchRadius ** 2)} || dot(rearArch, rearArch) < ${f(B.wheelArchRadius ** 2)}) discard;
  }
  if (vCarPosition.x > ${f(B.cabinOpening.rear)} && vCarPosition.x < ${f(B.cabinOpening.front)} && abs(vCarPosition.z) < ${f(B.cabinOpening.halfWidth)} && vCarPosition.y > ${f(B.cabinOpening.minimumY)}) discard;
`

const G = B.glazing
const glazingFunction = `
  float windowAngle = abs((vCarUv.y - 0.5) * 3.14159265359);
  float windowX = vCarPosition.x;
  float windowHeight = clamp((windowAngle - ${f(G.sideTopAngle)}) / ${f(G.sideBottomAngle - G.sideTopAngle)}, 0.0, 1.0);
  float sideRear = mix(${f(G.sideRearTop)}, ${f(G.sideRearBottom)}, windowHeight);
  float sideFront = mix(${f(G.sideFrontTop)}, ${f(G.sideFrontBottom)}, windowHeight);
  bool frontWindow = windowX > max(${f(G.frontStart)}, sideFront + ${f(G.quarterPillarWidth)}) && windowX < ${f(G.frontEnd)} && windowAngle < ${f(G.windscreenHalfAngle)};
  bool rearWindow = windowX > ${f(G.rearStart)} && windowX < min(${f(G.rearEnd)}, sideRear - ${f(G.quarterPillarWidth)}) && windowAngle < ${f(G.windscreenHalfAngle)};
  bool pillar = (windowX > ${f(G.pillarStart)} && windowX < ${f(G.pillarEnd)}) || abs(windowX - ${f(G.quarterPillarX)}) < ${f(G.quarterPillarWidth / 2)};
  bool sideWindow = windowAngle > ${f(G.sideTopAngle)} && windowAngle < ${f(G.sideBottomAngle)} && windowX > sideRear && windowX < sideFront && !pillar;
  bool isGlass = frontWindow || rearWindow || sideWindow;
`

type ClipSurface = 'shell' | 'cabin' | 'glass'
export function applyBodyClip<T extends THREE.Material>(material: T, surface: ClipSurface): T {
	material.onBeforeCompile = (shader) => {
		shader.vertexShader = 'varying vec3 vCarPosition; varying vec2 vCarUv;\n' + shader.vertexShader
		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			'#include <begin_vertex>\nvCarPosition = position; vCarUv = uv;',
		)
		shader.fragmentShader = 'varying vec3 vCarPosition; varying vec2 vCarUv;\n' + shader.fragmentShader
		const code =
			surface === 'shell'
				? wheelClip
				: glazingFunction + (surface === 'glass' ? '\nif (!isGlass) discard;' : '\nif (isGlass) discard;')
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <clipping_planes_fragment>',
			'#include <clipping_planes_fragment>\n' + code,
		)
	}
	material.customProgramCacheKey = () => `car-surface-${surface}-v1`
	return material
}

export function bodyDepthMaterial(surface: ClipSurface) {
	return applyBodyClip(
		new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide}),
		surface,
	)
}

export function curveTube(points: readonly THREE.Vector3[], radius: number, segments = 96) {
	return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...points]), segments, radius, 6, false)
}

export function createArchLiner(axleX: number, side: number) {
	const positions: number[] = []
	const indices: number[] = []
	const segments = 80
	const radius = B.wheelArchRadius
	for (let i = 0; i <= segments; i++) {
		const angle = -B.archLipAngleOverrun + (i / segments) * (Math.PI + B.archLipAngleOverrun * 2)
		const x = axleX + radius * Math.cos(angle)
		const y = V.wheels.radius + radius * Math.sin(angle)
		const outside = bodySide(x, y, side).z
		for (const z of [outside, outside - side * B.wheelArchDepth]) positions.push(x, y, z)
		if (i < segments) {
			const a = i * 2
			indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
		}
	}
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
	geometry.setIndex(indices)
	geometry.computeVertexNormals()
	return geometry
}
