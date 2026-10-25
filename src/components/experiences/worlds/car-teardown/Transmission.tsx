import { radialGeometry } from './repeated-geometry'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from './animation'
import * as T from 'three'
import { createCastAluminumMaterial, createXrayMaterial } from './engine-geometry'
import {
	createAnnulus,
	createBellHousing,
	createGearboxCase,
	createGearboxGear,
	GEARBOX_GEARS,
	gearboxGearAngle,
	LAYSHAFT_Y,
	reverseIdlerCentre,
	type GearNode,
} from './transmission-geometry'
import {
	SLEEVE_IDS,
	transmissionPowerPath,
	type SleeveId,
	type TransmissionState,
} from './transmission-model'
import {
	AUXILIARY_TEARDOWN_GEOMETRY as A,
	STEERING_GEOMETRY as DG,
	TRANSMISSION_GEOMETRY as G,
	VEHICLE_SPEC as S,
} from './vehicle-spec'
import { TeardownPart, useTeardown } from './TeardownPart'
import { AxleTeardown } from './AxleTeardown'
import type { SteeringState } from './steering-model'
import { createDifferentialResources } from './differential-geometry'

export type TransmissionProps = {
	stateRef: RefObject<TransmissionState>
	xray: boolean
	assembly?: string
	steeringRef: RefObject<SteeringState>
}
type Clock = { stateRef: RefObject<TransmissionState> }
const HALF_PI = Math.PI / 2
const AXIS_Y = S.transmission.axisY
const STEEL = S.materials.steel
const AMBER = new T.Color('#d89744')

function useOwnedGeometry(factory: () => T.BufferGeometry, dependencies: unknown[] = []) {
	const geometry = useMemo(factory, dependencies)
	useEffect(() => () => geometry.dispose(), [geometry])
	return geometry
}
function useTorqueMaterial(id: string, stateRef: RefObject<TransmissionState>, bronze = false) {
	const material = useMemo(
		() =>
			new T.MeshStandardMaterial({
				...STEEL,
				color: bronze ? '#a48751' : STEEL.color,
				roughness: bronze ? 0.32 : 0.26,
			}),
		[bronze],
	)
	useEffect(() => () => material.dispose(), [material])
	useFrame(() => {
		const active = transmissionPowerPath(stateRef.current).has(id)
		material.emissive.copy(AMBER)
		material.emissiveIntensity = active ? 0.32 * stateRef.current.clutchEngagement : 0
	})
	return material
}

function Gear({ node, stateRef }: Clock & { node: GearNode }) {
	const ref = useRef<T.Group>(null)
	const geometry = useOwnedGeometry(() => createGearboxGear(node), [node])
	const material = useTorqueMaterial(node.id, stateRef)
	const dogGeometry = useOwnedGeometry(() => createAnnulus(G.dogRadius, G.gearBore, G.dogWidth))
	// Each free gear's dog ring faces the appropriate synchronizer, not another gear.
	const sleeve =
		node.shaft === 'free'
			? SLEEVE_IDS.find(
					(id) => G.sleeves[id].negative === node.gear || G.sleeves[id].positive === node.gear,
				)
			: node.shaft === 'input'
				? '3-4'
				: undefined
	const dogSign = sleeve ? Math.sign(G.sleeves[sleeve].x - node.x) : 0
	const dogX = (dogSign * (G.gearWidth + G.dogWidth)) / 2
	const dogTeeth = useOwnedGeometry(() =>
		radialGeometry(
			new T.BoxGeometry(G.dogWidth, G.sleeveGroove * 0.6, G.sleeveGroove * 0.7),
			G.dogTeeth,
			G.dogRadius,
			'x',
		),
	)
	useFrame(() => {
		if (ref.current) ref.current.rotation.x = gearboxGearAngle(node, stateRef.current)
	})
	return (
		<group ref={ref} position={[node.x, node.y, node.z]} userData={{ partId: node.id }}>
			<mesh geometry={geometry} material={material} castShadow />
			{sleeve && (
				<group position-x={dogX}>
					<mesh geometry={dogGeometry} material={material} />
					<mesh geometry={dogTeeth} material={material} />
				</group>
			)}
		</group>
	)
}

function Shaft({
	id,
	front,
	rear,
	y,
	z = 0,
	angle,
	stateRef,
	radius = G.shaftRadius,
}: Clock & {
	id: string
	front: number
	rear: number
	y: number
	z?: number
	angle: 'inputAngle' | 'layshaftAngle' | 'outputAngle'
	radius?: number
}) {
	const ref = useRef<T.Group>(null)
	const material = useTorqueMaterial(id, stateRef)
	useFrame(() => {
		if (ref.current) ref.current.rotation.x = stateRef.current[angle]
	})
	return (
		<group ref={ref} position={[(front + rear) / 2, y, z]} userData={{ partId: id }}>
			<mesh rotation-z={-HALF_PI} material={material} castShadow>
				<cylinderGeometry args={[radius, radius, front - rear, 32]} />
			</mesh>
			{[0, Math.PI].map((a) => (
				<mesh
					key={a}
					position={[0, Math.cos(a) * radius, Math.sin(a) * radius]}
					rotation-x={a}
					material={material}
				>
					<boxGeometry args={[front - rear, G.sleeveGroove * 0.5, G.sleeveGroove * 0.7]} />
				</mesh>
			))}
		</group>
	)
}

function Synchronizer({ id, stateRef }: Clock & { id: SleeveId }) {
	const sleeveRef = useRef<T.Group>(null),
		forkRef = useRef<T.Group>(null),
		hubRef = useRef<T.Mesh>(null)
	const material = useTorqueMaterial(`synchronizer-${id}`, stateRef, true)
	const outer = useOwnedGeometry(() => createAnnulus(G.sleeveRadius, G.sleeveBore, G.sleeveWidth))
	const lip = useOwnedGeometry(() =>
		createAnnulus(G.sleeveRadius + G.sleeveGroove, G.sleeveRadius, G.sleeveWidth * 0.29),
	)
	const hub = useOwnedGeometry(() =>
		createAnnulus(G.hubRadius, G.shaftRadius, G.sleeveWidth * 0.75),
	)
	const stem = useOwnedGeometry(
		() =>
			new T.TubeGeometry(
				new T.CatmullRomCurve3([
					new T.Vector3(0, 0, -G.sleeveRadius - G.sleeveGroove * 0.65),
					new T.Vector3(0, G.forkRailY * 0.4, G.forkRailZ),
					new T.Vector3(0, G.forkRailY, G.forkRailZ),
				]),
				24,
				G.forkWire * 1.25,
				8,
				false,
			),
	)
	const fork = useOwnedGeometry(() => {
		const r = G.sleeveRadius + G.sleeveGroove * 0.65
		const points = Array.from({ length: 45 }, (_, i) => {
			const a = 0.18 * Math.PI + (i / 44) * 1.64 * Math.PI
			return new T.Vector3(0, Math.sin(a) * r, Math.cos(a) * r)
		})
		return new T.TubeGeometry(new T.CatmullRomCurve3(points), 64, G.forkWire, 8, false)
	})
	useFrame(() => {
		const state = stateRef.current
		const x = G.sleeves[id].x + state.sleevePositions[id] * G.sleeveTravel
		if (sleeveRef.current) {
			sleeveRef.current.position.x = x
			sleeveRef.current.rotation.x = state.outputAngle
		}
		if (forkRef.current) forkRef.current.position.x = x
		if (hubRef.current) hubRef.current.rotation.x = state.outputAngle
	})
	return (
		<>
			<TeardownPart id="drive-sleeves" representative={id === '1-2'}>
				<mesh
					ref={hubRef}
					position={[G.sleeves[id].x, AXIS_Y, 0]}
					geometry={hub}
					material={material}
					userData={{ partId: `synchronizer-${id}` }}
				/>
				<group
					ref={sleeveRef}
					position={[G.sleeves[id].x, AXIS_Y, 0]}
					userData={{ partId: `synchronizer-${id}` }}
				>
					<mesh geometry={outer} material={material} castShadow />
					{[-1, 1].map((side) => (
						<mesh
							key={side}
							position-x={side * G.sleeveWidth * 0.355}
							geometry={lip}
							material={material}
						/>
					))}
				</group>
			</TeardownPart>
			<TeardownPart id="drive-forks" representative={id === '1-2'}>
				<group
					ref={forkRef}
					position={[G.sleeves[id].x, AXIS_Y, 0]}
					userData={{ partId: `shift-fork-${id}` }}
				>
					<mesh geometry={fork}>
						<meshStandardMaterial {...S.materials.aluminum} />
					</mesh>
					<mesh geometry={stem}>
						<meshStandardMaterial {...S.materials.aluminum} />
					</mesh>
				</group>
			</TeardownPart>
		</>
	)
}

function Bearings() {
	const geometry = useOwnedGeometry(() =>
		createAnnulus(G.bearingRadius, G.shaftRadius, G.bearingWidth),
	)
	return (
		<>
			{[
				['input', G.layshaftFrontX, AXIS_Y],
				['output', G.caseRearX, AXIS_Y],
				['layshaft-front', G.layshaftFrontX, LAYSHAFT_Y],
				['layshaft-rear', G.layshaftRearX, LAYSHAFT_Y],
			].map(([id, x, y]) => (
				<mesh
					key={id}
					geometry={geometry}
					position={[x as number, y as number, 0]}
					userData={{ partId: `gearbox-bearing-${id}` }}
				>
					<meshStandardMaterial {...STEEL} roughness={0.3} />
				</mesh>
			))}
		</>
	)
}

function CastingHalf({ front, xray }: { front: boolean; xray: boolean }) {
	const housing = useOwnedGeometry(() => createGearboxCase(front ? 'front' : 'rear')),
		bell = useOwnedGeometry(createBellHousing)
	const edges = useOwnedGeometry(() => new T.EdgesGeometry(housing, 35), [housing]),
		bellEdges = useOwnedGeometry(() => new T.EdgesGeometry(bell, 40), [bell])
	const cast = useMemo(createCastAluminumMaterial, []),
		transparent = useMemo(createXrayMaterial, [])
	useEffect(
		() => () => {
			cast.dispose()
			transparent.dispose()
		},
		[cast, transparent],
	)
	// Exploded castings become opaque again so their wall sections read as parts.
	const teardown = useTeardown(),
		ghost = xray && teardown.amount < 0.1
	const midpoint = (G.caseFrontX + G.caseRearX) / 2
	return (
		<TeardownPart id={front ? 'drive-case-front' : 'drive-case-rear'}>
			<group userData={{ partId: front ? 'gearbox-case-front' : 'gearbox-case-rear' }}>
				<mesh geometry={housing} material={ghost ? transparent : cast} castShadow={!ghost} />
				{front && (
					<mesh geometry={bell} material={ghost ? transparent : cast} castShadow={!ghost} />
				)}
				{ghost ? (
					<>
						<lineSegments geometry={edges}>
							<lineBasicMaterial
								color={S.materials.xray}
								transparent
								opacity={0.24}
								depthWrite={false}
							/>
						</lineSegments>
						{front && (
							<lineSegments geometry={bellEdges}>
								<lineBasicMaterial
									color={S.materials.xray}
									transparent
									opacity={0.19}
									depthWrite={false}
								/>
							</lineSegments>
						)}
					</>
				) : (
					Array.from({ length: G.caseRibCount }, (_, i) => {
						const x = G.caseRearX + ((G.caseFrontX - G.caseRearX) * (i + 1)) / (G.caseRibCount + 1)
						if (x >= midpoint !== front) return null
						return (
							<mesh
								key={i}
								position={[x, AXIS_Y + (G.caseTop + G.caseBottom) / 2, 0]}
								rotation-y={HALF_PI}
								scale={[1, (G.caseTop - G.caseBottom) / (2 * G.caseHalfWidth), 1]}
								material={cast}
							>
								<torusGeometry args={[G.caseHalfWidth, G.caseRib, 8, 48]} />
							</mesh>
						)
					})
				)}
			</group>
		</TeardownPart>
	)
}
function Castings({ xray }: { xray: boolean }) {
	return (
		<>
			<CastingHalf front xray={xray} />
			<CastingHalf front={false} xray={xray} />
		</>
	)
}

function Clutch({ stateRef }: Clock) {
	const teardown = useTeardown()
	const flywheel = useRef<T.Mesh>(null),
		disc = useRef<T.Mesh>(null),
		plate = useRef<T.Group>(null),
		release = useRef<T.Mesh>(null)
	const material = useTorqueMaterial('clutch-pressure-plate', stateRef)
	const discMaterial = useTorqueMaterial('clutch-disc', stateRef)
	const discGeometry = useOwnedGeometry(() =>
		createAnnulus(G.clutchRadius, G.shaftRadius, G.clutchThickness),
	)
	const releaseGeometry = useOwnedGeometry(() =>
		createAnnulus(G.shaftRadius * 2.4, G.shaftRadius * 1.2, G.bearingWidth),
	)
	const plateGeometry = useOwnedGeometry(() =>
		createAnnulus(G.pressurePlateRadius, G.clutchRadius * 0.6, G.pressurePlateThickness),
	)
	const fingers = useOwnedGeometry(() =>
		radialGeometry(
			new T.BoxGeometry(G.caseRib, G.clutchRadius * 0.46, G.caseWall * 1.3),
			G.dogTeeth,
			G.clutchRadius * 0.43,
			'x',
		),
	)
	useFrame(() => {
		const state = stateRef.current
		if (release.current)
			release.current.position.x =
				G.clutchDiscX -
				G.pressurePlateThickness * 2 -
				(1 - state.clutchEngagement) * G.clutchReleaseTravel
		if (flywheel.current) flywheel.current.rotation.x = state.inputAngle
		if (disc.current) disc.current.rotation.x = state.inputAngle
		if (plate.current) {
			plate.current.rotation.x = state.inputAngle
			plate.current.position.x =
				G.clutchDiscX -
				(G.pressurePlateThickness + G.clutchThickness) / 2 -
				(1 - state.clutchEngagement) * G.clutchReleaseTravel
		}
	})
	return (
		<>
			{teardown.system === 'drivetrain' && (
				<TeardownPart id="drive-flywheel">
					<mesh
						ref={flywheel}
						position={[G.inputFrontX + S.engine.geometry.flywheelThickness / 2, AXIS_Y, 0]}
						rotation-z={-HALF_PI}
						material={material}
						userData={{ partId: 'clutch-flywheel' }}
					>
						<cylinderGeometry
							args={[
								S.engine.geometry.flywheelRadius,
								S.engine.geometry.flywheelRadius,
								S.engine.geometry.flywheelThickness,
								64,
							]}
						/>
					</mesh>
				</TeardownPart>
			)}
			<TeardownPart id="drive-disc">
				<mesh
					ref={disc}
					position={[G.clutchDiscX, AXIS_Y, 0]}
					geometry={discGeometry}
					material={discMaterial}
					userData={{ partId: 'clutch-disc' }}
				/>
			</TeardownPart>
			<TeardownPart id="drive-release">
				<mesh
					ref={release}
					position={[G.clutchDiscX - G.pressurePlateThickness * 2, AXIS_Y, 0]}
					geometry={releaseGeometry}
					material={material}
					userData={{ partId: 'clutch-release-bearing' }}
				/>
			</TeardownPart>
			<TeardownPart id="drive-pressure">
				<group
					ref={plate}
					position={[G.clutchDiscX - (G.pressurePlateThickness + G.clutchThickness) / 2, AXIS_Y, 0]}
					userData={{ partId: 'clutch-pressure-plate' }}
				>
					<mesh geometry={plateGeometry} material={material} />
					<mesh geometry={fingers} material={material} />
				</group>
			</TeardownPart>
		</>
	)
}

function RearDrive({ stateRef, xray }: Clock & { xray: boolean }) {
	const prop = useRef<T.Group>(null),
		joints = useRef<T.Group>(null),
		carrier = useRef<T.Group>(null),
		pinion = useRef<T.Group>(null),
		halfLeft = useRef<T.Group>(null),
		halfRight = useRef<T.Group>(null)
	const material = useTorqueMaterial('driveshaft', stateRef),
		diffMaterial = useTorqueMaterial('differential', stateRef)
	const pinMaterial = useTorqueMaterial('final-drive-pinion', stateRef),
		ringMaterial = useTorqueMaterial('final-drive-ring', stateRef)
	const halfMaterials = [
		useTorqueMaterial('halfshaft-1', stateRef),
		useTorqueMaterial('halfshaft-2', stateRef),
	]
	const resources = useMemo(createDifferentialResources, [])
	const carrierEnd = useOwnedGeometry(() =>
		createAnnulus(DG.carrierRadius, DG.carrierRadius - DG.carrierWall, DG.carrierWall).rotateY(
			HALF_PI,
		),
	)
	const shellMaterial = useMemo(createCastAluminumMaterial, []),
		shellXray = useMemo(createXrayMaterial, [])
	const halves = useMemo(
		() =>
			[-1, 1].map((side) => {
				const profile = [
					[DG.axleHousingRadius, 0],
					[DG.axleHousingRadius * 0.72, DG.axleHousingLength * 0.6],
					[DG.axleTubeRadius, DG.axleHousingLength],
					[DG.axleTubeRadius, S.wheels.rearTrack / 2 - DG.axleTubeInset],
				]
				const points = [
					...profile,
					...profile
						.slice()
						.reverse()
						.map(([r, z]) => [r - DG.axleHousingWall, z]),
					profile[0],
				]
				return new T.LatheGeometry(
					points.map(([r, z]) => new T.Vector2(r, z)),
					64,
				).rotateX(side * HALF_PI)
			}),
		[],
	)
	useEffect(
		() => () => {
			shellMaterial.dispose()
			shellXray.dispose()
			Object.values(resources).forEach((g) => g.dispose())
			halves.forEach((g) => g.dispose())
		},
		[resources, halves, shellMaterial, shellXray],
	)
	const teardown = useTeardown(),
		ghost = xray && teardown.amount < 0.1
	const route = useMemo(() => {
		const from = new T.Vector3(S.transmission.outputX, AXIS_Y, 0),
			to = new T.Vector3(S.transmission.driveshaftEndX, S.wheels.radius, 0)
		const delta = from.clone().sub(to)
		return {
			position: from.add(to).multiplyScalar(0.5),
			length: delta.length(),
			quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 0, 0), delta.normalize()),
		}
	}, [])
	useFrame(() => {
		if (prop.current) prop.current.rotation.x = stateRef.current.outputAngle
		if (joints.current) joints.current.rotation.x = stateRef.current.outputAngle
		if (carrier.current) carrier.current.rotation.z = -stateRef.current.wheelAngle
		if (pinion.current) pinion.current.rotation.x = stateRef.current.outputAngle + Math.PI
		if (halfLeft.current) halfLeft.current.rotation.z = -stateRef.current.wheelAngle
		if (halfRight.current) halfRight.current.rotation.z = -stateRef.current.wheelAngle
	})
	return (
		<>
			<TeardownPart id="drive-prop">
				<group
					position={route.position}
					quaternion={route.quaternion}
					userData={{ partId: 'driveshaft' }}
				>
					<group ref={prop}>
						<mesh rotation-z={-HALF_PI} material={material} castShadow>
							<cylinderGeometry
								args={[G.propellerRadius, G.propellerRadius, route.length - G.jointLength, 32]}
							/>
						</mesh>
						<mesh position={[0, G.propellerRadius, 0]} material={diffMaterial}>
							<boxGeometry args={[route.length * 0.18, G.phaseMarkerRadius, G.phaseMarkerRadius]} />
						</mesh>
					</group>
				</group>
			</TeardownPart>
			<group position={route.position} quaternion={route.quaternion}>
				<group ref={joints}>
					{[-1, 1].map((side, i) => (
						<TeardownPart
							key={side}
							id="drive-joints"
							representative={side > 0}
							offset={teardown.assembly ? [side, 0, 0] : undefined}
						>
							<group
								key={side}
								position-x={(side * (route.length - G.jointLength)) / 2}
								userData={{ partId: `prop-universal-${i + 1}` }}
							>
								{[-1, 1].map((arm) => (
									<mesh key={arm} position={[0, arm * G.jointRadius, 0]} material={material}>
										<boxGeometry
											args={[G.jointLength, G.propellerRadius * 0.6, G.propellerRadius]}
										/>
									</mesh>
								))}
								<mesh material={material}>
									<cylinderGeometry
										args={[
											G.propellerRadius * 0.45,
											G.propellerRadius * 0.45,
											G.jointRadius * 2.4,
											16,
										]}
									/>
								</mesh>
								<mesh rotation-x={HALF_PI} material={material}>
									<cylinderGeometry
										args={[
											G.propellerRadius * 0.45,
											G.propellerRadius * 0.45,
											G.jointRadius * 2.4,
											16,
										]}
									/>
								</mesh>
							</group>
						</TeardownPart>
					))}
				</group>
			</group>
			{[-1, 1].map((side, i) => (
				<TeardownPart
					key={side}
					id="drive-axle"
					offset={[0, 0, side * A.drivetrain.axleShell[2]]}
					anchor={[S.transmission.differentialX, S.wheels.radius, side * DG.axleHousingLength]}
					representative={side > 0}
				>
					<mesh
						position={[S.transmission.differentialX, S.wheels.radius, 0]}
						geometry={halves[i]}
						material={ghost ? shellXray : shellMaterial}
						userData={{ partId: side < 0 ? 'drivetrain-axle-left' : 'drivetrain-axle-right' }}
					/>
				</TeardownPart>
			))}
			<TeardownPart id="drive-differential">
				<group position={[S.transmission.differentialX, S.wheels.radius, 0]}>
					<group ref={pinion} userData={{ partId: 'final-drive-pinion' }}>
						<mesh geometry={resources.pinion} material={pinMaterial} />
					</group>
					<group ref={carrier} userData={{ partId: 'differential' }}>
						<mesh
							geometry={resources.ring}
							material={ringMaterial}
							userData={{ partId: 'final-drive-ring' }}
						/>
						{[-1, 1].map((side) => (
							<mesh
								key={side}
								position-z={(side * DG.carrierLength) / 2}
								geometry={carrierEnd}
								material={diffMaterial}
							/>
						))}
						{[-1, 1].map((side) => (
							<mesh
								key={side}
								position-x={side * (DG.carrierRadius - DG.carrierWall / 2)}
								material={diffMaterial}
							>
								<boxGeometry args={[DG.carrierWall, DG.carrierWall * 3, DG.carrierLength]} />
							</mesh>
						))}
						<mesh material={diffMaterial}>
							<cylinderGeometry
								args={[DG.planetAxleRadius, DG.planetAxleRadius, DG.carrierRadius * 2, 16]}
							/>
						</mesh>
						{[-1, 1].map((side, i) => (
							<mesh
								key={side}
								rotation-x={-side * HALF_PI}
								geometry={resources.planet}
								material={diffMaterial}
								userData={{ partId: `drivetrain-planet-${i + 1}` }}
							/>
						))}
						{[-1, 1].map((side, i) => (
							<mesh
								key={side}
								rotation-y={side < 0 ? Math.PI : 0}
								geometry={resources.side}
								material={diffMaterial}
								userData={{ partId: `drivetrain-side-${i + 1}` }}
							/>
						))}
					</group>
				</group>
			</TeardownPart>
			{[-1, 1].map((side, i) => (
				<TeardownPart
					key={side}
					id="drive-halfshafts"
					offset={[0, A.drivetrain.halfshafts[1], side * A.drivetrain.halfshafts[2]]}
					representative={side > 0}
				>
					<group position={[S.transmission.differentialX, S.wheels.radius, 0]}>
						<group
							ref={side < 0 ? halfLeft : halfRight}
							userData={{ partId: `halfshaft-${i + 1}` }}
						>
							<mesh
								position-z={side * (S.wheels.rearTrack / 4 + DG.carrierLength / 4)}
								rotation-x={HALF_PI}
								material={halfMaterials[i]}
								castShadow
							>
								<cylinderGeometry
									args={[
										G.halfshaftRadius,
										G.halfshaftRadius,
										S.wheels.rearTrack / 2 - DG.carrierLength / 2,
										24,
									]}
								/>
							</mesh>
							<mesh
								position={[G.halfshaftRadius, 0, side * S.wheels.rearTrack * 0.37]}
								material={halfMaterials[i]}
							>
								<boxGeometry
									args={[G.phaseMarkerRadius, G.phaseMarkerRadius, G.phaseMarkerLength]}
								/>
							</mesh>
						</group>
					</group>
				</TeardownPart>
			))}
		</>
	)
}

/** Every animated part consumes the same pure-model clock; no component integrates time. */
export function Transmission({ stateRef, xray, assembly, steeringRef }: TransmissionProps) {
	const [idlerY, idlerZ] = reverseIdlerCentre()
	if (assembly === 'rear-axle') return <AxleTeardown stateRef={steeringRef} />
	return (
		<group>
			<Castings xray={xray} />
			<Clutch stateRef={stateRef} />
			<TeardownPart id="drive-bearings">
				<Bearings />
			</TeardownPart>
			<TeardownPart id="drive-input">
				<Shaft
					id="gearbox-input-shaft"
					front={G.inputFrontX}
					rear={G.inputRearX}
					y={AXIS_Y}
					angle="inputAngle"
					stateRef={stateRef}
				/>
			</TeardownPart>
			<TeardownPart id="drive-output">
				<Shaft
					id="gearbox-output-shaft"
					front={G.outputFrontX}
					rear={S.transmission.outputX}
					y={AXIS_Y}
					angle="outputAngle"
					stateRef={stateRef}
				/>
			</TeardownPart>
			<TeardownPart id="drive-layshaft">
				<Shaft
					id="gearbox-layshaft"
					front={G.layshaftFrontX}
					rear={G.layshaftRearX}
					y={LAYSHAFT_Y}
					angle="layshaftAngle"
					stateRef={stateRef}
				/>
			</TeardownPart>
			{GEARBOX_GEARS.map((node) => (
				<TeardownPart
					key={node.id}
					id={
						node.shaft === 'input'
							? 'drive-input'
							: node.shaft === 'layshaft'
								? 'drive-layshaft'
								: node.shaft === 'idler'
									? 'drive-idler'
									: 'drive-output'
					}
					representative={node.shaft === 'idler'}
				>
					<Gear node={node} stateRef={stateRef} />
				</TeardownPart>
			))}
			{SLEEVE_IDS.map((id) => (
				<Synchronizer key={id} id={id} stateRef={stateRef} />
			))}
			<TeardownPart id="drive-idler" representative={false}>
				<mesh
					position={[G.stations.R, idlerY, idlerZ]}
					rotation-z={-HALF_PI}
					userData={{ partId: 'gearbox-reverse-idler' }}
				>
					<cylinderGeometry
						args={[G.reverseIdlerAxleRadius, G.reverseIdlerAxleRadius, G.gearWidth * 1.8, 20]}
					/>
					<meshStandardMaterial {...STEEL} />
				</mesh>
			</TeardownPart>
			<TeardownPart id="drive-forks" representative={false}>
				<mesh
					position={[(G.caseFrontX + G.caseRearX) / 2, AXIS_Y + G.forkRailY, G.forkRailZ]}
					rotation-z={-HALF_PI}
					userData={{ partId: 'shift-rails' }}
				>
					<cylinderGeometry
						args={[G.forkRailRadius, G.forkRailRadius, G.caseFrontX - G.caseRearX, 16]}
					/>
					<meshStandardMaterial {...STEEL} />
				</mesh>
			</TeardownPart>
			<RearDrive stateRef={stateRef} xray={xray} />
		</group>
	)
}
