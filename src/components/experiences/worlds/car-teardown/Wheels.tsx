import { radialGeometry, mergeOwned } from './repeated-geometry'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from './animation'
import * as THREE from 'three'
import { TeardownPart } from './TeardownPart'
import { VEHICLE_SPEC as V, WHEEL_GEOMETRY as W } from './vehicle-spec'

/** A moulded tyre section with rounded shoulders. Tread is a procedural bump
 * field in metres, so its circumferential channels remain visible up close. */
function createTyre() {
	const curve = new THREE.CatmullRomCurve3(
		W.tyreProfile.map(([r, z]) => new THREE.Vector3(r * V.wheels.radius, z * V.wheels.width, 0)),
	)
	const profile = curve
		.getPoints(W.sidewallSegments * (W.tyreProfile.length - 1))
		.map((p) => new THREE.Vector2(p.x, p.y))
	const geometry = new THREE.LatheGeometry(profile, W.radialSegments)
	geometry.rotateX(Math.PI / 2)
	return geometry
}

function createRubber() {
	const material = new THREE.MeshStandardMaterial(V.materials.rubber)
	material.onBeforeCompile = (shader) => {
		shader.vertexShader = 'varying vec3 vTyrePoint;\n' + shader.vertexShader
		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			'#include <begin_vertex>\nvTyrePoint = position;',
		)
		shader.fragmentShader = 'varying vec3 vTyrePoint;\n' + shader.fragmentShader
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <normal_fragment_maps>',
			`
      #include <normal_fragment_maps>
      float radius = length(vTyrePoint.xy);
      float axial = vTyrePoint.z / ${V.wheels.width.toFixed(6)};
      float around = atan(vTyrePoint.y, vTyrePoint.x) / 6.28318530718;
      float treadMask = smoothstep(${(V.wheels.radius * 0.94).toFixed(6)}, ${(V.wheels.radius * 0.985).toFixed(6)}, radius);
      float channels = min(min(abs(axial - 0.29), abs(axial + 0.29)), min(abs(axial - 0.10), abs(axial + 0.10)));
      float continuousGroove = 1.0 - smoothstep(${(W.treadGrooveWidth / V.wheels.width / 2).toFixed(6)}, ${((W.treadGrooveWidth / V.wheels.width) * 0.75).toFixed(6)}, channels);
      float diagonal = abs(fract(around * ${W.treadRepeats.toFixed(1)} + abs(axial) * 2.1) - 0.5);
      float diagonalGroove = (1.0 - smoothstep(0.008, 0.024, diagonal)) * smoothstep(0.08, 0.22, abs(axial));
      float height = -(${W.treadGrooveDepth.toFixed(6)} * continuousGroove + ${W.sipeDepth.toFixed(6)} * diagonalGroove) * treadMask;
      vec3 sigmaX = dFdx(-vViewPosition);
      vec3 sigmaY = dFdy(-vViewPosition);
      vec3 r1 = cross(sigmaY, normal);
      vec3 r2 = cross(normal, sigmaX);
      float det = dot(sigmaX, r1);
      vec3 gradient = sign(det) * (dFdx(height) * r1 + dFdy(height) * r2);
      // At a silhouette the screen-space derivatives can become degenerate.
      // Keep the geometric normal instead of propagating a NaN into bloom/AO.
      vec3 treadNormal = abs(det) * normal - gradient;
      float treadNormalLength2 = dot(treadNormal, treadNormal);
      if (treadNormalLength2 > 1e-16) normal = treadNormal * inversesqrt(treadNormalLength2);
      diffuseColor.rgb *= 1.0 - (continuousGroove * 0.17 + diagonalGroove * 0.035) * treadMask;
    `,
		)
	}
	material.customProgramCacheKey = () => 'car-road-tyre-round2'
	return material
}

function createSpoke() {
	const shape = new THREE.Shape()
	const root = W.spokeInnerRadius
	const tip = W.spokeOuterRadius
	shape.moveTo(-W.spokeRootWidth / 2, root)
	shape.bezierCurveTo(
		-W.spokeRootWidth / 2,
		(root + tip) / 2,
		W.spokeBend - W.spokeTipWidth / 2,
		tip * 0.88,
		W.spokeBend - W.spokeTipWidth / 2,
		tip,
	)
	shape.lineTo(W.spokeBend + W.spokeTipWidth / 2, tip)
	shape.bezierCurveTo(
		W.spokeBend + W.spokeTipWidth / 2,
		tip * 0.88,
		W.spokeRootWidth / 2,
		(root + tip) / 2,
		W.spokeRootWidth / 2,
		root,
	)
	shape.closePath()
	return new THREE.ExtrudeGeometry(shape, {
		depth: W.spokeDepth,
		bevelEnabled: true,
		bevelSegments: 3,
		steps: 1,
		bevelSize: W.spokeRootWidth / 9,
		bevelThickness: W.spokeRootWidth / 9,
		curveSegments: 16,
	})
}

export type WheelPose = { steer: number; heave: number }
export function Wheel({
	axle,
	side,
	explode = 0,
	rearSpinRef,
	poseRef,
	spinRef,
}: {
	axle: 'front' | 'rear'
	side: -1 | 1
	explode?: number
	rearSpinRef?: RefObject<number>
	poseRef?: RefObject<WheelPose>
	spinRef?: RefObject<number>
}) {
	const spin = useRef<THREE.Group>(null)
	const pose = useRef<THREE.Group>(null)
	useFrame(() => {
		const rotation = spinRef ?? (axle === 'rear' ? rearSpinRef : undefined)
		if (spin.current && rotation) spin.current.rotation.z = side * rotation.current
		if (pose.current && poseRef) {
			pose.current.position.y = V.wheels.radius + poseRef.current.heave
			pose.current.rotation.y = (side < 0 ? Math.PI : 0) + poseRef.current.steer
		}
	})
	const objects = useMemo(
		() => ({
			tyre: createTyre(),
			rubber: createRubber(),
			spoke: radialGeometry(createSpoke(), W.spokes, 0),
			bolts: mergeOwned(
				Array.from({ length: 5 }, (_, i) =>
					new THREE.CylinderGeometry(W.boltRadius, W.boltRadius, W.hubDepth / 3, 6)
						.rotateX(Math.PI / 2)
						.translate(
							Math.sin((i / 5) * Math.PI * 2) * W.boltCircleRadius,
							Math.cos((i / 5) * Math.PI * 2) * W.boltCircleRadius,
							W.faceOffset + W.hubDepth / 10,
						),
				),
			),
		}),
		[],
	)
	useEffect(
		() => () => {
			objects.tyre.dispose()
			objects.spoke.dispose()
			objects.bolts.dispose()
			objects.rubber.dispose()
		},
		[objects],
	)
	const track = axle === 'front' ? V.wheels.frontTrack : V.wheels.rearTrack
	const x = axle === 'front' ? V.dimensions.frontAxleX : V.dimensions.rearAxleX
	const corner = `${axle}-${side < 0 ? 'left' : 'right'}`
	return (
		<group
			ref={pose}
			position={[x, V.wheels.radius, side * (track / 2 + V.explosion.wheelOutward * explode)]}
			rotation={[0, side < 0 ? Math.PI : 0, 0]}
		>
			<group ref={spin}>
				<TeardownPart
					id="susp-tyres"
					representative={axle === 'front' && side > 0}
					anchor={[0, 0, 0]}
				>
					<mesh
						geometry={objects.tyre}
						material={objects.rubber}
						castShadow
						receiveShadow
						userData={{ partId: `tyre-${corner}` }}
					/>
				</TeardownPart>
				<TeardownPart
					id="susp-rims"
					representative={axle === 'front' && side > 0}
					anchor={[0, 0, 0]}
				>
					<group userData={{ partId: `rim-${corner}` }}>
						<mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
							<cylinderGeometry
								args={[
									W.rimLipRadius - W.barrelThickness,
									W.rimLipRadius - W.barrelThickness,
									V.wheels.width * 0.78,
									W.radialSegments,
									1,
									true,
								]}
							/>
							<meshStandardMaterial
								color="#60666c"
								metalness={1}
								roughness={0.29}
								side={THREE.DoubleSide}
							/>
						</mesh>
						{[-1, 1].map((end) => (
							<mesh key={end} position={[0, 0, end * W.faceOffset]} castShadow>
								<torusGeometry args={[W.rimLipRadius, W.rimLipTube, 12, W.radialSegments]} />
								<meshStandardMaterial color="#c2c6cb" metalness={1} roughness={0.21} />
							</mesh>
						))}
						<mesh
							geometry={objects.spoke}
							position={[0, 0, W.faceOffset - W.spokeDepth]}
							castShadow
						>
							<meshStandardMaterial color="#bfc4c9" metalness={1} roughness={0.25} />
						</mesh>
						<mesh
							position={[0, 0, W.faceOffset - W.hubDepth / 2]}
							rotation={[Math.PI / 2, 0, 0]}
							castShadow
						>
							<cylinderGeometry args={[W.hubRadius, W.hubRadius, W.hubDepth, 48]} />
							<meshStandardMaterial color="#b4bbc3" metalness={1} roughness={0.25} />
						</mesh>
						<mesh geometry={objects.bolts}>
							<meshStandardMaterial color="#31373d" metalness={1} roughness={0.3} />
						</mesh>
					</group>
				</TeardownPart>
			</group>
		</group>
	)
}

export function Wheels({
	explode = 0,
	rearSpinRef,
	axle: axleFilter,
}: {
	explode?: number
	rearSpinRef?: RefObject<number>
	axle?: 'front' | 'rear'
}) {
	return (
		<group name="Wheels">
			{(['front', 'rear'] as const)
				.filter((axle) => !axleFilter || axle === axleFilter)
				.flatMap((axle) =>
					([-1, 1] as const).map((side) => (
						<Wheel
							key={`${axle}-${side}`}
							axle={axle}
							side={side}
							explode={explode}
							rearSpinRef={rearSpinRef}
						/>
					)),
				)}
		</group>
	)
}
