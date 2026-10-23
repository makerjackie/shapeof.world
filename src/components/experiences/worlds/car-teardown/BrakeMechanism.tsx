import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import {Html} from '@react-three/drei'
import * as T from 'three'
import {useExperienceI18n} from '~/i18n/experience'
import {BRAKE_GEOMETRY as B, VEHICLE_SPEC as S} from './vehicle-spec'
import {caliperTravel, type BrakeState} from './brake-model'
import {brakePad, brakeRing, caliperXrayMaterial, floatingCaliperBody} from './brake-geometry'

type Point = [number, number, number]
type StateRef = RefObject<BrakeState>
const AXIS_X: Point = [0, 0, -Math.PI / 2]
const AXIS_Z: Point = [Math.PI / 2, 0, 0]

function CaliperLabel({
	position,
	label,
	dx,
	dy,
}: {
	position: Point
	label: string
	dx: number
	dy: number
}) {
	const tx = useExperienceI18n(),
		left = dx < 0
	return (
		<Html position={position} zIndexRange={[20, 0]} style={{pointerEvents: 'none'}}>
			<svg
				width="1"
				height="1"
				style={{overflow: 'visible', position: 'absolute'}}
				aria-hidden="true">
				<path
					d={`M0 0 L${dx * 0.65} ${dy} H${dx}`}
					fill="none"
					stroke="#a5b9c6"
					strokeWidth=".7"
					opacity=".8"
				/>
				<circle r="1.6" fill="#e4af70" />
			</svg>
			<span
				style={{
					position: 'absolute',
					left: dx + (left ? -5 : 5),
					top: dy - 7,
					transform: left ? 'translateX(-100%)' : undefined,
					color: '#c1cdd5',
					fontSize: 11,
					whiteSpace: 'nowrap',
					textShadow: '0 1px 5px #0b0c0f',
					letterSpacing: '.04em',
				}}>
				{tx(label)}
			</span>
		</Html>
	)
}

function Cylinder({
	position,
	radius,
	length,
	axis = 'z',
	color,
	id,
}: {
	position: Point
	radius: number
	length: number
	axis?: 'x' | 'y' | 'z'
	color?: string
	id?: string
}) {
	return (
		<mesh
			position={position}
			rotation={axis === 'x' ? AXIS_X : axis === 'z' ? AXIS_Z : [0, 0, 0]}
			castShadow
			userData={{partId: id}}>
			<cylinderGeometry args={[radius, radius, length, 40]} />
			<meshStandardMaterial {...S.materials.aluminum} color={color ?? S.materials.aluminum.color} />
		</mesh>
	)
}

function Rotor({front, stateRef, index}: {front: boolean; stateRef: StateRef; index: number}) {
	const rotating = useRef<T.Group>(null),
		spec = front ? S.brakes.front : S.brakes.rear
	const resources = useMemo(() => {
		const ring = brakeRing(
			B.rotorInnerRadius,
			spec.diameter / 2,
			front ? B.rotorFaceThickness : spec.thickness,
		)
		const hat = brakeRing(B.rotorBoreRadius, B.rotorHatRadius, B.rotorHatDepth)
		// The flat inner face mostly reflects the dark room at this inspection
		// angle. Give the machined cast-iron surface a modest diffuse component
		// and a broader reflection; the modeled concentric grooves provide its
		// brushed finish without relying on ExtrudeGeometry's planar UV tangent.
		const disc = new T.MeshStandardMaterial({
			...S.materials.disc,
			color: S.materials.aluminum.color,
			metalness: 0.72,
			roughness: 0.52,
			envMapIntensity: 1.15,
		})
		return {ring, hat, disc}
	}, [front])
	useEffect(
		() => () => Object.values(resources).forEach((resource) => resource.dispose()),
		[resources],
	)
	// Positive world-Z rotation rolls a wheel toward the vehicle's +X nose.
	useFrame(() => {
		if (rotating.current) rotating.current.rotation.z = stateRef.current.wheelAngle
	})
	const radius = spec.diameter / 2
	return (
		<group ref={rotating} userData={{partId: `disc-${index}`}}>
			{(front ? [-1, 1] : [0]).map((side) => (
				<mesh
					key={side}
					geometry={resources.ring}
					material={resources.disc}
					position={[0, 0, (side * (spec.thickness - B.rotorFaceThickness)) / 2]}
					castShadow
				/>
			))}
			{front &&
				Array.from({length: B.rotorVanes}, (_, i) => {
					const angle = (i / B.rotorVanes) * Math.PI * 2,
						r = (radius + B.rotorInnerRadius) / 2
					return (
						<mesh
							key={i}
							position={[r * Math.cos(angle), r * Math.sin(angle), 0]}
							rotation={[0, 0, angle]}
							castShadow>
							<boxGeometry
								args={[
									radius - B.rotorInnerRadius,
									B.rotorVaneThickness,
									spec.thickness - B.rotorFaceThickness * 2,
								]}
							/>
							<meshStandardMaterial {...S.materials.steel} color="#565b61" />
						</mesh>
					)
				})}
			<mesh
				geometry={resources.hat}
				material={resources.disc}
				position={[0, 0, -B.rotorHatDepth / 3]}
				castShadow
			/>
			{Array.from({length: 5}, (_, i) => {
				const a = (i / 5) * Math.PI * 2
				return (
					<Cylinder
						key={i}
						radius={B.guidePinRadius}
						length={B.caliperWall}
						position={[
							B.rotorHatRadius * 0.67 * Math.cos(a),
							B.rotorHatRadius * 0.67 * Math.sin(a),
							B.rotorHatDepth * 0.2,
						]}
						color="#4f5459"
					/>
				)
			})}
			{[-1, 1].flatMap((side) =>
				Array.from({length: B.rotorGrooveCount}, (_, i) => {
					const r =
						B.rotorInnerRadius +
						((radius - B.rotorInnerRadius) * (i + 1)) / (B.rotorGrooveCount + 1)
					return (
						<mesh
							key={`${side}-${i}`}
							position={[0, 0, side * (spec.thickness / 2 + B.rotorGrooveWidth)]}>
							<torusGeometry args={[r, B.rotorGrooveWidth, 4, 96]} />
							<meshStandardMaterial color="#899096" metalness={1} roughness={0.43} />
						</mesh>
					)
				}),
			)}
		</group>
	)
}

function FloatingCaliper({
	front,
	stateRef,
	closeup,
	index,
}: {
	front: boolean
	stateRef: StateRef
	closeup: boolean
	index: number
}) {
	const body = useRef<T.Group>(null),
		piston = useRef<T.Mesh>(null),
		innerPad = useRef<T.Mesh>(null)
	const spec = front ? S.brakes.front : S.brakes.rear,
		gap = B.padGap * B.gapMagnification
	const innerZ = -spec.thickness / 2 - gap - B.padThickness / 2
	const pistonZ = innerZ - B.padThickness / 2 - B.pistonLength / 2
	const resources = useMemo(() => {
		const casting = floatingCaliperBody(front)
		return {
			casting,
			edges: new T.EdgesGeometry(casting, 40),
			pad: brakePad(front),
			piston: brakeRing(
				spec.pistonDiameter / 2 - B.pistonWall,
				spec.pistonDiameter / 2,
				B.pistonLength,
			),
			xray: caliperXrayMaterial(),
		}
	}, [front])
	useEffect(
		() => () => Object.values(resources).forEach((resource) => resource.dispose()),
		[resources],
	)
	useFrame(() => {
		const travel = caliperTravel(stateRef.current)
		if (body.current) body.current.position.z = travel.body
		if (piston.current) piston.current.position.z = pistonZ + travel.piston
		if (innerPad.current) innerPad.current.position.z = innerZ + travel.innerPad
	})
	return (
		<group>
			{/* The carrier and guide pins stay fixed to the knuckle. */}
			{[-1, 1].map((side) => (
				<group key={side}>
					<Cylinder
						id={`brake-guide-pin-${(index - 1) * 2 + (side > 0 ? 2 : 1)}`}
						position={[-B.caliperRadialPosition, side * B.guidePinOffsetY, 0]}
						radius={B.guidePinRadius}
						length={B.guidePinLength}
					/>
					<mesh
						position={[-B.caliperRadialPosition, side * B.guidePinOffsetY, -B.guidePinLength / 2]}
						castShadow
						userData={{partId: `caliper-bracket-${index}`}}>
						<boxGeometry args={[B.caliperWidth, B.bracketThickness, B.bracketThickness]} />
						<meshStandardMaterial {...S.materials.steel} />
					</mesh>
				</group>
			))}
			<mesh
				ref={innerPad}
				geometry={resources.pad}
				position={[0, 0, innerZ]}
				castShadow
				userData={{partId: `brake-inner-pad-${index}`}}>
				<meshStandardMaterial color={B.padColor} roughness={0.94} />
			</mesh>
			<group ref={body}>
				<mesh
					geometry={resources.casting}
					material={closeup ? resources.xray : undefined}
					castShadow={!closeup}
					userData={{partId: `caliper-${index}`}}>
					{!closeup && <meshStandardMaterial {...S.materials.caliper} />}
				</mesh>
				{closeup && (
					<lineSegments geometry={resources.edges}>
						<lineBasicMaterial
							color={B.caliperXrayColor}
							transparent
							opacity={0.48}
							depthWrite={false}
						/>
					</lineSegments>
				)}
				<mesh
					ref={piston}
					geometry={resources.piston}
					position={[-B.caliperRadialPosition, 0, pistonZ]}
					castShadow
					userData={{partId: `caliper-piston-${index}`}}>
					<meshStandardMaterial {...S.materials.steel} />
				</mesh>
				<mesh
					position={[-B.caliperRadialPosition, 0, pistonZ + B.pistonLength * 0.34]}
					userData={{partId: `caliper-seal-${index}`}}>
					<torusGeometry args={[spec.pistonDiameter / 2 + B.sealWire / 2, B.sealWire, 10, 64]} />
					<meshStandardMaterial {...S.materials.rubber} />
				</mesh>
				<mesh
					geometry={resources.pad}
					position={[0, 0, -innerZ]}
					castShadow
					userData={{partId: `brake-outer-pad-${index}`}}>
					<meshStandardMaterial color={B.padColor} roughness={0.94} />
				</mesh>
			</group>
			{closeup && (
				<>
					<CaliperLabel
						position={[-B.caliperRadialPosition, 0, pistonZ - B.pistonLength / 2]}
						label="活塞 · 内片"
						dx={-42}
						dy={10}
					/>
					<CaliperLabel
						position={[-B.caliperRadialPosition, B.guidePinOffsetY, -B.guidePinLength / 2]}
						label="导向销"
						dx={30}
						dy={-38}
					/>
					<CaliperLabel
						position={[-B.caliperRadialPosition, -B.guidePinOffsetY * 0.45, -innerZ]}
						label="外侧刹车片"
						dx={38}
						dy={48}
					/>
				</>
			)}
		</group>
	)
}

function PressureLine({
	points,
	stateRef,
	start = 0,
	end = 1,
	id,
}: {
	points: Point[]
	stateRef: StateRef
	start?: number
	end?: number
	id: string
}) {
	const marker = useRef<T.Mesh>(null)
	const resources = useMemo(() => {
		const curve = new T.CatmullRomCurve3(
			points.map((p) => new T.Vector3(...p)),
			false,
			'catmullrom',
			0.12,
		)
		const geometry = new T.TubeGeometry(curve, 80, B.pipeRadius, 8, false)
		const progress = {value: 0},
			pressureColor = {value: new T.Color(B.pressureColor)},
			material = new T.MeshStandardMaterial({color: B.lineColor, metalness: 0.65, roughness: 0.36})
		material.onBeforeCompile = (shader) => {
			shader.uniforms.pressureProgress = progress
			shader.uniforms.pressureColor = pressureColor
			shader.vertexShader = `varying float vPipeT;\n${shader.vertexShader}`.replace(
				'#include <uv_vertex>',
				'#include <uv_vertex>\nvPipeT=uv.x;',
			)
			shader.fragmentShader =
				`uniform float pressureProgress; uniform vec3 pressureColor; varying float vPipeT;\n${shader.fragmentShader}`
					.replace(
						'#include <color_fragment>',
						'#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,pressureColor,step(vPipeT,pressureProgress)*.8);',
					)
					.replace(
						'#include <emissivemap_fragment>',
						`#include <emissivemap_fragment>
				float pressureTrail=step(vPipeT,pressureProgress)*(1.-smoothstep(0.,${B.pressureFrontLength.toFixed(3)},pressureProgress-vPipeT))*step(pressureProgress,.999);
				totalEmissiveRadiance+=pressureColor*pressureTrail*${B.pressureFrontEmission.toFixed(1)};`,
					)
		}
		material.customProgramCacheKey = () => 'car-brake-pressure-line'
		return {curve, geometry, material, progress}
	}, [JSON.stringify(points)])
	useEffect(
		() => () => {
			resources.geometry.dispose()
			resources.material.dispose()
		},
		[resources],
	)
	useFrame(() => {
		const state = stateRef.current,
			t = T.MathUtils.clamp((state.pressureFrontProgress - start) / (end - start), 0, 1)
		resources.progress.value = state.pressureBar > 0 ? t : -1
		if (marker.current) {
			marker.current.visible = state.pressureBar > 0 && t > 0 && t < 1
			marker.current.position.copy(resources.curve.getPoint(t))
		}
	})
	return (
		<group userData={{partId: id}}>
			<mesh geometry={resources.geometry} material={resources.material} />
			<mesh ref={marker}>
				<sphereGeometry args={[B.pressureMarkerRadius, 12, 8]} />
				<meshBasicMaterial color={B.pressureColor} toneMapped={false} />
			</mesh>
		</group>
	)
}

function HydraulicHardware({stateRef}: {stateRef: StateRef}) {
	const pedal = useRef<T.Group>(null),
		booster = B.boosterPosition,
		abs = B.absPosition,
		pivot = B.pedalPivot
	useFrame(() => {
		if (pedal.current)
			pedal.current.rotation.z =
				(-stateRef.current.pedalForceN / B.maxPedalForceN) * B.pedalMaxAngle
	})
	return (
		<>
			<group position={[...pivot]} ref={pedal} userData={{partId: 'brake-pedal'}}>
				<Cylinder
					position={[0, -B.pedalLength / 2, 0]}
					radius={B.pedalRodRadius}
					length={B.pedalLength}
					axis="y"
				/>
				<mesh position={[0, -B.pedalLength, 0]} castShadow>
					<boxGeometry args={[...B.pedalPlateSize]} />
					<meshStandardMaterial {...S.materials.rubber} />
				</mesh>
			</group>
			<Cylinder
				id="vacuum-booster"
				position={[...booster]}
				radius={B.boosterRadius}
				length={B.boosterDepth}
				axis="x"
				color="#343b42"
			/>
			<Cylinder
				id="master-cylinder"
				position={[booster[0] + B.boosterDepth / 2 + B.masterLength / 2, booster[1], booster[2]]}
				radius={B.masterOuterRadius}
				length={B.masterLength}
				axis="x"
			/>
			<mesh
				position={[
					booster[0] + B.masterLength / 2,
					booster[1] + B.masterOuterRadius + B.reservoirSize[1] / 2,
					booster[2],
				]}
				castShadow
				userData={{partId: 'brake-reservoir'}}>
				<boxGeometry args={[...B.reservoirSize]} />
				<meshStandardMaterial color="#c4c7b4" roughness={0.45} transparent opacity={0.8} />
			</mesh>
			<Cylinder
				position={[
					booster[0] + B.masterLength / 2,
					booster[1] + B.masterOuterRadius + B.reservoirSize[1],
					booster[2],
				]}
				radius={B.masterOuterRadius}
				length={B.caliperWall}
				axis="y"
				color="#313438"
			/>
			<mesh position={[...abs]} castShadow userData={{partId: 'abs-pump'}}>
				<boxGeometry args={[...B.absSize]} />
				<meshStandardMaterial {...S.materials.aluminum} />
			</mesh>
			<Cylinder
				position={[abs[0], abs[1], abs[2] - B.absSize[2] / 2 - B.absMotorLength / 2]}
				radius={B.absMotorRadius}
				length={B.absMotorLength}
				color="#333a42"
			/>
			<PressureLine
				id="brake-master-line"
				stateRef={stateRef}
				start={0}
				end={0.3}
				points={[
					[booster[0] + B.boosterDepth / 2 + B.masterLength, booster[1], booster[2]],
					[abs[0], booster[1] - B.masterOuterRadius * 2, abs[2]],
					[abs[0], abs[1] + B.absSize[1] / 2, abs[2]],
				]}
			/>
		</>
	)
}

/** Vehicle coordinates: rotor axes lie on ±Z; no explosion transform here. */
export function BrakeMechanism({stateRef, closeup}: {stateRef: StateRef; closeup: boolean}) {
	const wheels = [
		{front: true, x: S.dimensions.frontAxleX, track: S.wheels.frontTrack},
		{front: false, x: S.dimensions.rearAxleX, track: S.wheels.rearTrack},
	]
	return (
		<group name="hydraulic-brake-mechanism">
			{!closeup && <HydraulicHardware stateRef={stateRef} />}
			{wheels.flatMap((axle) =>
				[-1, 1].map((side) => {
					if (closeup && (!axle.front || side < 0)) return null
					const z = (side * axle.track) / 2,
						index = (axle.front ? 0 : 2) + (side > 0 ? 2 : 1),
						id = `brake-line-${index}`,
						abs = B.absPosition
					const railZ = side * (B.lineRailZ + (axle.front ? 0 : B.lineSeparation))
					return (
						<group key={id}>
							<group position={[axle.x, S.wheels.radius, z]} scale={[1, 1, side]}>
								<Rotor front={axle.front} stateRef={stateRef} index={index} />
								<FloatingCaliper
									front={axle.front}
									stateRef={stateRef}
									closeup={closeup && axle.front && side > 0}
									index={index}
								/>
							</group>
							{!closeup && (
								<PressureLine
									id={id}
									stateRef={stateRef}
									start={0.3}
									end={1}
									points={[
										[abs[0], abs[1], abs[2] + (index - 2.5) * B.lineSeparation],
										[abs[0], B.lineRailY, railZ],
										[axle.x - B.caliperRadialPosition, B.lineRailY, railZ],
										[
											axle.x - B.caliperRadialPosition,
											S.wheels.radius,
											z - (side * B.guidePinLength) / 2,
										],
									]}
								/>
							)}
						</group>
					)
				}),
			)}
		</group>
	)
}
