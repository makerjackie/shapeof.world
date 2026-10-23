import {useMemo} from 'react'
import * as THREE from 'three'
import {VEHICLE_SPEC as V, WHEEL_GEOMETRY as W} from './vehicle-spec'

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
      float channels = min(min(abs(axial - 0.32), abs(axial + 0.32)), min(abs(axial - 0.11), abs(axial + 0.11)));
      float continuousGroove = 1.0 - smoothstep(0.006, 0.019, channels);
      float diagonal = abs(fract(around * ${W.treadRepeats.toFixed(1)} + abs(axial) * 2.8) - 0.5);
      float diagonalGroove = (1.0 - smoothstep(0.028, 0.070, diagonal)) * smoothstep(0.08, 0.22, abs(axial));
      float height = -${W.treadGrooveDepth.toFixed(6)} * max(continuousGroove, diagonalGroove) * treadMask;
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
      diffuseColor.rgb *= 1.0 - max(continuousGroove, diagonalGroove) * treadMask * 0.28;
    `,
		)
	}
	material.customProgramCacheKey = () => 'car-tyre-tread-v2'
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

function Wheel({axle, side, explode}: {axle: 'front' | 'rear'; side: -1 | 1; explode: number}) {
	const objects = useMemo(() => ({tyre: createTyre(), rubber: createRubber(), spoke: createSpoke()}), [])
	const track = axle === 'front' ? V.wheels.frontTrack : V.wheels.rearTrack
	const x = axle === 'front' ? V.dimensions.frontAxleX : V.dimensions.rearAxleX
	const corner = `${axle}-${side < 0 ? 'left' : 'right'}`
	return (
		<group
			position={[x, V.wheels.radius, side * (track / 2 + V.explosion.wheelOutward * explode)]}
			rotation={[0, side < 0 ? Math.PI : 0, 0]}>
			<mesh
				geometry={objects.tyre}
				material={objects.rubber}
				castShadow
				receiveShadow
				userData={{partId: `tyre-${corner}`}}
			/>
			<group userData={{partId: `rim-${corner}`}}>
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
					<meshStandardMaterial color="#60666c" metalness={1} roughness={0.29} side={THREE.DoubleSide} />
				</mesh>
				{[-1, 1].map((end) => (
					<mesh key={end} position={[0, 0, end * W.faceOffset]} castShadow>
						<torusGeometry args={[W.rimLipRadius, W.rimLipTube, 12, W.radialSegments]} />
						<meshStandardMaterial color="#c2c6cb" metalness={1} roughness={0.21} />
					</mesh>
				))}
				{Array.from({length: W.spokes}, (_, i) => (
					<mesh
						key={i}
						geometry={objects.spoke}
						position={[0, 0, W.faceOffset - W.spokeDepth]}
						rotation={[0, 0, (i / W.spokes) * Math.PI * 2]}
						castShadow>
						<meshStandardMaterial color="#bfc4c9" metalness={1} roughness={0.25} />
					</mesh>
				))}
				<mesh position={[0, 0, W.faceOffset - W.hubDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
					<cylinderGeometry args={[W.hubRadius, W.hubRadius, W.hubDepth, 48]} />
					<meshStandardMaterial color="#b4bbc3" metalness={1} roughness={0.25} />
				</mesh>
				{Array.from({length: 5}, (_, i) => (
					<mesh
						key={i}
						position={[
							Math.sin((i / 5) * Math.PI * 2) * W.boltCircleRadius,
							Math.cos((i / 5) * Math.PI * 2) * W.boltCircleRadius,
							W.faceOffset + W.hubDepth / 10,
						]}
						rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[W.boltRadius, W.boltRadius, W.hubDepth / 3, 6]} />
						<meshStandardMaterial color="#31373d" metalness={1} roughness={0.3} />
					</mesh>
				))}
			</group>
		</group>
	)
}

export function Wheels({explode = 0}: {explode?: number}) {
	return (
		<group name="Wheels">
			{(['front', 'rear'] as const).flatMap((axle) =>
				([-1, 1] as const).map((side) => (
					<Wheel key={`${axle}-${side}`} axle={axle} side={side} explode={explode} />
				)),
			)}
		</group>
	)
}
