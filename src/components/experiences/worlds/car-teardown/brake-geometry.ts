import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ROAD_TEARDOWN_SPEC as R } from './road-teardown-spec'
import { BRAKE_GEOMETRY as B, VEHICLE_SPEC as S } from './vehicle-spec'

export function brakeRing(inner: number, outer: number, depth: number) {
	const shape = new T.Shape()
	shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
	const hole = new T.Path()
	hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
	shape.holes.push(hole)
	const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 })
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

/** Closed piston cup and two cast C ribs. The open throat straddles the disc,
 * while the reaction fingers press the outer pad; no broad rectangular shell. */
export function floatingCaliperBody(front: boolean) {
	const spec = front ? S.brakes.front : S.brakes.rear
	const gap = B.padGap * B.gapMagnification
	const innerFace = -spec.thickness / 2 - gap - B.padThickness
	const outerFace = spec.thickness / 2 + gap + B.padThickness
	const cup = brakeRing(
		spec.pistonDiameter / 2 + B.pistonWall / 2,
		spec.pistonDiameter / 2 + B.caliperWall,
		B.pistonLength,
	)
	cup.translate(-B.caliperRadialPosition, 0, innerFace - B.pistonLength / 2)
	const cap = new T.CylinderGeometry(
		spec.pistonDiameter / 2 + B.caliperWall,
		spec.pistonDiameter / 2 + B.caliperWall,
		B.caliperWall,
		40,
	).toNonIndexed()
	cap.rotateX(Math.PI / 2)
	cap.translate(-B.caliperRadialPosition, 0, innerFace - B.pistonLength - B.caliperWall / 2)
	const pieces: T.BufferGeometry[] = [cup, cap]
	const bridgeX = -spec.diameter / 2 - B.caliperWall * 2.5
	const innerX = -B.caliperRadialPosition + B.caliperWidth * 0.36
	const backZ = innerFace - B.pistonLength
	const wall = B.caliperWall * 1.5
	// In this profile, x is radial and y becomes axial z after extrusion.
	const c = new T.Shape()
	c.moveTo(innerX, backZ - wall)
	c.lineTo(bridgeX + wall, backZ - wall)
	c.quadraticCurveTo(bridgeX - wall, backZ - wall, bridgeX - wall, backZ + wall)
	c.lineTo(bridgeX - wall, outerFace)
	c.quadraticCurveTo(bridgeX - wall, outerFace + wall, bridgeX + wall, outerFace + wall)
	c.lineTo(innerX, outerFace + wall)
	c.lineTo(innerX, outerFace)
	c.lineTo(bridgeX, outerFace)
	c.lineTo(bridgeX, backZ)
	c.lineTo(innerX, backZ)
	c.closePath()
	for (const side of [-1, 1]) {
		const rib = new T.ExtrudeGeometry(c, {
			depth: B.caliperWall * 2,
			bevelEnabled: true,
			bevelSegments: R.brakes.castingSegments,
			bevelSize: R.brakes.castingBevel,
			bevelThickness: R.brakes.castingBevel,
			curveSegments: 12,
		})
		rib.translate(0, 0, -B.caliperWall)
		rib.rotateX(Math.PI / 2)
		rib.translate(0, side * B.caliperHeight * 0.31, 0)
		pieces.push(rib)
		// Cylindrical guide-pin bosses visibly connect the casting to its sliders.
		const boss = brakeRing(
			B.guidePinRadius * 1.18,
			B.guidePinRadius + B.caliperWall,
			B.caliperWall * 3,
		)
		boss.translate(-B.caliperRadialPosition, side * B.guidePinOffsetY, backZ + B.caliperWall)
		pieces.push(boss)
	}
	for (const geometry of pieces) geometry.deleteAttribute('uv')
	const result = mergeGeometries(pieces)!
	result.computeVertexNormals()
	pieces.forEach((g) => g.dispose())
	return result
}

export function caliperXrayMaterial() {
	return new T.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		side: T.DoubleSide,
		uniforms: {
			color: { value: new T.Color(B.caliperXrayColor) },
			opacity: { value: B.caliperXrayOpacity },
		},
		vertexShader: `varying vec3 vNormal; varying vec3 vEye;
		void main(){ vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p; }`,
		fragmentShader: `uniform vec3 color;uniform float opacity;varying vec3 vNormal;varying vec3 vEye;
		void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.);gl_FragColor=vec4(color,opacity*.28+f*opacity*2.4);}`,
	})
}
