import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import * as T from 'three'
import {createCastAluminumMaterial, createXrayMaterial} from './engine-geometry'
import {
	createAnnulus,
	createBellHousing,
	createGearboxCase,
	createGearboxGear,
	createFinalDriveGear,
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
import {TRANSMISSION_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'

export type TransmissionProps = {stateRef: RefObject<TransmissionState>; xray: boolean}
type Clock = {stateRef: RefObject<TransmissionState>}
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

function Gear({node, stateRef}: Clock & {node: GearNode}) {
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
	useFrame(() => {
		if (ref.current) ref.current.rotation.x = gearboxGearAngle(node, stateRef.current)
	})
	return (
		<group ref={ref} position={[node.x, node.y, node.z]} userData={{partId: node.id}}>
			<mesh geometry={geometry} material={material} castShadow />
			{sleeve && (
				<group position-x={dogX}>
					<mesh geometry={dogGeometry} material={material} />
					{Array.from({length: G.dogTeeth}, (_, i) => {
						const a = (i * Math.PI * 2) / G.dogTeeth
						return (
							<mesh
								key={i}
								position={[0, Math.cos(a) * G.dogRadius, Math.sin(a) * G.dogRadius]}
								rotation-x={a}
								material={material}>
								<boxGeometry args={[G.dogWidth, G.sleeveGroove * 0.6, G.sleeveGroove * 0.7]} />
							</mesh>
						)
					})}
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
		<group ref={ref} position={[(front + rear) / 2, y, z]} userData={{partId: id}}>
			<mesh rotation-z={-HALF_PI} material={material} castShadow>
				<cylinderGeometry args={[radius, radius, front - rear, 32]} />
			</mesh>
			{[0, Math.PI].map((a) => (
				<mesh
					key={a}
					position={[0, Math.cos(a) * radius, Math.sin(a) * radius]}
					rotation-x={a}
					material={material}>
					<boxGeometry args={[front - rear, G.sleeveGroove * 0.5, G.sleeveGroove * 0.7]} />
				</mesh>
			))}
		</group>
	)
}

function Synchronizer({id, stateRef}: Clock & {id: SleeveId}) {
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
		const points = Array.from({length: 45}, (_, i) => {
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
			<mesh
				ref={hubRef}
				position={[G.sleeves[id].x, AXIS_Y, 0]}
				geometry={hub}
				material={material}
				userData={{partId: `synchronizer-${id}`}}
			/>
			<group
				ref={sleeveRef}
				position={[G.sleeves[id].x, AXIS_Y, 0]}
				userData={{partId: `synchronizer-${id}`}}>
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
			<group
				ref={forkRef}
				position={[G.sleeves[id].x, AXIS_Y, 0]}
				userData={{partId: `shift-fork-${id}`}}>
				<mesh geometry={fork}>
					<meshStandardMaterial {...S.materials.aluminum} />
				</mesh>
				<mesh geometry={stem}>
					<meshStandardMaterial {...S.materials.aluminum} />
				</mesh>
			</group>
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
					userData={{partId: `gearbox-bearing-${id}`}}>
					<meshStandardMaterial {...STEEL} roughness={0.3} />
				</mesh>
			))}
		</>
	)
}

function Castings({xray}: {xray: boolean}) {
	const housing = useOwnedGeometry(createGearboxCase),
		bell = useOwnedGeometry(createBellHousing)
	const edges = useOwnedGeometry(() => new T.EdgesGeometry(housing, 35), [housing])
	const bellEdges = useOwnedGeometry(() => new T.EdgesGeometry(bell, 40), [bell])
	const cast = useMemo(createCastAluminumMaterial, []),
		transparent = useMemo(createXrayMaterial, [])
	useEffect(
		() => () => {
			cast.dispose()
			transparent.dispose()
		},
		[cast, transparent],
	)
	return (
		<group userData={{partId: 'gearbox-case'}}>
			<mesh geometry={housing} material={xray ? transparent : cast} castShadow={!xray} />
			<mesh geometry={bell} material={xray ? transparent : cast} castShadow={!xray} />
			{xray ? (
				<>
					<lineSegments geometry={edges}>
						<lineBasicMaterial
							color={S.materials.xray}
							transparent
							opacity={0.24}
							depthWrite={false}
						/>
					</lineSegments>
					<lineSegments geometry={bellEdges}>
						<lineBasicMaterial
							color={S.materials.xray}
							transparent
							opacity={0.19}
							depthWrite={false}
						/>
					</lineSegments>
				</>
			) : (
				Array.from({length: G.caseRibCount}, (_, i) => {
					const x = G.caseRearX + ((G.caseFrontX - G.caseRearX) * (i + 1)) / (G.caseRibCount + 1)
					return (
						<mesh
							key={i}
							position={[x, AXIS_Y + (G.caseTop + G.caseBottom) / 2, 0]}
							rotation-y={HALF_PI}
							scale={[1, (G.caseTop - G.caseBottom) / (2 * G.caseHalfWidth), 1]}
							material={cast}>
							<torusGeometry args={[G.caseHalfWidth, G.caseRib, 8, 48]} />
						</mesh>
					)
				})
			)}
		</group>
	)
}

function Clutch({stateRef}: Clock) {
	const disc = useRef<T.Mesh>(null),
		plate = useRef<T.Group>(null)
	const material = useTorqueMaterial('clutch-pressure-plate', stateRef)
	const discMaterial = useTorqueMaterial('clutch-disc', stateRef)
	const discGeometry = useOwnedGeometry(() =>
		createAnnulus(G.clutchRadius, G.shaftRadius, G.clutchThickness),
	)
	const plateGeometry = useOwnedGeometry(() =>
		createAnnulus(G.pressurePlateRadius, G.clutchRadius * 0.6, G.pressurePlateThickness),
	)
	useFrame(() => {
		const state = stateRef.current
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
			<mesh
				ref={disc}
				position={[G.clutchDiscX, AXIS_Y, 0]}
				geometry={discGeometry}
				material={discMaterial}
				userData={{partId: 'clutch-disc'}}
			/>
			<group
				ref={plate}
				position={[G.clutchDiscX - (G.pressurePlateThickness + G.clutchThickness) / 2, AXIS_Y, 0]}
				userData={{partId: 'clutch-pressure-plate'}}>
				<mesh geometry={plateGeometry} material={material} />
				{Array.from({length: G.dogTeeth}, (_, i) => {
					const a = (i * Math.PI * 2) / G.dogTeeth
					return (
						<mesh
							key={i}
							rotation-x={a}
							position={[
								0,
								Math.cos(a) * G.clutchRadius * 0.43,
								Math.sin(a) * G.clutchRadius * 0.43,
							]}
							material={material}>
							<boxGeometry args={[G.caseRib, G.clutchRadius * 0.46, G.caseWall * 1.3]} />
						</mesh>
					)
				})}
			</group>
		</>
	)
}

function RearDrive({stateRef, xray}: Clock & {xray: boolean}) {
	const prop = useRef<T.Group>(null),
		carrier = useRef<T.Group>(null),
		pinion = useRef<T.Group>(null)
	const material = useTorqueMaterial('driveshaft', stateRef)
	const diffMaterial = useTorqueMaterial('differential', stateRef)
	const pinMaterial = useTorqueMaterial('final-drive-pinion', stateRef),
		ringMaterial = useTorqueMaterial('final-drive-ring', stateRef)
	const ringGeometry = useOwnedGeometry(() =>
		createFinalDriveGear(
			S.transmission.finalDrive.driven,
			S.transmission.finalDrive.driver,
			G.finalDriveBore,
		),
	)
	const pinGeometry = useOwnedGeometry(() =>
		createFinalDriveGear(
			S.transmission.finalDrive.driver,
			S.transmission.finalDrive.driven,
			G.shaftRadius,
		).rotateY(HALF_PI),
	)
	const shellMaterial = useMemo(createCastAluminumMaterial, []),
		shellXray = useMemo(createXrayMaterial, [])
	useEffect(
		() => () => {
			shellMaterial.dispose()
			shellXray.dispose()
		},
		[shellMaterial, shellXray],
	)
	const halfMaterials = [
		useTorqueMaterial('halfshaft-1', stateRef),
		useTorqueMaterial('halfshaft-2', stateRef),
	]
	const route = useMemo(() => {
		const from = new T.Vector3(S.transmission.outputX, AXIS_Y, 0)
		const to = new T.Vector3(S.transmission.driveshaftEndX, S.wheels.radius, 0)
		const delta = from.clone().sub(to)
		return {
			position: from.add(to).multiplyScalar(0.5),
			length: delta.length(),
			quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 0, 0), delta.normalize()),
		}
	}, [])
	useFrame(() => {
		if (prop.current) prop.current.rotation.x = stateRef.current.outputAngle
		if (carrier.current) carrier.current.rotation.z = -stateRef.current.wheelAngle
		if (pinion.current) pinion.current.rotation.x = stateRef.current.outputAngle + Math.PI
	})
	return (
		<>
			<group
				position={route.position}
				quaternion={route.quaternion}
				userData={{partId: 'driveshaft'}}>
				<group ref={prop}>
					<mesh rotation-z={-HALF_PI} material={material} castShadow>
						<cylinderGeometry args={[G.propellerRadius, G.propellerRadius, route.length, 32]} />
					</mesh>
					{[-1, 1].map((side) => (
						<group key={side} position-x={(side * (route.length - G.jointLength)) / 2}>
							<mesh material={material}>
								<boxGeometry args={[G.jointLength, G.jointRadius * 2, G.propellerRadius]} />
							</mesh>
							<mesh rotation-x={HALF_PI} material={material}>
								<cylinderGeometry
									args={[G.propellerRadius * 0.6, G.propellerRadius * 0.6, G.jointRadius * 2.4, 16]}
								/>
							</mesh>
						</group>
					))}
					<mesh position={[0, G.propellerRadius, 0]} material={diffMaterial}>
						<boxGeometry args={[route.length * 0.18, G.phaseMarkerRadius, G.phaseMarkerRadius]} />
					</mesh>
				</group>
			</group>
			<group
				position={[S.transmission.differentialX, S.wheels.radius, 0]}
				userData={{partId: 'differential'}}>
				<mesh
					scale={[G.differentialLength / G.differentialRadius, 1, 1]}
					material={xray ? shellXray : shellMaterial}
					castShadow={!xray}>
					<sphereGeometry args={[G.differentialRadius, 32, 20]} />
				</mesh>
				<group ref={pinion} userData={{partId: 'final-drive-pinion'}}>
					<mesh geometry={pinGeometry} material={pinMaterial} />
					<mesh
						position-x={G.differentialLength * 0.7}
						rotation-z={-HALF_PI}
						material={pinMaterial}>
						<cylinderGeometry
							args={[G.shaftRadius, G.shaftRadius, G.differentialLength * 0.7, 24]}
						/>
					</mesh>
				</group>
				<group ref={carrier}>
					<mesh
						geometry={ringGeometry}
						rotation-z={-Math.PI / S.transmission.finalDrive.driven}
						material={ringMaterial}
						userData={{partId: 'final-drive-ring'}}
					/>
					<mesh rotation-x={HALF_PI} material={diffMaterial}>
						<cylinderGeometry
							args={[
								G.differentialCarrierRadius,
								G.differentialCarrierRadius,
								G.differentialCarrierWidth,
								32,
							]}
						/>
					</mesh>
					{[-1, 1].map((side, index) => (
						<group key={side} userData={{partId: `halfshaft-${index + 1}`}}>
							<mesh
								position-z={(side * S.wheels.rearTrack) / 4}
								rotation-x={HALF_PI}
								material={halfMaterials[index]}
								castShadow>
								<cylinderGeometry
									args={[G.halfshaftRadius, G.halfshaftRadius, S.wheels.rearTrack / 2, 24]}
								/>
							</mesh>
							<mesh
								position={[G.halfshaftRadius, 0, side * S.wheels.rearTrack * 0.37]}
								material={halfMaterials[index]}>
								<boxGeometry
									args={[G.phaseMarkerRadius, G.phaseMarkerRadius, G.phaseMarkerLength]}
								/>
							</mesh>
						</group>
					))}
				</group>
			</group>
		</>
	)
}

/** Every animated part consumes the same pure-model clock; no component integrates time. */
export function Transmission({stateRef, xray}: TransmissionProps) {
	const [idlerY, idlerZ] = reverseIdlerCentre()
	return (
		<group>
			<Castings xray={xray} />
			<Clutch stateRef={stateRef} />
			<Bearings />
			<Shaft
				id="gearbox-input-shaft"
				front={G.inputFrontX}
				rear={G.inputRearX}
				y={AXIS_Y}
				angle="inputAngle"
				stateRef={stateRef}
			/>
			<Shaft
				id="gearbox-output-shaft"
				front={G.outputFrontX}
				rear={S.transmission.outputX}
				y={AXIS_Y}
				angle="outputAngle"
				stateRef={stateRef}
			/>
			<Shaft
				id="gearbox-layshaft"
				front={G.layshaftFrontX}
				rear={G.layshaftRearX}
				y={LAYSHAFT_Y}
				angle="layshaftAngle"
				stateRef={stateRef}
			/>
			{GEARBOX_GEARS.map((node) => (
				<Gear key={node.id} node={node} stateRef={stateRef} />
			))}
			{SLEEVE_IDS.map((id) => (
				<Synchronizer key={id} id={id} stateRef={stateRef} />
			))}
			<mesh
				position={[G.stations.R, idlerY, idlerZ]}
				rotation-z={-HALF_PI}
				userData={{partId: 'gearbox-reverse-idler'}}>
				<cylinderGeometry
					args={[G.reverseIdlerAxleRadius, G.reverseIdlerAxleRadius, G.gearWidth * 1.8, 20]}
				/>
				<meshStandardMaterial {...STEEL} />
			</mesh>
			<mesh
				position={[(G.caseFrontX + G.caseRearX) / 2, AXIS_Y + G.forkRailY, G.forkRailZ]}
				rotation-z={-HALF_PI}
				userData={{partId: 'shift-rails'}}>
				<cylinderGeometry
					args={[G.forkRailRadius, G.forkRailRadius, G.caseFrontX - G.caseRearX, 16]}
				/>
				<meshStandardMaterial {...STEEL} />
			</mesh>
			<RearDrive stateRef={stateRef} xray={xray} />
		</group>
	)
}
