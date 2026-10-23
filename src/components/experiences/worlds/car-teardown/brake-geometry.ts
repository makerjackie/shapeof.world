import * as T from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {BRAKE_GEOMETRY as B, VEHICLE_SPEC as S} from './vehicle-spec'

export function brakeRing(inner: number, outer: number, depth: number) {
	const shape = new T.Shape()
	shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
	const hole = new T.Path()
	hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
	shape.holes.push(hole)
	const geometry = new T.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: 64})
	geometry.translate(0, 0, -depth / 2)
	return geometry
}

export function brakePad(front: boolean) {
	const radius = (front ? S.brakes.front : S.brakes.rear).diameter / 2 - B.padOuterInset
	const a = Math.PI - B.padHalfAngle,
		b = Math.PI + B.padHalfAngle
	const shape = new T.Shape()
	shape.moveTo(B.padInnerRadius * Math.cos(a), B.padInnerRadius * Math.sin(a))
	shape.lineTo(radius * Math.cos(a), radius * Math.sin(a))
	shape.absarc(0, 0, radius, a, b, false)
	shape.lineTo(B.padInnerRadius * Math.cos(b), B.padInnerRadius * Math.sin(b))
	shape.absarc(0, 0, B.padInnerRadius, b, a, true)
	shape.closePath()
	const geometry = new T.ExtrudeGeometry(shape, {
		depth: B.padThickness,
		bevelEnabled: false,
		curveSegments: 24,
	})
	geometry.translate(0, 0, -B.padThickness / 2)
	return geometry
}

/** A cup behind the inner piston, two bridges, and the outer reaction fingers. */
export function floatingCaliperBody(front: boolean) {
	const spec = front ? S.brakes.front : S.brakes.rear
	const gap = B.padGap * B.gapMagnification
	const innerFace = -spec.thickness / 2 - gap - B.padThickness
	const cup = brakeRing(
		spec.pistonDiameter / 2 + B.pistonWall / 2,
		spec.pistonDiameter / 2 + B.caliperWall,
		B.pistonLength,
	)
	cup.translate(-B.caliperRadialPosition, 0, innerFace - B.pistonLength / 2)
	const pieces: T.BufferGeometry[] = [cup]
	const addBox = (size: [number, number, number], pos: [number, number, number]) => {
		const g = new T.BoxGeometry(...size).toNonIndexed()
		g.translate(...pos)
		pieces.push(g)
	}
	addBox(
		[B.caliperWidth, B.caliperHeight, B.caliperWall],
		[-B.caliperRadialPosition, 0, innerFace - B.pistonLength],
	)
	for (const side of [-1, 1]) {
		// The bridge crosses around the disc's outer circumference, never through
		// the friction annulus. Both fingers sit beyond the outer brake pad.
		addBox(
			[B.caliperWall * 2, B.caliperWall * 2, B.caliperBridgeDepth],
			[-spec.diameter / 2 - B.caliperWall, side * B.caliperHeight * 0.37, 0],
		)
		addBox(
			[B.caliperWidth, B.caliperWall * 2, B.caliperWall],
			[
				-B.caliperRadialPosition - B.caliperWall,
				side * B.caliperHeight * 0.37,
				spec.thickness / 2 + gap + B.padThickness + B.caliperWall / 2,
			],
		)
		addBox(
			[B.caliperWall * 2, B.caliperHeight * 0.65, B.caliperWall],
			[
				-B.caliperRadialPosition + side * B.caliperWidth * 0.26,
				0,
				spec.thickness / 2 + gap + B.padThickness + B.caliperWall / 2,
			],
		)
	}
	for (const geometry of pieces) geometry.deleteAttribute('uv')
	const result = mergeGeometries(pieces)!
	pieces.forEach((geometry) => geometry.dispose())
	return result
}

export function caliperXrayMaterial() {
	return new T.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		side: T.DoubleSide,
		uniforms: {
			color: {value: new T.Color(B.caliperXrayColor)},
			opacity: {value: B.caliperXrayOpacity},
		},
		vertexShader: `varying vec3 vNormal; varying vec3 vEye;
		void main(){ vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p; }`,
		fragmentShader: `uniform vec3 color;uniform float opacity;varying vec3 vNormal;varying vec3 vEye;
		void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.);gl_FragColor=vec4(color,opacity*.28+f*opacity*2.4);}`,
	})
}
