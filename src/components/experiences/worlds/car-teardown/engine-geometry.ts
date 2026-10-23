import * as THREE from 'three'
import {valveLift} from './model'
import {VEHICLE_SPEC, type CylinderNumber, type ValveType} from './vehicle-spec'

const E = VEHICLE_SPEC.engine
const G = E.geometry
const TAU = Math.PI * 2

export const ENGINE_CENTER_X = E.cylinder1X - (E.cylinderSpacing * (E.cylinders - 1)) / 2
export const CYLINDERS = [1, 2, 3, 4] as const
export const cylinderX = (cylinder: CylinderNumber) => E.cylinder1X - (cylinder - 1) * E.cylinderSpacing

/** An extruded casting with four actual through bores, rather than painted disks. */
export function createBoredCasting(length: number, width: number, height: number, boreRadius: number) {
	const shape = new THREE.Shape()
	const corner = G.crankWebThickness / 2
	shape.moveTo(-length / 2 + corner, -width / 2)
	shape.lineTo(length / 2 - corner, -width / 2)
	shape.quadraticCurveTo(length / 2, -width / 2, length / 2, -width / 2 + corner)
	shape.lineTo(length / 2, width / 2 - corner)
	shape.quadraticCurveTo(length / 2, width / 2, length / 2 - corner, width / 2)
	shape.lineTo(-length / 2 + corner, width / 2)
	shape.quadraticCurveTo(-length / 2, width / 2, -length / 2, width / 2 - corner)
	shape.lineTo(-length / 2, -width / 2 + corner)
	shape.quadraticCurveTo(-length / 2, -width / 2, -length / 2 + corner, -width / 2)
	for (const cylinder of CYLINDERS) {
		const hole = new THREE.Path()
		hole.absarc(cylinderX(cylinder) - ENGINE_CENTER_X, 0, boreRadius, 0, TAU, true)
		shape.holes.push(hole)
	}
	const geometry = new THREE.ExtrudeGeometry(shape, {depth: height, bevelEnabled: false, curveSegments: 64})
	geometry.rotateX(-Math.PI / 2)
	geometry.computeVertexNormals()
	return geometry
}

/** Each lobe is the inverse of the same lift curve used by the valve follower.
 * The lower contact direction follows the inclined valve stem, and the shaft
 * rotates at half crank speed. This is an ideal radial point-follower profile.
 */
export function createCamLobe(cylinder: CylinderNumber, valve: ValveType) {
	const side = valve === 'intake' ? -1 : 1
	const contactAngle = Math.PI + side * G.valveInclination
	const shape = new THREE.Shape()
	for (let i = 0; i <= 144; i++) {
		const polar = (i / 144) * TAU
		const crankAngleAtContact = ((contactAngle - polar) * 360) / Math.PI
		const radius = E.timing.camBaseRadius + valveLift(crankAngleAtContact - E.firingOffsets[cylinder], valve)
		const u = -Math.sin(polar) * radius
		const v = Math.cos(polar) * radius
		if (i === 0) shape.moveTo(u, v)
		else shape.lineTo(u, v)
	}
	shape.closePath()
	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: G.camLobeWidth,
		bevelEnabled: true,
		bevelSegments: 2,
		steps: 1,
		bevelSize: G.ringTube / 4,
		bevelThickness: G.ringTube / 4,
	})
	geometry.translate(0, 0, -G.camLobeWidth / 2)
	geometry.rotateY(Math.PI / 2)
	geometry.computeVertexNormals()
	return geometry
}

export function createCrankWeb() {
	const shape = new THREE.Shape()
	const r = G.crankWebRadius
	shape.moveTo(-G.crankPinRadius, E.crankRadius)
	shape.quadraticCurveTo(-r * 0.7, r * 0.6, -r, -r * 0.2)
	shape.absarc(0, -r * 0.2, r, Math.PI, TAU, false)
	shape.quadraticCurveTo(r * 0.7, r * 0.6, G.crankPinRadius, E.crankRadius)
	shape.quadraticCurveTo(0, E.crankRadius + G.crankPinRadius, -G.crankPinRadius, E.crankRadius)
	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: G.crankWebThickness,
		bevelEnabled: true,
		bevelSize: G.ringTube,
		bevelThickness: G.ringTube,
		bevelSegments: 3,
	})
	geometry.translate(0, 0, -G.crankWebThickness / 2)
	geometry.rotateY(Math.PI / 2)
	geometry.computeVertexNormals()
	return geometry
}

export function createValveSpring() {
	const points = Array.from({length: 145}, (_, index) => {
		const t = index / 144
		const theta = t * TAU * G.valveSpringTurns
		return new THREE.Vector3(
			Math.cos(theta) * G.valveSpringRadius,
			t * G.valveSpringHeight,
			Math.sin(theta) * G.valveSpringRadius,
		)
	})
	return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 144, G.valveSpringWire, 6, false)
}

/** Machined big/small rod ends have flat cheeks and a real pin bore. */
export function createRodEye(outerRadius: number, innerRadius: number) {
	const shape = new THREE.Shape()
	shape.absarc(0, 0, outerRadius, 0, TAU, false)
	const hole = new THREE.Path()
	hole.absarc(0, 0, innerRadius, 0, TAU, true)
	shape.holes.push(hole)
	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: G.rodThickness,
		bevelEnabled: true,
		curveSegments: 32,
		bevelThickness: G.ringTube / 4,
		bevelSize: G.ringTube / 4,
		bevelSegments: 2,
	})
	geometry.translate(0, 0, -G.rodThickness / 2)
	geometry.rotateY(Math.PI / 2)
	return geometry
}

type Point = {x: number; y: number}
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

/** Convex hull of the three pitch circles gives the tensioned chain's tangent
 * runs and wrapped arcs without an invented triangular path through the gears.
 */
export function createTimingPath() {
	return createPitchLoop(
		[
			{z: 0, y: E.crankY, radius: G.crankSprocketRadius},
			{z: -G.camZ, y: G.camY, radius: G.camSprocketRadius},
			{z: G.camZ, y: G.camY, radius: G.camSprocketRadius},
		],
		G.timingFrontX,
	)
}

export function createPitchLoop(circles: readonly {z: number; y: number; radius: number}[], x: number) {
	const points = circles
		.flatMap((circle) =>
			Array.from({length: 96}, (_, index) => {
				const angle = (index / 96) * TAU
				return {x: circle.z + Math.cos(angle) * circle.radius, y: circle.y + Math.sin(angle) * circle.radius}
			}),
		)
		.sort((a, b) => a.x - b.x || a.y - b.y)
	const lower: Point[] = []
	for (const point of points) {
		while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
			lower.pop()
		lower.push(point)
	}
	const upper: Point[] = []
	for (const point of [...points].reverse()) {
		while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
			upper.pop()
		upper.push(point)
	}
	const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)]
	const path = new THREE.CurvePath<THREE.Vector3>()
	hull.forEach((point, index) => {
		const next = hull[(index + 1) % hull.length]
		path.add(
			new THREE.LineCurve3(new THREE.Vector3(x, point.y, point.x), new THREE.Vector3(x, next.y, next.x)),
		)
	})
	return path
}

export function createTube(points: readonly (readonly [number, number, number])[], radius: number) {
	return new THREE.TubeGeometry(
		new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))),
		40,
		radius,
		10,
		false,
	)
}

export function createRibbonLoop(path: THREE.CurvePath<THREE.Vector3>, width: number, thickness: number) {
	const positions: number[] = []
	const indices: number[] = []
	const segments = 192
	for (let index = 0; index <= segments; index++) {
		const t = index / segments
		const point = path.getPointAt(t)
		const tangent = path.getTangentAt(t)
		const normal = new THREE.Vector3(0, tangent.z, -tangent.y).normalize()
		for (const [across, radial] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1],
		]) {
			positions.push(
				point.x + (across * width) / 2,
				point.y + (normal.y * radial * thickness) / 2,
				point.z + (normal.z * radial * thickness) / 2,
			)
		}
		if (index < segments)
			for (let corner = 0; corner < 4; corner++) {
				const a = index * 4 + corner
				const b = index * 4 + ((corner + 1) % 4)
				indices.push(a, a + 4, b, b, a + 4, b + 4)
			}
	}
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
	geometry.setIndex(indices)
	geometry.computeVertexNormals()
	return geometry
}

export function createXrayMaterial() {
	return new THREE.ShaderMaterial({
		uniforms: {
			color: {value: new THREE.Color(VEHICLE_SPEC.materials.xray)},
			faceOpacity: {value: VEHICLE_SPEC.materials.xrayFaceOpacity},
		},
		vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
		fragmentShader: `
      uniform vec3 color;
      uniform float faceOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(color, faceOpacity + rim * 0.23);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
		transparent: true,
		depthWrite: false,
		side: THREE.FrontSide,
	})
}

/** A small procedural roughness variation supplies the cast finish without
 * downloading a texture or making the machined steel share that grain. */
export function createCastAluminumMaterial() {
	const material = new THREE.MeshStandardMaterial(VEHICLE_SPEC.materials.aluminum)
	material.onBeforeCompile = (shader) => {
		shader.vertexShader = `varying vec3 vCastingPosition;\n${shader.vertexShader}`.replace(
			'#include <begin_vertex>',
			'#include <begin_vertex>\nvCastingPosition = position;',
		)
		shader.fragmentShader = `varying vec3 vCastingPosition;\n${shader.fragmentShader}`.replace(
			'#include <roughnessmap_fragment>',
			`#include <roughnessmap_fragment>
        vec3 grainPosition = vCastingPosition * ${(1 / G.ringTube).toFixed(1)};
        float grain = sin(grainPosition.x * 1.7) * sin(grainPosition.y * 2.3) * sin(grainPosition.z * 1.9);
        roughnessFactor = clamp(roughnessFactor + grain * 0.045, 0.1, 1.0);
      `,
		)
	}
	material.customProgramCacheKey = () => 'car-teardown-cast-aluminum-1'
	return material
}
