import {caliperGeometry, rotorGeometry} from './brake-render-geometry'
import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from './animation'
import {Html, RoundedBox} from '@react-three/drei'
import * as T from 'three'
import {useExperienceI18n} from '~/i18n/experience'
import {BRAKE_GEOMETRY as B, VEHICLE_SPEC as S, ROAD_TEARDOWN_SPEC as R} from './vehicle-spec'
import {caliperTravel, type BrakeState} from './brake-model'
import {TeardownPart, useTeardownProgress} from './TeardownPart'
import {brakeRing, caliperXrayMaterial} from './brake-geometry'

type Point = [number, number, number]
type StateRef = RefObject<BrakeState>
const AXIS_X: Point = [0, 0, -Math.PI / 2]
const AXIS_Z: Point = [Math.PI / 2, 0, 0]

function CaliperLabel({position, label, dx, dy}: {position: Point; label: string; dx: number; dy: number}) {
	const left = dx < 0
	return (
		<Html position={position} zIndexRange={[3, 0]} style={{pointerEvents: 'none'}}>
			<svg width="1" height="1" style={{overflow: 'visible', position: 'absolute'}} aria-hidden="true">
				<path d={`M0 0 L${dx * 0.65} ${dy} H${dx}`} fill="none" stroke="#a5b9c6" strokeWidth=".7" opacity=".8" />
				<circle r="1.6" fill="#e4af70" />
			</svg>
			<span
				style={{
					position: 'absolute',
					left: dx + (left ? -5 : 5),
					top: dy - 7,
					transform: left ? 'translateX(-100%)' : undefined,
					color: '#36535f',
					fontSize: 11,
					whiteSpace: 'nowrap',
					textShadow: '0 1px 4px #f4f7f4',
					letterSpacing: '.04em',
				}}
			>
				{label}
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
		<mesh position={position} rotation={axis === 'x' ? AXIS_X : axis === 'z' ? AXIS_Z : [0, 0, 0]} castShadow userData={{partId: id}}>
			<cylinderGeometry args={[radius, radius, length, 40]} />
			<meshStandardMaterial {...S.materials.aluminum} color={color ?? S.materials.aluminum.color} />
		</mesh>
	)
}

function Rotor({front, stateRef, index}: {front: boolean; stateRef: StateRef; index: number}) {
	const rotating = useRef<T.Group>(null),
		spec = front ? S.brakes.front : S.brakes.rear
	const resources = useMemo(() => {
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
		return {...rotorGeometry(front), disc}
	}, [front])
	useEffect(() => () => Object.values(resources).forEach((resource) => resource.dispose()), [resources])
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
			{front && (
				<mesh geometry={resources.vanes} castShadow>
					<meshStandardMaterial {...S.materials.steel} color="#565b61" />
				</mesh>
			)}
			<mesh geometry={resources.hat} material={resources.disc} position={[0, 0, -B.rotorHatDepth / 3]} castShadow />
			{Array.from({length: 5}, (_, i) => {
				const a = (i / 5) * Math.PI * 2
				return (
					<Cylinder
						key={i}
						radius={B.guidePinRadius}
						length={B.caliperWall}
						position={[B.rotorHatRadius * 0.67 * Math.cos(a), B.rotorHatRadius * 0.67 * Math.sin(a), B.rotorHatDepth * 0.2]}
						color="#4f5459"
					/>
				)
			})}
			<mesh geometry={resources.grooves}>
				<meshStandardMaterial color="#899096" metalness={1} roughness={0.43} />
			</mesh>
		</group>
	)
}

export function FloatingCaliper({front, stateRef, closeup, index}: {front: boolean; stateRef: StateRef; closeup: boolean; index: number}) {
	const tx = useExperienceI18n()
	const amount = useTeardownProgress()
	const body = useRef<T.Group>(null),
		piston = useRef<T.Mesh>(null),
		innerPad = useRef<T.Group>(null)
	const spec = front ? S.brakes.front : S.brakes.rear,
		gap = B.padGap * B.gapMagnification
	const innerZ = -spec.thickness / 2 - gap - B.padThickness / 2
	const pistonZ = innerZ - B.padThickness / 2 - B.pistonLength / 2
	const resources = useMemo(() => ({...caliperGeometry(front), xray: caliperXrayMaterial()}), [front])
	useEffect(() => () => Object.values(resources).forEach((resource) => resource.dispose()), [resources])
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
					<TeardownPart
						id="brake-guide-pins"
						representative={index % 2 === 0}
						anchor={[-B.caliperRadialPosition, side * B.guidePinOffsetY, 0]}
					>
						<Cylinder
							id={`brake-guide-pin-${(index - 1) * 2 + (side > 0 ? 2 : 1)}`}
							position={[-B.caliperRadialPosition, side * B.guidePinOffsetY, 0]}
							radius={B.guidePinRadius}
							length={B.guidePinLength}
						/>
					</TeardownPart>
					<TeardownPart
						id="brake-boots"
						representative={index % 2 === 0 && side > 0}
						anchor={[-B.caliperRadialPosition, side * B.guidePinOffsetY, -B.guidePinLength / 4]}
					>
						<group
							position={[-B.caliperRadialPosition, side * B.guidePinOffsetY, -B.guidePinLength / 4]}
							userData={{partId: `caliper-boot-${(index - 1) * 2 + (side > 0 ? 2 : 1)}`}}
						>
							<mesh geometry={resources.boot}>
								<meshStandardMaterial color="#202329" roughness={0.9} />
							</mesh>
						</group>
					</TeardownPart>
					<TeardownPart
						id="brake-carriers"
						representative={index % 2 === 0}
						anchor={[-B.caliperRadialPosition, side * B.guidePinOffsetY, -B.guidePinLength / 2]}
					>
						<mesh
							position={[-B.caliperRadialPosition, side * B.guidePinOffsetY, -B.guidePinLength / 2]}
							castShadow
							userData={{partId: `caliper-bracket-${index}`}}
						>
							<boxGeometry args={[B.caliperWidth, B.bracketThickness, B.bracketThickness]} />
							<meshStandardMaterial {...S.materials.steel} />
						</mesh>
					</TeardownPart>
				</group>
			))}
			<TeardownPart id="brake-carriers" representative={index % 2 === 0} anchor={[-B.caliperRadialPosition, 0, -B.guidePinLength / 2]}>
				<mesh
					position={[-B.caliperRadialPosition + B.caliperWidth / 2 - B.bracketThickness / 2, 0, -B.guidePinLength / 2]}
					castShadow
					userData={{partId: `caliper-bracket-${index}`}}
				>
					<boxGeometry args={[B.bracketThickness, B.guidePinOffsetY * 2, B.bracketThickness]} />
					<meshStandardMaterial {...S.materials.steel} />
				</mesh>
			</TeardownPart>
			<TeardownPart
				id="brake-pads"
				offset={R.brakes.innerPad}
				representative={index % 2 === 0}
				anchor={[-B.caliperRadialPosition, 0, innerZ]}
			>
				<group ref={innerPad} position={[0, 0, innerZ]} userData={{partId: `brake-inner-pad-${index}`}}>
					<mesh geometry={resources.pad} scale-z={0.7} position-z={1 * B.padThickness * 0.15} castShadow>
						<meshStandardMaterial color={B.padColor} roughness={0.94} />
					</mesh>
					<mesh geometry={resources.pad} scale-z={0.3} position-z={-1 * B.padThickness * 0.35} castShadow>
						<meshStandardMaterial color="#46515a" metalness={0.8} roughness={0.45} />
					</mesh>
				</group>
			</TeardownPart>
			<group ref={body}>
				<TeardownPart id="brake-castings" representative={index % 2 === 0} anchor={[-B.caliperRadialPosition, 0, 0]}>
					<mesh
						geometry={resources.casting}
						material={closeup && amount < 0.05 ? resources.xray : undefined}
						castShadow={!closeup}
						userData={{partId: `caliper-${index}`}}
					>
						{(!closeup || amount >= 0.05) && <meshStandardMaterial {...S.materials.caliper} />}
					</mesh>
					{closeup && (
						<lineSegments geometry={resources.edges}>
							<lineBasicMaterial color={B.caliperXrayColor} transparent opacity={0.48} depthWrite={false} />
						</lineSegments>
					)}
				</TeardownPart>
				<TeardownPart id="brake-pistons" representative={index % 2 === 0} anchor={[-B.caliperRadialPosition, 0, pistonZ]}>
					<mesh
						ref={piston}
						geometry={resources.piston}
						position={[-B.caliperRadialPosition, 0, pistonZ]}
						castShadow
						userData={{partId: `caliper-piston-${index}`}}
					>
						<meshStandardMaterial {...S.materials.steel} />
					</mesh>
				</TeardownPart>
				<TeardownPart id="brake-seals" representative={index % 2 === 0} anchor={[-B.caliperRadialPosition, 0, pistonZ]}>
					<mesh position={[-B.caliperRadialPosition, 0, pistonZ + B.pistonLength * 0.34]} userData={{partId: `caliper-seal-${index}`}}>
						<torusGeometry args={[spec.pistonDiameter / 2 + B.sealWire / 2, B.sealWire, 10, 64]} />
						<meshStandardMaterial {...S.materials.rubber} />
					</mesh>
				</TeardownPart>
				<TeardownPart id="brake-pads" offset={R.brakes.outerPad} representative={false} anchor={[-B.caliperRadialPosition, 0, -innerZ]}>
					<group position={[0, 0, -innerZ]} userData={{partId: `brake-outer-pad-${index}`}}>
						<mesh geometry={resources.pad} scale-z={0.7} position-z={-1 * B.padThickness * 0.15} castShadow>
							<meshStandardMaterial color={B.padColor} roughness={0.94} />
						</mesh>
						<mesh geometry={resources.pad} scale-z={0.3} position-z={1 * B.padThickness * 0.35} castShadow>
							<meshStandardMaterial color="#46515a" metalness={0.8} roughness={0.45} />
						</mesh>
					</group>
				</TeardownPart>
			</group>
			{closeup && amount < 0.05 && (
				<>
					<CaliperLabel position={[-B.caliperRadialPosition, 0, pistonZ - B.pistonLength / 2]} label={tx('活塞 · 内片')} dx={-42} dy={10} />
					<CaliperLabel
						position={[-B.caliperRadialPosition, B.guidePinOffsetY, -B.guidePinLength / 2]}
						label={tx('导向销')}
						dx={30}
						dy={-38}
					/>
					<CaliperLabel
						position={[-B.caliperRadialPosition, -B.guidePinOffsetY * 0.45, -innerZ]}
						label={tx('外侧刹车片')}
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
			material = new T.MeshStandardMaterial({
				color: B.lineColor,
				metalness: 0.65,
				roughness: 0.36,
			})
		material.onBeforeCompile = (shader) => {
			shader.uniforms.pressureProgress = progress
			shader.uniforms.pressureColor = pressureColor
			shader.vertexShader = `varying float vPipeT;\n${shader.vertexShader}`.replace(
				'#include <uv_vertex>',
				'#include <uv_vertex>\nvPipeT=uv.x;',
			)
			shader.fragmentShader = `uniform float pressureProgress; uniform vec3 pressureColor; varying float vPipeT;\n${shader.fragmentShader}`
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

function HydraulicHardware({stateRef, compact = false}: {stateRef: StateRef; compact?: boolean}) {
	const pedal = useRef<T.Group>(null),
		booster = B.boosterPosition,
		abs = B.absPosition,
		pivot = B.pedalPivot
	useFrame(() => {
		if (pedal.current) pedal.current.rotation.z = (-stateRef.current.pedalForceN / B.maxPedalForceN) * B.pedalMaxAngle
	})
	return (
		<>
			<TeardownPart id="brake-pedal-group">
				<group position={[...pivot]} ref={pedal} userData={{partId: 'brake-pedal'}}>
					<Cylinder position={[0, -B.pedalLength / 2, 0]} radius={B.pedalRodRadius} length={B.pedalLength} axis="y" />
					<mesh position={[0, -B.pedalLength, 0]} castShadow>
						<boxGeometry args={[...B.pedalPlateSize]} />
						<meshStandardMaterial {...S.materials.rubber} />
					</mesh>
				</group>
			</TeardownPart>
			<TeardownPart id="brake-booster">
				<Cylinder id="vacuum-booster" position={[...booster]} radius={B.boosterRadius} length={B.boosterDepth} axis="x" color="#343b42" />
				{[-1, 1].map((side) => (
					<mesh key={side} position={[booster[0] + side * B.boosterDepth * 0.4, booster[1], booster[2]]} rotation-y={Math.PI / 2}>
						<torusGeometry args={[B.boosterRadius * 0.98, B.caliperWall * 0.4, 8, 64]} />
						<meshStandardMaterial color="#47515b" metalness={0.65} roughness={0.5} />
					</mesh>
				))}
			</TeardownPart>
			<TeardownPart id="brake-master">
				<Cylinder
					id="master-cylinder"
					position={[booster[0] + B.boosterDepth / 2 + B.masterLength / 2, booster[1], booster[2]]}
					radius={B.masterOuterRadius}
					length={B.masterLength}
					axis="x"
				/>
				{[-1, 1].map((side) => (
					<Cylinder
						key={side}
						position={[
							booster[0] + B.boosterDepth / 2 + B.masterLength * (0.5 + side * 0.27),
							booster[1] + B.masterOuterRadius,
							booster[2],
						]}
						radius={B.masterOuterRadius * 0.45}
						length={B.masterOuterRadius * 1.1}
						axis="y"
					/>
				))}
				<Cylinder
					position={[booster[0] + B.boosterDepth * 0.55, booster[1], booster[2]]}
					radius={B.masterOuterRadius * 1.8}
					length={B.caliperWall}
					axis="x"
				/>
			</TeardownPart>
			<TeardownPart id="brake-fluid">
				<RoundedBox
					args={[...B.reservoirSize]}
					radius={B.caliperWall}
					smoothness={4}
					position={[booster[0] + B.masterLength / 2, booster[1] + B.masterOuterRadius + B.reservoirSize[1] / 2, booster[2]]}
					castShadow
					userData={{partId: 'brake-reservoir'}}
				>
					<meshStandardMaterial color="#c4c7b4" roughness={0.45} transparent opacity={0.8} />
				</RoundedBox>
				<Cylinder
					position={[booster[0] + B.masterLength / 2, booster[1] + B.masterOuterRadius + B.reservoirSize[1], booster[2]]}
					radius={B.masterOuterRadius}
					length={B.caliperWall}
					axis="y"
					color="#313438"
				/>
			</TeardownPart>
			<TeardownPart id="brake-abs">
				<RoundedBox
					position={[...abs]}
					args={[...B.absSize]}
					radius={B.caliperWall * 0.5}
					smoothness={3}
					castShadow
					userData={{partId: 'abs-pump'}}
				>
					<meshStandardMaterial {...S.materials.aluminum} />
				</RoundedBox>
				{Array.from({length: 6}, (_, i) => (
					<mesh
						key={i}
						position={[
							abs[0] + ((i % 3) - 1) * B.absSize[0] * 0.27,
							abs[1] + B.absSize[1] / 2 + B.caliperWall,
							abs[2] + (Math.floor(i / 3) - 0.5) * B.absSize[2] * 0.55,
						]}
					>
						<cylinderGeometry args={[B.pipeRadius * 3, B.pipeRadius * 3, B.caliperWall * 2, 6]} />
						<meshStandardMaterial color="#a48e65" metalness={0.7} roughness={0.4} />
					</mesh>
				))}
				<Cylinder
					position={[abs[0], abs[1], abs[2] - B.absSize[2] / 2 - B.absMotorLength / 2]}
					radius={B.absMotorRadius}
					length={B.absMotorLength}
					color="#333a42"
				/>
			</TeardownPart>
			{!compact && (
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
			)}
		</>
	)
}

/** Vehicle coordinates: rotor axes lie on ±Z; no explosion transform here. */
export function BrakeMechanism({stateRef, closeup, assembly}: {stateRef: StateRef; closeup: boolean; assembly?: string}) {
	const amount = useTeardownProgress()
	const detail = closeup && amount < 0.01
	const wheels = [
		{front: true, x: S.dimensions.frontAxleX, track: S.wheels.frontTrack},
		{front: false, x: S.dimensions.rearAxleX, track: S.wheels.rearTrack},
	]
	return (
		<group name="hydraulic-brake-mechanism">
			{!detail && (!assembly || assembly === 'hydraulics') && <HydraulicHardware stateRef={stateRef} compact={!!assembly} />}
			{wheels.flatMap((axle) =>
				[-1, 1].map((side) => {
					if (detail && (!axle.front || side < 0)) return null
					if (assembly && (assembly === 'hydraulics' || side < 0 || axle.front !== (assembly === 'brake-front'))) return null
					const z = (side * axle.track) / 2,
						index = (axle.front ? 0 : 2) + (side > 0 ? 2 : 1),
						id = `brake-line-${index}`,
						abs = B.absPosition
					const railZ = side * (B.lineRailZ + (axle.front ? 0 : B.lineSeparation))
					return (
						<group key={id}>
							<group position={[axle.x, S.wheels.radius, z]} scale={[1, 1, side]}>
								<BrakeCorner front={axle.front} stateRef={stateRef} index={index} closeup={detail} compact={!!assembly} />
							</group>
							{!detail && !assembly && (
								<PressureLine
									id={id}
									stateRef={stateRef}
									start={0.3}
									end={1}
									points={[
										[abs[0], abs[1], abs[2] + (index - 2.5) * B.lineSeparation],
										[abs[0], B.lineRailY, railZ],
										[axle.x - B.caliperRadialPosition, B.lineRailY, railZ],
										[axle.x - B.caliperRadialPosition, S.wheels.radius, z - (side * B.guidePinLength) / 2],
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

export function BrakeCorner({
	front,
	stateRef,
	index,
	closeup = false,
	compact = false,
}: {
	front: boolean
	stateRef: StateRef
	index: number
	closeup?: boolean
	compact?: boolean
}) {
	const hub = useMemo(() => brakeRing(B.rotorBoreRadius, B.rotorHatRadius * 0.8, B.rotorHatDepth), [])
	useEffect(() => () => hub.dispose(), [hub])
	return (
		<>
			<TeardownPart id="brake-discs" representative={index % 2 === 0} anchor={[0, 0, 0]}>
				<Rotor front={front} stateRef={stateRef} index={index} />
			</TeardownPart>
			<FloatingCaliper front={front} stateRef={stateRef} index={index} closeup={closeup} />
			{compact && (
				<>
					<TeardownPart id="brake-knuckle">
						<group position-z={-B.rotorHatDepth * 1.6} userData={{partId: 'brake-corner-knuckle'}}>
							<mesh>
								<boxGeometry args={[B.rotorHatRadius * 0.8, B.rotorHatRadius * 2.5, B.rotorHatDepth * 0.6]} />
								<meshStandardMaterial {...S.materials.aluminum} />
							</mesh>
							<Cylinder position={[0, 0, 0]} radius={B.rotorHatRadius * 0.55} length={B.rotorHatDepth} />
						</group>
					</TeardownPart>
					<TeardownPart id="brake-hub">
						<mesh position-z={-B.rotorHatDepth} geometry={hub} userData={{partId: 'brake-corner-hub'}}>
							<meshStandardMaterial {...S.materials.steel} />
						</mesh>
					</TeardownPart>
				</>
			)}
		</>
	)
}
