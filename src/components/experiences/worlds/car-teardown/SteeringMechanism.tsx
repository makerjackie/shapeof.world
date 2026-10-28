import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from './animation'
import { Html } from '@react-three/drei'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { TeardownPart, useTeardownProgress, useTeardown } from './TeardownPart'
import { ROAD_TEARDOWN_SPEC as R, outwardOffset } from './road-teardown-spec'
import { Wheel, type WheelPose } from './Wheels'
import { createXrayMaterial } from './engine-geometry'
import { createAnnulus } from './transmission-geometry'
import {
	createAxleHousing,
	createDifferentialResources,
	createRackPinion,
	createRackTeeth,
	rackPinionQuaternion,
} from './differential-geometry'
import {
	COLUMN_AXIS,
	MIDDLE_AXIS,
	UPPER_JOINT,
	LOWER_JOINT,
	PINION_POSITION,
	STEERING_WHEELS,
	wheelPosition,
	type SteeringPoint,
	type SteeringState,
	type SteeringWheelId,
} from './steering-model'
import {
	STEERING_GEOMETRY as G,
	CHASSIS_GEOMETRY as C,
	BODY_GEOMETRY as B,
	VEHICLE_SPEC as S,
} from './vehicle-spec'
import { bodyPoint } from './body-geometry'

type Clock = { stateRef: RefObject<SteeringState> }
const Z_AXIS = new T.Vector3(0, 0, 1),
	Y_AXIS = new T.Vector3(0, 1, 0)
const STEEL = S.materials.steel
const AMBER = '#cfaa72'
function useGeometry(factory: () => T.BufferGeometry) {
	const geometry = useMemo(factory, [])
	useEffect(() => () => geometry.dispose(), [geometry])
	return geometry
}
function Rod({
	from,
	to,
	radius,
	color = STEEL.color,
	id,
}: {
	from: readonly number[]
	to: readonly number[]
	radius: number
	color?: string
	id?: string
}) {
	const a = new T.Vector3(...from),
		b = new T.Vector3(...to),
		d = b.clone().sub(a)
	return (
		<mesh
			position={a.add(b).multiplyScalar(0.5)}
			quaternion={new T.Quaternion().setFromUnitVectors(Y_AXIS, d.clone().normalize())}
			castShadow
			userData={{ partId: id }}
		>
			<cylinderGeometry args={[radius, radius, d.length(), 24]} />
			<meshStandardMaterial {...STEEL} color={color} />
		</mesh>
	)
}
function Ball({ position, radius = G.ballRadius }: { position: SteeringPoint; radius?: number }) {
	return (
		<mesh position={position} castShadow>
			<sphereGeometry args={[radius, 20, 12]} />
			<meshStandardMaterial {...STEEL} roughness={0.3} />
		</mesh>
	)
}

/** Two opposed forks and their cross, with the middle shaft's actual Cardan phase. */
function Universal({
	position,
	axis,
	spin,
	stateRef,
	id,
}: Clock & {
	position: SteeringPoint
	axis: readonly number[]
	spin: 'wheel' | 'middle'
	id: string
}) {
	const rotating = useRef<T.Group>(null)
	useFrame(() => {
		if (rotating.current)
			rotating.current.rotation.z =
				spin === 'wheel'
					? (stateRef.current.wheelAngle * Math.PI) / 180
					: stateRef.current.columnMiddleAngle
	})
	return (
		<TeardownPart id="steer-universals" anchor={position}>
			<group
				position={position}
				quaternion={new T.Quaternion().setFromUnitVectors(Z_AXIS, new T.Vector3(...axis))}
				userData={{ partId: id }}
			>
				<group ref={rotating}>
					{[-1, 1].map((side) => (
						<group key={side}>
							<Rod
								from={[side * G.universalRadius, 0, -G.universalLength / 2]}
								to={[side * G.universalRadius, 0, G.universalLength / 2]}
								radius={G.crossRadius}
							/>
							<Rod
								from={[0, side * G.universalRadius, 0]}
								to={[0, side * G.universalRadius, G.universalLength]}
								radius={G.crossRadius}
							/>
						</group>
					))}
					<Rod
						from={[-G.universalRadius, 0, 0]}
						to={[G.universalRadius, 0, 0]}
						radius={G.crossRadius}
						color={AMBER}
					/>
					<Rod
						from={[0, -G.universalRadius, 0]}
						to={[0, G.universalRadius, 0]}
						radius={G.crossRadius}
						color={AMBER}
					/>
				</group>
			</group>
		</TeardownPart>
	)
}
function SteeringColumn({ stateRef }: Clock) {
	const wheel = useRef<T.Group>(null),
		middle = useRef<T.Group>(null),
		lower = useRef<T.Group>(null)
	const upperOrientation = new T.Quaternion().setFromUnitVectors(
		Z_AXIS,
		new T.Vector3(...COLUMN_AXIS),
	)
	const middleOrientation = new T.Quaternion().setFromUnitVectors(
		Z_AXIS,
		new T.Vector3(...MIDDLE_AXIS),
	)
	const middleLength = new T.Vector3(...UPPER_JOINT).distanceTo(new T.Vector3(...LOWER_JOINT))
	useFrame(() => {
		if (wheel.current) wheel.current.rotation.z = (stateRef.current.wheelAngle * Math.PI) / 180
		if (middle.current) middle.current.rotation.z = stateRef.current.columnMiddleAngle
		if (lower.current) lower.current.rotation.z = stateRef.current.pinionAngle
	})
	return (
		<>
			<group position={S.steering.wheelPosition} quaternion={upperOrientation}>
				<group ref={wheel}>
					<TeardownPart id="steer-wheel" offset={[0, 0, R.steering.wheelAxial]} anchor={[0, 0, 0]}>
						<group userData={{ partId: 'steering-wheel' }}>
							<mesh>
								<torusGeometry args={[G.steeringWheelRadius, G.steeringWheelTube, 12, 96]} />
								<meshStandardMaterial color="#20262c" roughness={0.65} />
							</mesh>
							<mesh rotation-x={Math.PI / 2}>
								<cylinderGeometry
									args={[G.steeringHubRadius, G.steeringHubRadius, G.steeringHubDepth, 32]}
								/>
								<meshStandardMaterial {...STEEL} color="#515f6b" />
							</mesh>
							{[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
								<mesh
									key={a}
									position={[
										Math.sin(a) * G.steeringWheelRadius * 0.58,
										Math.cos(a) * G.steeringWheelRadius * 0.58,
										0,
									]}
									rotation-z={-a}
								>
									<boxGeometry args={[G.spokeWidth, G.steeringWheelRadius * 0.77, G.spokeDepth]} />
									<meshStandardMaterial {...STEEL} />
								</mesh>
							))}
							<mesh position={[0, G.steeringWheelRadius, 0]}>
								<boxGeometry
									args={[
										G.steeringWheelTube * 0.6,
										G.steeringWheelTube * 2.05,
										G.steeringWheelTube * 2.05,
									]}
								/>
								<meshStandardMaterial color={AMBER} metalness={0.55} roughness={0.4} />
							</mesh>
						</group>
					</TeardownPart>
					<TeardownPart
						id="steer-column"
						offset={[0, 0, R.steering.columnAxial]}
						anchor={[0, 0, G.upperShaftLength / 2]}
					>
						<Rod
							from={[0, 0, 0]}
							to={[0, 0, G.upperShaftLength]}
							radius={G.shaftRadius}
							id="steering-column"
						/>
					</TeardownPart>
				</group>
			</group>
			<TeardownPart id="steer-intermediate">
				<group position={UPPER_JOINT} quaternion={middleOrientation}>
					<group ref={middle}>
						<Rod
							from={[0, 0, 0]}
							to={[0, 0, middleLength]}
							radius={G.shaftRadius}
							id="steering-intermediate-shaft"
						/>
					</group>
				</group>
			</TeardownPart>
			<TeardownPart id="steer-column" anchor={LOWER_JOINT}>
				<group position={LOWER_JOINT} quaternion={upperOrientation}>
					<group ref={lower}>
						<Rod
							from={[0, 0, 0]}
							to={[0, 0, G.lowerShaftLength]}
							radius={G.shaftRadius}
							id="steering-lower-shaft"
						/>
					</group>
				</group>
			</TeardownPart>
			<Universal
				position={UPPER_JOINT}
				axis={COLUMN_AXIS}
				spin="wheel"
				stateRef={stateRef}
				id="steering-universal-1"
			/>
			<Universal
				position={LOWER_JOINT}
				axis={MIDDLE_AXIS}
				spin="middle"
				stateRef={stateRef}
				id="steering-universal-2"
			/>
		</>
	)
}
function Rack({ stateRef }: Clock) {
	const amount = useTeardownProgress()
	const rack = useRef<T.Group>(null),
		pinion = useRef<T.Group>(null)
	const teeth = useGeometry(createRackTeeth),
		gear = useGeometry(createRackPinion)
	const housing = useGeometry(() =>
		createAnnulus(
			G.rackHousingRadius,
			G.rackHousingRadius - G.rackHousingWall,
			G.rackHousingLength,
		).rotateY(Math.PI / 2),
	)
	const xray = useMemo(createXrayMaterial, [])
	useEffect(() => () => xray.dispose(), [xray])
	useFrame(() => {
		if (rack.current) rack.current.position.z = stateRef.current.rackTravel
		if (pinion.current) pinion.current.rotation.z = stateRef.current.pinionAngle
	})
	return (
		<>
			<TeardownPart id="steer-housing">
				<mesh
					position={S.steering.rackPosition}
					geometry={housing}
					material={amount < 0.02 ? xray : undefined}
					userData={{ partId: 'steering-rack' }}
				>
					{amount >= 0.02 && <meshStandardMaterial {...S.materials.aluminum} />}
				</mesh>
			</TeardownPart>
			<TeardownPart id="steer-rackbar">
				<group ref={rack} userData={{ partId: 'steering-rack-bar' }}>
					<Rod
						from={[S.steering.rackPosition[0], S.steering.rackPosition[1], -G.rackLength / 2]}
						to={[S.steering.rackPosition[0], S.steering.rackPosition[1], G.rackLength / 2]}
						radius={G.rackRadius}
					/>
					<mesh geometry={teeth}>
						<meshStandardMaterial {...STEEL} color="#b6bdc4" roughness={0.28} />
					</mesh>
				</group>
			</TeardownPart>
			<TeardownPart id="steer-pinion">
				<group position={PINION_POSITION} quaternion={rackPinionQuaternion()}>
					<group ref={pinion} userData={{ partId: 'steering-pinion' }}>
						<mesh geometry={gear}>
							<meshStandardMaterial {...STEEL} color={AMBER} />
						</mesh>
					</group>
				</group>
			</TeardownPart>
			<AssistMotor />
			{[-1, 1].map((side) => (
				<TeardownPart
					key={side}
					id="steer-gaiters"
					offset={outwardOffset(R.steering.boots, side)}
					anchor={[
						S.steering.rackPosition[0],
						S.steering.rackPosition[1],
						(side * (G.rackHousingLength + G.bootLength)) / 2,
					]}
				>
					<group
						position={[
							S.steering.rackPosition[0],
							S.steering.rackPosition[1],
							(side * (G.rackHousingLength + G.bootLength)) / 2,
						]}
						userData={{ partId: `steering-rack-boot-${side < 0 ? 1 : 2}` }}
					>
						{Array.from({ length: G.bootFolds }, (_, i) => (
							<mesh key={i} position-z={(i / (G.bootFolds - 1) - 0.5) * G.bootLength}>
								<torusGeometry args={[G.bootRadius, (G.bootLength / G.bootFolds) * 0.36, 8, 24]} />
								<meshStandardMaterial color="#24282d" roughness={0.78} />
							</mesh>
						))}
					</group>
				</TeardownPart>
			))}
		</>
	)
}
function AssistMotor() {
	return (
		<TeardownPart id="steer-assist">
			<group
				position={[...R.steering.motorPosition]}
				userData={{ partId: 'steering-assist-motor' }}
			>
				<mesh rotation-x={Math.PI / 2} castShadow>
					<cylinderGeometry
						args={[R.steering.motorRadius, R.steering.motorRadius, R.steering.motorLength, 40]}
					/>
					<meshStandardMaterial {...S.materials.aluminum} />
				</mesh>
				{[-1, 1].map((side) => (
					<mesh
						key={side}
						position-z={(side * R.steering.motorLength) / 2}
						rotation-x={Math.PI / 2}
					>
						<cylinderGeometry
							args={[
								R.steering.motorRadius * 1.05,
								R.steering.motorRadius * 1.05,
								G.carrierWall * 2,
								40,
							]}
						/>
						<meshStandardMaterial color="#303d48" metalness={0.8} roughness={0.4} />
					</mesh>
				))}
			</group>
		</TeardownPart>
	)
}
function SteeringCorner({ id, stateRef }: Clock & { id: SteeringWheelId }) {
	const compact = !!useTeardown().assembly
	const front = id.startsWith('front'),
		side = id.endsWith('Left') ? -1 : 1,
		index = side < 0 ? 1 : 2
	const pose = useRef<WheelPose>({ steer: 0, heave: 0 }),
		spin = useRef(0),
		knuckle = useRef<T.Group>(null),
		tie = useRef<T.Mesh>(null)
	const hub = wheelPosition(id),
		arm = new T.Vector3(-G.steeringArmRear, 0, -side * G.steeringArmInward)
	const tieGeometry = useGeometry(
		() => new T.CylinderGeometry(G.tieRodRadius, G.tieRodRadius, 1, 20),
	)
	const joint = useRef<T.Mesh>(null)
	useFrame(() => {
		const state = stateRef.current,
			angle = front ? (side < 0 ? state.leftAngle : state.rightAngle) : 0
		pose.current.steer = angle
		spin.current = state.wheelAngles[id]
		if (knuckle.current) knuckle.current.rotation.y = angle
		if (front && tie.current) {
			const endpoint = arm
				.clone()
				.applyAxisAngle(Y_AXIS, angle)
				.add(new T.Vector3(...hub))
			const start = new T.Vector3(
				S.steering.rackPosition[0],
				S.steering.rackPosition[1],
				side * G.rackInnerJointZ + state.rackTravel,
			)
			const d = endpoint.clone().sub(start)
			tie.current.position.copy(start).add(endpoint).multiplyScalar(0.5)
			tie.current.quaternion.setFromUnitVectors(Y_AXIS, d.clone().normalize())
			tie.current.scale.y = d.length()
			if (joint.current) joint.current.position.copy(start)
		}
	}, -0.1)
	return (
		<>
			{!compact && (
				<Wheel axle={front ? 'front' : 'rear'} side={side} poseRef={pose} spinRef={spin} />
			)}
			{front && (
				<>
					<TeardownPart
						id="steer-knuckles"
						offset={outwardOffset(R.steering.knuckles, side)}
						anchor={hub}
					>
						<group
							position={hub}
							ref={knuckle}
							userData={{ partId: `suspension-knuckle-${index}` }}
						>
							<Rod
								from={[0, -G.knuckleHeight / 2, 0]}
								to={[0, G.knuckleHeight / 2, 0]}
								radius={G.knuckleWidth / 2}
							/>
							<Rod from={[0, 0, 0]} to={arm.toArray()} radius={G.knuckleWidth / 2} />
							<Ball position={arm.toArray() as SteeringPoint} />
							<Rod
								from={[0, 0, -G.hubLength / 2]}
								to={[0, 0, G.hubLength / 2]}
								radius={G.hubRadius}
							/>
						</group>
					</TeardownPart>
					<TeardownPart
						id="steer-ties"
						offset={outwardOffset(R.steering.ties, side)}
						anchor={[hub[0] - G.steeringArmRear, hub[1], side * 0.65]}
					>
						<mesh
							ref={tie}
							geometry={tieGeometry}
							castShadow
							userData={{ partId: `tie-rod-${index}` }}
						>
							<meshStandardMaterial {...STEEL} />
						</mesh>
						<mesh ref={joint}>
							<sphereGeometry args={[G.ballRadius, 20, 12]} />
							<meshStandardMaterial {...STEEL} />
						</mesh>
					</TeardownPart>
				</>
			)}
		</>
	)
}

/** Side gears follow the two half shafts; only the planets' relative spin is
 * nested inside the carrier's orbit. Straight-line travel therefore has zero spin. */
export function SteeringDifferential({ stateRef, closeup = false }: Clock & { closeup?: boolean }) {
	const carrier = useRef<T.Group>(null),
		pinion = useRef<T.Group>(null),
		left = useRef<T.Group>(null),
		right = useRef<T.Group>(null)
	const planetA = useRef<T.Group>(null),
		planetB = useRef<T.Group>(null)
	const resources = useMemo(createDifferentialResources, []),
		housing = useGeometry(createAxleHousing)
	const edges = useGeometry(() => new T.EdgesGeometry(housing, 35)),
		xray = useMemo(createXrayMaterial, [])
	const carrierEnd = useGeometry(() =>
		createAnnulus(G.carrierRadius, G.carrierRadius - G.carrierWall, G.carrierWall).rotateY(
			Math.PI / 2,
		),
	)
	useEffect(
		() => () => {
			Object.values(resources).forEach((g) => g.dispose())
			xray.dispose()
		},
		[resources, xray],
	)
	useFrame(() => {
		const s = stateRef.current
		if (carrier.current) carrier.current.rotation.z = s.carrierAngle
		if (pinion.current) pinion.current.rotation.x = s.drivePinionAngle
		if (left.current) left.current.rotation.z = s.wheelAngles.rearLeft
		if (right.current) right.current.rotation.z = s.wheelAngles.rearRight
		if (planetA.current) planetA.current.rotation.z = -s.planetSpinAngle
		if (planetB.current) planetB.current.rotation.z = -s.planetSpinAngle
	})
	return (
		<group position={[S.dimensions.rearAxleX, S.wheels.radius, 0]}>
			{closeup && <DifferentialLabels stateRef={stateRef} />}
			<mesh geometry={housing} material={xray} userData={{ partId: 'differential-housing' }} />
			<lineSegments geometry={edges}>
				<lineBasicMaterial
					color={S.materials.xray}
					transparent
					opacity={closeup ? 0.32 : 0.13}
					depthWrite={false}
				/>
			</lineSegments>
			<group ref={pinion} userData={{ partId: 'final-drive-pinion' }}>
				<mesh geometry={resources.pinion}>
					<meshStandardMaterial {...STEEL} color="#b0a185" />
				</mesh>
				<Rod
					from={[G.axleHousingRadius, 0, 0]}
					to={[
						closeup ? R.steering.differentialPropStub : G.driveShaftFrontX - S.dimensions.rearAxleX,
						0,
						0,
					]}
					radius={G.driveShaftRadius}
					id="driveshaft"
				/>
				{!closeup && (
					<mesh
						position={[
							(G.driveShaftFrontX - S.dimensions.rearAxleX + G.axleHousingRadius) / 2,
							G.driveShaftRadius,
							0,
						]}
					>
						<boxGeometry
							args={[
								(G.driveShaftFrontX - S.dimensions.rearAxleX) * 0.4,
								G.carrierBoltRadius,
								G.carrierBoltRadius,
							]}
						/>
						<meshStandardMaterial color={AMBER} />
					</mesh>
				)}
			</group>
			<group ref={carrier} userData={{ partId: 'differential' }}>
				<mesh geometry={resources.ring} userData={{ partId: 'final-drive-ring' }}>
					<meshStandardMaterial {...STEEL} color="#c0c6ca" />
				</mesh>
				{[-1, 1].map((side) => (
					<mesh
						key={side}
						position-z={(side * G.carrierLength) / 2}
						geometry={carrierEnd}
						userData={{ partId: 'differential-carrier' }}
					>
						<meshStandardMaterial {...STEEL} color="#77848f" />
					</mesh>
				))}
				{[0, Math.PI].map((a) => (
					<group key={a} rotation-z={a}>
						<mesh position={[G.carrierRadius - G.carrierWall / 2, 0, 0]}>
							<boxGeometry args={[G.carrierWall, G.carrierWall * 3, G.carrierLength]} />
							<meshStandardMaterial {...STEEL} color="#77848f" />
						</mesh>
					</group>
				))}
				{Array.from({ length: G.carrierBoltCount }, (_, i) => (
					<mesh
						key={i}
						position={[
							Math.cos((i * Math.PI * 2) / G.carrierBoltCount) *
								(G.carrierRadius - G.carrierWall / 2),
							Math.sin((i * Math.PI * 2) / G.carrierBoltCount) *
								(G.carrierRadius - G.carrierWall / 2),
							G.carrierLength / 2 + G.carrierWall / 2,
						]}
						rotation-x={Math.PI / 2}
					>
						<cylinderGeometry args={[G.carrierBoltRadius, G.carrierBoltRadius, G.carrierWall, 6]} />
						<meshStandardMaterial {...STEEL} />
					</mesh>
				))}
				<Rod
					from={[0, -G.carrierRadius, 0]}
					to={[0, G.carrierRadius, 0]}
					radius={G.planetAxleRadius}
					id="differential-cross-pin"
				/>
				{[-1, 1].map((side, i) => (
					<group key={side} rotation-x={(-side * Math.PI) / 2}>
						<group
							ref={i === 0 ? planetA : planetB}
							userData={{ partId: `differential-planet-${i + 1}` }}
						>
							<mesh geometry={resources.planet}>
								<meshStandardMaterial {...STEEL} color="#ba9a66" roughness={0.3} />
							</mesh>
							<mesh
								position={[
									G.bevelModule * S.transmission.differential.planetTeeth * 0.28,
									0,
									(G.bevelModule * S.transmission.differential.sideTeeth) / 2,
								]}
							>
								<sphereGeometry args={[G.carrierBoltRadius * 0.75, 10, 8]} />
								<meshStandardMaterial color="#eed2a3" emissive="#d8b16e" emissiveIntensity={0.25} />
							</mesh>
						</group>
					</group>
				))}
			</group>
			{[-1, 1].map((side, i) => (
				<group key={side} ref={i === 0 ? left : right}>
					<mesh
						rotation-y={side < 0 ? Math.PI : 0}
						geometry={resources.side}
						userData={{ partId: `differential-side-gear-${i + 1}` }}
					>
						<meshStandardMaterial {...STEEL} color="#a8b5be" />
					</mesh>
					<Rod
						from={[0, 0, (side * G.carrierLength) / 2]}
						to={[
							0,
							0,
							side * (closeup ? R.steering.differentialStubLength : S.wheels.rearTrack / 2),
						]}
						radius={G.halfshaftRadius}
						id={`halfshaft-${i + 1}`}
					/>
					{!closeup && (
						<mesh
							position={[
								G.halfshaftRadius,
								0,
								side * (S.wheels.rearTrack / 4 + G.carrierLength / 4),
							]}
						>
							<boxGeometry
								args={[
									G.carrierBoltRadius,
									G.carrierBoltRadius,
									S.wheels.rearTrack / 2 - G.carrierLength / 2,
								]}
							/>
							<meshStandardMaterial color={AMBER} />
						</mesh>
					)}
				</group>
			))}
		</group>
	)
}

/** Screen-space leaders stay legible through AO and have a fixed, short
 * pixel length even when the camera moves closer to the differential. */
function DifferentialLabel({
	position,
	name,
	teeth,
	dx,
	dy,
}: {
	position: SteeringPoint
	name: string
	teeth: number
	dx: number
	dy: number
}) {
	const tx = useExperienceI18n(),
		left = dx < 0
	return (
		<Html position={position} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
			<svg
				width="1"
				height="1"
				style={{ overflow: 'visible', position: 'absolute' }}
				aria-hidden="true"
			>
				<path
					d={`M0 0 L${dx * 0.7} ${dy} H${dx}`}
					fill="none"
					stroke="#b2c3cf"
					strokeWidth=".8"
					opacity=".9"
				/>
				<circle r="1.8" fill="#e4bd83" />
			</svg>
			<span
				style={{
					position: 'absolute',
					left: dx + (left ? -6 : 6),
					top: dy - 7,
					transform: left ? 'translateX(-100%)' : undefined,
					color: '#c9d5df',
					fontSize: 11,
					whiteSpace: 'nowrap',
					letterSpacing: '.04em',
					textShadow: '0 1px 5px #08090c',
				}}
			>
				{name}{' '}
				<span style={{ color: '#aabac6', fontSize: 10 }}>
					· {teeth} {tx('齿')}
				</span>
			</span>
		</Html>
	)
}

/** The planet label's anchor orbits with its actual gear. The left/top/right
 * label sectors keep the three short leaders apart at the close-up camera. */
function DifferentialLabels({ stateRef }: Clock) {
	const tx = useExperienceI18n()
	const planet = useRef<T.Group>(null)
	const planetAnchor = useMemo(
		() => new T.Vector3(0, (G.bevelModule * S.transmission.differential.sideTeeth) / 2, 0),
		[],
	)
	useFrame(() => {
		if (planet.current)
			planet.current.position
				.copy(planetAnchor)
				.applyAxisAngle(Z_AXIS, stateRef.current.carrierAngle)
	})
	return (
		<group>
			<DifferentialLabel
				position={[
					G.axleHousingRadius * 0.55,
					G.axleHousingRadius * 0.55,
					(-G.bevelModule * S.transmission.finalDrive.driver) / 2,
				]}
				name={tx('齿圈')}
				teeth={S.transmission.finalDrive.driven}
				dx={85}
				dy={-48}
			/>
			<DifferentialLabel
				position={[
					0,
					G.bevelModule * S.transmission.differential.sideTeeth * 0.35,
					(G.bevelModule * S.transmission.differential.planetTeeth) / 2,
				]}
				name={tx('半轴齿轮')}
				teeth={S.transmission.differential.sideTeeth}
				dx={-105}
				dy={-58}
			/>
			<group ref={planet}>
				<DifferentialLabel
					position={[0, 0, 0]}
					name={tx('行星齿轮')}
					teeth={S.transmission.differential.planetTeeth}
					dx={100}
					dy={86}
				/>
			</group>
		</group>
	)
}

function AckermannConstruction({ stateRef }: Clock) {
	const tx = useExperienceI18n(),
		centre = useRef<T.Group>(null),
		centreLabel = useRef<HTMLSpanElement>(null)
	const lines = useMemo(
		() =>
			STEERING_WHEELS.map((_, i) => {
				const normal = new T.BufferGeometry().setAttribute(
					'position',
					new T.BufferAttribute(new Float32Array(6), 3),
				)
				const arc = new T.BufferGeometry().setAttribute(
					'position',
					new T.BufferAttribute(new Float32Array(129 * 3), 3),
				)
				const normalLine = new T.Line(
					normal,
					new T.LineDashedMaterial({
						color: '#93b1c8',
						dashSize: 0.055,
						gapSize: 0.05,
						transparent: true,
						opacity: G.constructionLineOpacity,
						depthWrite: false,
					}),
				)
				const arcLine = new T.Line(
					arc,
					new T.LineBasicMaterial({
						color: i % 2 === 0 ? '#a6bed2' : '#d4b582',
						transparent: true,
						opacity: 0.65,
						depthWrite: false,
					}),
				)
				return { normal, arc, normalLine, arcLine }
			}),
		[],
	)
	const previous = useRef(NaN)
	useEffect(
		() => () =>
			lines.forEach(({ normal, arc, normalLine, arcLine }) => {
				normal.dispose()
				arc.dispose()
				normalLine.material.dispose()
				arcLine.material.dispose()
			}),
		[lines],
	)
	useFrame(() => {
		const s = stateRef.current
		if (s.wheelAngle === previous.current) return
		previous.current = s.wheelAngle
		const visible = !!s.turnCenter && s.radius <= G.constructionMaxRadius
		if (centre.current) {
			centre.current.visible = visible
			if (s.turnCenter) centre.current.position.set(...s.turnCenter)
		}
		if (centreLabel.current) {
			centreLabel.current.textContent = `R ${s.radius.toFixed(2)} m`
			if (centreLabel.current.parentElement)
				centreLabel.current.parentElement.style.display = visible ? '' : 'none'
		}
		STEERING_WHEELS.forEach((id, i) => {
			const n = lines[i].normalLine,
				a = lines[i].arcLine
			if (n) n.visible = visible
			if (a) a.visible = visible
			if (!visible || !s.turnCenter) return
			const p = wheelPosition(id),
				c = s.turnCenter,
				normal = lines[i].normal.attributes.position as T.BufferAttribute
			normal.setXYZ(0, p[0], G.constructionY, p[2])
			normal.setXYZ(1, c[0], G.constructionY, c[2])
			normal.needsUpdate = true
			lines[i].normal.computeBoundingSphere()
			n?.computeLineDistances()
			const radius = s.wheelRadii[id],
				start = Math.atan2(p[2] - c[2], p[0] - c[0]),
				extent = G.constructionArcLength / radius
			const arc = lines[i].arc.attributes.position as T.BufferAttribute
			for (let j = 0; j < 129; j++) {
				const angle = start + (j / 128 - 0.5) * extent
				arc.setXYZ(
					j,
					c[0] + radius * Math.cos(angle),
					G.constructionY,
					c[2] + radius * Math.sin(angle),
				)
			}
			arc.needsUpdate = true
			lines[i].arc.computeBoundingSphere()
			a?.computeLineDistances()
		})
	})
	return (
		<group>
			{lines.map(({ normalLine, arcLine }, i) => (
				<group key={i}>
					<primitive object={normalLine} />
					<primitive object={arcLine} />
				</group>
			))}
			<group ref={centre}>
				<mesh rotation-x={-Math.PI / 2}>
					<ringGeometry args={[G.constructionMarkerRadius * 0.8, G.constructionMarkerRadius, 36]} />
					<meshBasicMaterial color="#d0b181" side={T.DoubleSide} />
				</mesh>
				<Html
					position={[0, 0, -G.constructionMarkerRadius * 3]}
					center
					zIndexRange={[3, 0]}
					style={{
						pointerEvents: 'none',
						color: '#b9c7d0',
						fontSize: 10,
						whiteSpace: 'nowrap',
						letterSpacing: '.08em',
					}}
				>
					<span>
						{tx('转弯中心')} · <span ref={centreLabel} />
					</span>
				</Html>
			</group>
		</group>
	)
}

/** Faint body perimeter and real subframe references keep the geometric
 * construction tied to the vehicle rather than floating in empty space. */
function SteeringContext() {
	const outline = useGeometry(() => {
		const vertices: number[] = []
		const first = B.sections[0][0],
			last = B.sections[B.sections.length - 1][0]
		for (const side of [-1, 1])
			for (let i = 0; i < 128; i++) {
				const a = bodyPoint(
					T.MathUtils.lerp(first, last, i / 128),
					side * B.flankParameter * Math.PI,
				)
				const b = bodyPoint(
					T.MathUtils.lerp(first, last, (i + 1) / 128),
					side * B.flankParameter * Math.PI,
				)
				vertices.push(a.x, G.constructionY * 3, a.z, b.x, G.constructionY * 3, b.z)
			}
		for (const x of [first, last])
			for (let i = 0; i < 32; i++) {
				const a = bodyPoint(
					x,
					T.MathUtils.lerp(-B.flankParameter, B.flankParameter, i / 32) * Math.PI,
				)
				const b = bodyPoint(
					x,
					T.MathUtils.lerp(-B.flankParameter, B.flankParameter, (i + 1) / 32) * Math.PI,
				)
				vertices.push(a.x, G.constructionY * 3, a.z, b.x, G.constructionY * 3, b.z)
			}
		return new T.BufferGeometry().setAttribute(
			'position',
			new T.Float32BufferAttribute(vertices, 3),
		)
	})
	return (
		<group name="steering-body-reference">
			<lineSegments geometry={outline}>
				<lineBasicMaterial
					color="#8aa0b1"
					transparent
					opacity={R.steering.outlineOpacity}
					depthWrite={false}
				/>
			</lineSegments>
			{(['front', 'rear'] as const).map((axle) => {
				const x = axle === 'front' ? S.dimensions.frontAxleX : S.dimensions.rearAxleX
				const length = axle === 'front' ? C.subframe.frontLength : C.subframe.rearLength
				const p = (dx: number, z: number) => [x + dx, C.crossmember.y, z]
				return (
					<group key={axle}>
						{[-1, 1].map((side) => (
							<group key={side}>
								<Rod
									from={p(-length / 2, side * C.rail.z)}
									to={p(length / 2, side * C.rail.z)}
									radius={C.subframe.beamRadius}
									color="#35424c"
								/>
								<Rod
									from={p(-length / 2, side * C.rail.z)}
									to={axle === 'front' ? p(length / 2, 0) : p(-length / 2, -side * C.rail.z)}
									radius={C.subframe.beamRadius}
									color="#35424c"
								/>
							</group>
						))}
						<Rod
							from={p(length / 2, -C.rail.z)}
							to={p(length / 2, C.rail.z)}
							radius={C.subframe.beamRadius}
							color="#35424c"
						/>
					</group>
				)
			})}
		</group>
	)
}
function SteeringAngle({ stateRef, side }: Clock & { side: -1 | 1 }) {
	const label = useRef<HTMLSpanElement>(null)
	const arc = useMemo(() => {
		const geometry = new T.BufferGeometry().setAttribute(
			'position',
			new T.BufferAttribute(new Float32Array((R.steering.angleArcSegments + 1) * 3), 3),
		)
		return new T.Line(
			geometry,
			new T.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.8, depthWrite: false }),
		)
	}, [])
	useEffect(
		() => () => {
			arc.geometry.dispose()
			arc.material.dispose()
		},
		[arc],
	)
	useFrame(() => {
		const angle = side < 0 ? stateRef.current.leftAngle : stateRef.current.rightAngle
		const position = arc.geometry.getAttribute('position')
		for (let i = 0; i <= R.steering.angleArcSegments; i++) {
			const a = (angle * i) / R.steering.angleArcSegments
			position.setXYZ(
				i,
				Math.cos(a) * R.steering.angleArcRadius,
				G.constructionY * 2,
				-Math.sin(a) * R.steering.angleArcRadius,
			)
		}
		position.needsUpdate = true
		arc.geometry.computeBoundingSphere()
		if (label.current)
			label.current.textContent = `${((Math.abs(angle) * 180) / Math.PI).toFixed(1)}°`
	})
	return (
		<group position={[S.dimensions.frontAxleX, 0, (side * S.wheels.frontTrack) / 2]}>
			<primitive object={arc} />
			<Html
				position={[
					R.steering.angleArcRadius,
					G.constructionY * 2,
					side * R.steering.angleArcRadius * 0.45,
				]}
				center
				zIndexRange={[3, 0]}
				style={{ pointerEvents: 'none', color: AMBER, fontSize: 10, whiteSpace: 'nowrap' }}
			>
				<span ref={label} />
			</Html>
		</group>
	)
}

export function SteeringMechanism({
	stateRef,
	showConstruction,
	closeup = false,
	assembly,
}: Clock & { showConstruction: boolean; closeup?: boolean; assembly?: string }) {
	const amount = useTeardownProgress()
	const detail = closeup && amount < 0.01
	return (
		<group>
			{!detail && (
				<>
					<SteeringColumn stateRef={stateRef} />
					<Rack stateRef={stateRef} />
					{STEERING_WHEELS.map((id) => (
						<SteeringCorner key={id} id={id} stateRef={stateRef} />
					))}
				</>
			)}
			{!assembly && <SteeringDifferential stateRef={stateRef} closeup={detail} />}
			{showConstruction && amount < 0.02 && (
				<>
					<SteeringContext />
					<AckermannConstruction stateRef={stateRef} />
					<SteeringAngle stateRef={stateRef} side={-1} />
					<SteeringAngle stateRef={stateRef} side={1} />
				</>
			)}
		</group>
	)
}
