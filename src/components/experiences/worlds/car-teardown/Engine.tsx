import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {cylinderState} from './model'
import {VEHICLE_SPEC, type CylinderNumber, type ValveType} from './vehicle-spec'
import {
	CYLINDERS,
	ENGINE_CENTER_X,
	cylinderX,
	createBoredCasting,
	createCamLobe,
	createCrankWeb,
	createValveSpring,
	createTimingPath,
	createTube,
	createXrayMaterial,
	createCastAluminumMaterial,
	createPitchLoop,
	createRibbonLoop,
	createRodEye,
} from './engine-geometry'

const E = VEHICLE_SPEC.engine
const G = E.geometry
const M = VEHICLE_SPEC.materials
const DEG = Math.PI / 180
const X_AXIS: [number, number, number] = [0, 0, -Math.PI / 2]
const RING_X: [number, number, number] = [0, Math.PI / 2, 0]
const RING_Y: [number, number, number] = [Math.PI / 2, 0, 0]

export interface EngineProps {
	angleRef: RefObject<number>
	rpm: number
	xray: boolean
}

function makeResources() {
	const block = createBoredCasting(G.blockLength, G.blockWidth, G.deckY - G.blockBottom, E.bore / 2)
	const head = createBoredCasting(G.blockLength, G.headWidth, G.headHeight, E.bore / 2)
	const cover = new THREE.BoxGeometry(G.blockLength, G.camShaftRadius * 3, G.headWidth)
	const pan = new THREE.BoxGeometry(G.blockLength, G.oilPanHeight, G.blockWidth)
	const lowerCase = createBoredCasting(G.blockLength, G.blockWidth, G.crankcaseHeight, E.bore / 2)
	const allCasting = [block, head, cover, pan, lowerCase]
	const castingEdges = allCasting.map((geometry) => new THREE.EdgesGeometry(geometry, 24))
	const spring = createValveSpring()
	const crankWeb = createCrankWeb()
	const rodBigEye = createRodEye(G.rodBigRadius, G.crankPinRadius)
	const rodSmallEye = createRodEye(G.rodSmallRadius, G.pinRadius)
	const camLobes = (['intake', 'exhaust'] as const).flatMap((valve) =>
		CYLINDERS.map((cylinder) => createCamLobe(cylinder, valve)),
	)
	const timingPath = createTimingPath()
	const chainPitch = (2 * Math.PI * G.crankSprocketRadius) / E.timing.crankSprocketTeeth
	const chainCount = 2 * Math.round(timingPath.getLength() / chainPitch / 2)
	const chainGeometry = new THREE.BoxGeometry(
		G.timingThickness,
		(timingPath.getLength() / chainCount) * 0.78,
		G.timingChainRadius * 1.7,
	)
	const materials = {
		steel: new THREE.MeshStandardMaterial(M.steel),
		aluminum: createCastAluminumMaterial(),
		darkSteel: new THREE.MeshStandardMaterial({...M.steel, color: '#626970', roughness: 0.34}),
		bronze: new THREE.MeshStandardMaterial(M.caliper),
		black: new THREE.MeshStandardMaterial(M.plastic),
		rubber: new THREE.MeshStandardMaterial(M.rubber),
		ceramic: new THREE.MeshStandardMaterial({color: '#d8d7cb', roughness: 0.24}),
		xray: createXrayMaterial(),
		edges: new THREE.LineBasicMaterial({
			color: M.xray,
			transparent: true,
			opacity: M.xrayEdgeOpacity,
			depthWrite: false,
		}),
	}
	return {
		block,
		head,
		cover,
		pan,
		lowerCase,
		castingEdges,
		spring,
		crankWeb,
		rodBigEye,
		rodSmallEye,
		camLobes,
		timingPath,
		chainCount,
		chainGeometry,
		materials,
	}
}

type Resources = ReturnType<typeof makeResources>

function Casting({
	geometry,
	edges,
	position,
	xray,
	resources,
	partId,
	dark = false,
}: {
	geometry: THREE.BufferGeometry
	edges: THREE.BufferGeometry
	position: [number, number, number]
	xray: boolean
	resources: Resources
	partId: string
	dark?: boolean
}) {
	return (
		<group position={position} userData={{partId}}>
			<mesh
				geometry={geometry}
				material={
					xray ? resources.materials.xray : dark ? resources.materials.black : resources.materials.aluminum
				}
				castShadow={!xray}
				receiveShadow
				userData={{partId}}
			/>
			{xray && <lineSegments geometry={edges} material={resources.materials.edges} renderOrder={3} />}
		</group>
	)
}

function Crankshaft({angleRef, resources}: Pick<EngineProps, 'angleRef'> & {resources: Resources}) {
	const shaft = useRef<THREE.Group>(null)
	useFrame(() => {
		if (shaft.current) shaft.current.rotation.x = angleRef.current * DEG
	})
	return (
		<group ref={shaft} position={[0, E.crankY, 0]} userData={{partId: 'crankshaft'}}>
			{Array.from({length: 5}, (_, index) => {
				const x = E.cylinder1X + E.cylinderSpacing / 2 - index * E.cylinderSpacing
				return (
					<mesh
						key={index}
						position={[x, 0, 0]}
						rotation={X_AXIS}
						material={resources.materials.steel}
						castShadow>
						<cylinderGeometry args={[G.crankMainRadius, G.crankMainRadius, G.crankWebThickness * 2, 40]} />
					</mesh>
				)
			})}
			{CYLINDERS.map((cylinder) => (
				<group
					key={cylinder}
					position={[cylinderX(cylinder), 0, 0]}
					rotation={[(E.firingOffsets[cylinder] % 360) * DEG, 0, 0]}>
					<mesh
						position={[0, E.crankRadius, 0]}
						rotation={X_AXIS}
						material={resources.materials.steel}
						castShadow>
						<cylinderGeometry
							args={[G.crankPinRadius, G.crankPinRadius, E.cylinderSpacing - G.crankWebThickness * 4, 40]}
						/>
					</mesh>
					{[-1, 1].map((side) => (
						<mesh
							key={side}
							position={[side * G.crankWebThickness * 1.9, 0, 0]}
							geometry={resources.crankWeb}
							material={resources.materials.darkSteel}
							castShadow
						/>
					))}
				</group>
			))}
			{[-1, 1].map((side) => (
				<mesh
					key={side}
					position={[ENGINE_CENTER_X + side * (G.blockLength / 2 + G.shaftEnd / 2), 0, 0]}
					rotation={X_AXIS}
					material={resources.materials.steel}>
					<cylinderGeometry args={[G.crankMainRadius, G.crankMainRadius, G.shaftEnd, 32]} />
				</mesh>
			))}
			<group
				position={[ENGINE_CENTER_X - G.blockLength / 2 - G.shaftEnd / 2, 0, 0]}
				userData={{partId: 'flywheel'}}>
				<mesh rotation={X_AXIS} material={resources.materials.darkSteel} castShadow>
					<cylinderGeometry args={[G.flywheelRadius, G.flywheelRadius, G.flywheelThickness, 80]} />
				</mesh>
				<mesh
					rotation={RING_X}
					position={[-G.flywheelThickness / 2 - G.ringTube, 0, 0]}
					material={resources.materials.steel}>
					<torusGeometry args={[G.flywheelRadius * 0.85, G.ringTube * 2, 8, 80]} />
				</mesh>
				{Array.from({length: 8}, (_, index) => (
					<mesh
						key={index}
						rotation={X_AXIS}
						position={[
							-G.flywheelThickness / 2 - G.ringTube,
							Math.cos((index / 8) * Math.PI * 2) * G.flywheelRadius * 0.44,
							Math.sin((index / 8) * Math.PI * 2) * G.flywheelRadius * 0.44,
						]}
						material={resources.materials.steel}>
						<cylinderGeometry args={[G.pinRadius / 2, G.pinRadius / 2, G.ringTube * 2, 6]} />
					</mesh>
				))}
			</group>
		</group>
	)
}

function PistonAssembly({
	cylinder,
	angleRef,
	rpm,
	resources,
	xray,
}: EngineProps & {cylinder: CylinderNumber; resources: Resources}) {
	const piston = useRef<THREE.Group>(null)
	const rod = useRef<THREE.Group>(null)
	const gas = useRef<THREE.Mesh>(null)
	const gasMaterial = useRef<THREE.MeshBasicMaterial>(null)
	const spark = useRef<THREE.Mesh>(null)
	const sparkMaterial = useRef<THREE.MeshBasicMaterial>(null)
	const colors = useMemo(
		() => Object.fromEntries(Object.entries(M.strokes).map(([key, value]) => [key, new THREE.Color(value)])),
		[],
	)
	useFrame(() => {
		const state = cylinderState(angleRef.current, cylinder, rpm)
		if (piston.current) piston.current.position.y = E.crankY + state.pistonPosition
		if (rod.current) {
			rod.current.position.set(
				cylinderX(cylinder),
				E.crankY + E.crankRadius * Math.cos(state.crankAngle * DEG),
				E.crankRadius * Math.sin(state.crankAngle * DEG),
			)
			rod.current.rotation.x = -state.rodAngle
		}
		if (gas.current && gasMaterial.current) {
			const crown = E.crankY + state.pistonPosition + G.pinToCrown
			const height = G.deckY - crown
			gas.current.position.y = crown + height / 2
			gas.current.scale.y = height
			gasMaterial.current.color.copy(colors[state.stroke])
			if (state.stroke === 'power')
				gasMaterial.current.color.multiplyScalar(1.35 - (state.cycleAngle / 180) * 0.6)
			gasMaterial.current.opacity = state.stroke === 'power' ? 0.22 : 0.12
			if (state.sparkIntensity > 0)
				gasMaterial.current.color.lerp(colors.ignition, state.sparkIntensity * 0.75)
		}
		if (spark.current && sparkMaterial.current) {
			spark.current.visible = xray && state.sparkIntensity > 0.005
			sparkMaterial.current.color.set(M.strokes.ignition).multiplyScalar(3 + state.sparkIntensity * 7)
			spark.current.scale.setScalar(0.65 + state.sparkIntensity * 0.65)
		}
	})
	return (
		<>
			<group
				ref={piston}
				position={[cylinderX(cylinder), E.crankY + E.rodLength + E.crankRadius, 0]}
				userData={{partId: `piston-${cylinder}`}}>
				<mesh
					position={[0, G.pinToCrown - G.pistonHeight / 2, 0]}
					material={resources.materials.aluminum}
					castShadow
					userData={{partId: `piston-${cylinder}`}}>
					<cylinderGeometry args={[G.pistonRadius, G.pistonRadius, G.pistonHeight, 64]} />
				</mesh>
				<group userData={{partId: `piston-rings-${cylinder}`}}>
					{G.ringOffsets.map((offset, index) => (
						<mesh
							key={offset}
							position={[0, offset, 0]}
							rotation={RING_Y}
							material={index === 2 ? resources.materials.bronze : resources.materials.darkSteel}>
							<torusGeometry args={[G.pistonRadius - G.ringTube / 2, G.ringTube, 6, 64]} />
						</mesh>
					))}
				</group>
				<mesh
					rotation={X_AXIS}
					material={resources.materials.steel}
					userData={{partId: `piston-pin-${cylinder}`}}>
					<cylinderGeometry args={[G.pinRadius, G.pinRadius, G.pinLength, 32]} />
				</mesh>
			</group>
			<group ref={rod} userData={{partId: `connecting-rod-${cylinder}`}}>
				<mesh
					position={[0, (E.rodLength + G.rodBigRadius - G.rodSmallRadius) / 2, 0]}
					material={resources.materials.steel}
					castShadow>
					<boxGeometry
						args={[
							G.rodThickness,
							E.rodLength - G.rodBigRadius - G.rodSmallRadius + (G.rodWidth * 2) / 3,
							G.rodWidth,
						]}
					/>
				</mesh>
				<mesh
					position={[0, (E.rodLength + G.rodBigRadius - G.rodSmallRadius) / 2, 0]}
					material={resources.materials.darkSteel}>
					<boxGeometry args={[G.rodThickness * 1.05, E.rodLength - G.rodBigRadius * 2, G.rodWidth * 0.35]} />
				</mesh>
				<mesh geometry={resources.rodBigEye} material={resources.materials.steel} castShadow />
				<mesh
					position={[0, E.rodLength, 0]}
					geometry={resources.rodSmallEye}
					material={resources.materials.steel}
				/>
			</group>
			<mesh ref={gas} position={[cylinderX(cylinder), G.deckY, 0]} visible={xray} renderOrder={2}>
				<cylinderGeometry args={[G.pistonRadius * 0.985, G.pistonRadius * 0.985, 1, 48]} />
				<meshBasicMaterial
					ref={gasMaterial}
					color={M.strokes.intake}
					transparent
					opacity={0.13}
					depthWrite={false}
					side={THREE.DoubleSide}
				/>
			</mesh>
			<mesh
				ref={spark}
				position={[cylinderX(cylinder), G.deckY - G.sparkPlugRadius, 0]}
				visible={false}
				renderOrder={5}>
				<sphereGeometry args={[G.sparkPlugRadius * 1.5, 12, 8]} />
				<meshBasicMaterial ref={sparkMaterial} toneMapped={false} color={M.strokes.ignition} />
			</mesh>
		</>
	)
}

function Valve({
	cylinder,
	valve,
	index,
	angleRef,
	rpm,
	resources,
}: Pick<EngineProps, 'angleRef' | 'rpm'> & {
	cylinder: CylinderNumber
	valve: ValveType
	index: number
	resources: Resources
}) {
	const moving = useRef<THREE.Group>(null)
	const spring = useRef<THREE.Mesh>(null)
	const side = valve === 'intake' ? -1 : 1
	const id = `${valve}-${cylinder}-${index + 1}`
	const springBottom = G.valveStemLength - G.valveSpringHeight
	useFrame(() => {
		const state = cylinderState(angleRef.current, cylinder, rpm)
		const lift = valve === 'intake' ? state.intakeLift : state.exhaustLift
		if (moving.current) moving.current.position.y = -lift
		if (spring.current) spring.current.scale.y = (G.valveSpringHeight - lift) / G.valveSpringHeight
	})
	return (
		<group
			position={[
				cylinderX(cylinder) + (index === 0 ? -1 : 1) * G.valveXOffset,
				G.valveSeatY,
				side * G.valveZOffset,
			]}
			rotation={[side * G.valveInclination, 0, 0]}>
			<group ref={moving} userData={{partId: `valve-${id}`}}>
				<mesh material={resources.materials.steel} castShadow>
					<cylinderGeometry args={[G.valveRadius, G.valveRadius * 0.93, G.ringTube * 3, 32]} />
				</mesh>
				<mesh position={[0, G.valveStemLength / 2, 0]} material={resources.materials.steel}>
					<cylinderGeometry args={[G.valveStemRadius, G.valveStemRadius, G.valveStemLength, 16]} />
				</mesh>
				<mesh position={[0, G.valveStemLength - G.ringTube, 0]} material={resources.materials.steel}>
					<cylinderGeometry
						args={[G.valveSpringRadius * 1.15, G.valveSpringRadius * 1.15, G.ringTube * 2, 24]}
					/>
				</mesh>
			</group>
			<mesh
				ref={spring}
				position={[0, springBottom, 0]}
				geometry={resources.spring}
				material={resources.materials.darkSteel}
				userData={{partId: `valve-spring-${id}`}}
			/>
		</group>
	)
}

function Camshaft({
	valve,
	angleRef,
	resources,
}: Pick<EngineProps, 'angleRef'> & {valve: ValveType; resources: Resources}) {
	const shaft = useRef<THREE.Group>(null)
	const side = valve === 'intake' ? -1 : 1
	useFrame(() => {
		if (shaft.current) shaft.current.rotation.x = (angleRef.current * DEG) / 2
	})
	return (
		<group ref={shaft} position={[0, G.camY, side * G.camZ]} userData={{partId: `${valve}-camshaft`}}>
			<mesh
				position={[ENGINE_CENTER_X, 0, 0]}
				rotation={X_AXIS}
				material={resources.materials.steel}
				castShadow>
				<cylinderGeometry args={[G.camShaftRadius, G.camShaftRadius, G.blockLength + G.shaftEnd / 2, 32]} />
			</mesh>
			{CYLINDERS.flatMap((cylinder, cylinderIndex) =>
				[-1, 1].map((offset) => (
					<mesh
						key={`${cylinder}-${offset}`}
						position={[cylinderX(cylinder) + offset * G.valveXOffset, 0, 0]}
						geometry={resources.camLobes[(valve === 'intake' ? 0 : 4) + cylinderIndex]}
						material={resources.materials.steel}
						castShadow
					/>
				)),
			)}
		</group>
	)
}

function Sprocket({
	x,
	y,
	z,
	radius,
	teeth,
	speed,
	angleRef,
	resources,
	id,
}: {
	x: number
	y: number
	z: number
	radius: number
	teeth: number
	speed: number
	angleRef: RefObject<number>
	resources: Resources
	id: string
}) {
	const gear = useRef<THREE.Group>(null)
	const toothInstances = useRef<THREE.InstancedMesh>(null)
	useEffect(() => {
		if (!toothInstances.current) return
		const dummy = new THREE.Object3D()
		for (let index = 0; index < teeth; index++) {
			const angle = (index / teeth) * Math.PI * 2
			dummy.position.set(0, Math.cos(angle) * radius * 0.94, Math.sin(angle) * radius * 0.94)
			dummy.rotation.x = angle
			dummy.updateMatrix()
			toothInstances.current.setMatrixAt(index, dummy.matrix)
		}
		toothInstances.current.instanceMatrix.needsUpdate = true
	}, [radius, teeth])
	useFrame(() => {
		if (gear.current) gear.current.rotation.x = angleRef.current * DEG * speed
	})
	return (
		<group ref={gear} position={[x, y, z]} userData={{partId: id}}>
			<mesh rotation={X_AXIS} material={resources.materials.darkSteel}>
				<cylinderGeometry args={[radius * 0.9, radius * 0.9, G.timingThickness, 64]} />
			</mesh>
			<mesh rotation={RING_X} position={[G.timingThickness / 2, 0, 0]} material={resources.materials.steel}>
				<torusGeometry args={[radius * 0.62, G.ringTube * 2, 8, 48]} />
			</mesh>
			<instancedMesh
				ref={toothInstances}
				args={[undefined, resources.materials.steel, teeth]}
				frustumCulled={false}>
				<boxGeometry args={[G.timingThickness, G.timingChainRadius * 2.7, G.timingChainRadius * 1.6]} />
			</instancedMesh>
			<mesh rotation={X_AXIS} position={[G.timingThickness / 2, 0, 0]} material={resources.materials.steel}>
				<cylinderGeometry args={[G.camShaftRadius, G.camShaftRadius, G.timingThickness / 2, 6]} />
			</mesh>
		</group>
	)
}

function TimingChain({angleRef, resources}: Pick<EngineProps, 'angleRef'> & {resources: Resources}) {
	const links = useRef<THREE.InstancedMesh>(null)
	const dummy = useMemo(() => new THREE.Object3D(), [])
	const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
	useFrame(() => {
		if (!links.current) return
		const phase = (angleRef.current * DEG * G.crankSprocketRadius) / resources.timingPath.getLength()
		for (let index = 0; index < resources.chainCount; index++) {
			const t = (((index / resources.chainCount - phase) % 1) + 1) % 1
			dummy.position.copy(resources.timingPath.getPointAt(t))
			dummy.quaternion.setFromUnitVectors(up, resources.timingPath.getTangentAt(t))
			dummy.updateMatrix()
			links.current.setMatrixAt(index, dummy.matrix)
		}
		links.current.instanceMatrix.needsUpdate = true
	})
	return (
		<group userData={{partId: 'timing-chain'}}>
			<instancedMesh
				ref={links}
				args={[resources.chainGeometry, resources.materials.steel, resources.chainCount]}
				frustumCulled={false}
				userData={{partId: 'timing-chain'}}
			/>
			<Sprocket
				id="crank-sprocket"
				x={G.timingFrontX}
				y={E.crankY}
				z={0}
				radius={G.crankSprocketRadius}
				teeth={E.timing.crankSprocketTeeth}
				speed={1}
				angleRef={angleRef}
				resources={resources}
			/>
			{(['intake', 'exhaust'] as const).map((valve) => (
				<Sprocket
					key={valve}
					id={`${valve}-sprocket`}
					x={G.timingFrontX}
					y={G.camY}
					z={(valve === 'intake' ? -1 : 1) * G.camZ}
					radius={G.camSprocketRadius}
					teeth={E.timing.camSprocketTeeth}
					speed={0.5}
					angleRef={angleRef}
					resources={resources}
				/>
			))}
		</group>
	)
}

function EngineAncillaries({resources, xray}: {resources: Resources; xray: boolean}) {
	const pipes = useMemo(
		() =>
			CYLINDERS.flatMap((cylinder) => {
				const x = cylinderX(cylinder)
				return ([-1, 1] as const).map((side) =>
					createTube(
						[
							[x, G.deckY + G.headHeight / 2, (side * G.headWidth) / 2],
							[x, G.deckY + G.headHeight / 2, side * G.headWidth * 0.72],
							[x, G.deckY - E.bore * 0.2, side * G.headWidth],
							[x - E.cylinderSpacing * 0.2, G.deckY - E.bore * 0.65, side * G.headWidth * 1.1],
						],
						E.bore * (side === -1 ? 0.18 : 0.14),
					),
				)
			}),
		[],
	)
	useEffect(() => () => pipes.forEach((geometry) => geometry.dispose()), [pipes])
	return (
		<>
			{pipes.map((geometry, index) => (
				<mesh
					key={index}
					geometry={geometry}
					material={
						xray
							? resources.materials.xray
							: index % 2 === 0
								? resources.materials.black
								: resources.materials.bronze
					}
					userData={{partId: index % 2 === 0 ? 'intake-manifold' : 'exhaust-manifold'}}
					castShadow={!xray}
				/>
			))}
			{[-1, 1].map((side) => (
				<mesh
					key={side}
					position={[ENGINE_CENTER_X, G.deckY - E.bore * 0.65, side * G.headWidth * 1.1]}
					rotation={X_AXIS}
					material={
						xray
							? resources.materials.xray
							: side === -1
								? resources.materials.black
								: resources.materials.bronze
					}
					userData={{partId: side === -1 ? 'intake-manifold' : 'exhaust-manifold'}}>
					<cylinderGeometry
						args={[
							E.bore * (side === -1 ? 0.33 : 0.2),
							E.bore * (side === -1 ? 0.33 : 0.2),
							G.blockLength,
							32,
						]}
					/>
				</mesh>
			))}
			<mesh
				position={[E.cylinder1X + E.cylinderSpacing / 2, G.deckY - E.bore * 0.65, -G.headWidth * 1.1]}
				rotation={X_AXIS}
				material={resources.materials.aluminum}
				userData={{partId: 'throttle-body'}}>
				<cylinderGeometry args={[E.bore * 0.36, E.bore * 0.36, E.bore * 0.6, 32]} />
			</mesh>
			{CYLINDERS.map((cylinder) => (
				<group key={cylinder} position={[cylinderX(cylinder), G.deckY, 0]}>
					<group userData={{partId: `spark-plug-${cylinder}`}}>
						<mesh position={[0, G.sparkPlugLength / 2, 0]} material={resources.materials.ceramic}>
							<cylinderGeometry args={[G.sparkPlugRadius, G.sparkPlugRadius * 0.75, G.sparkPlugLength, 24]} />
						</mesh>
						<mesh position={[0, G.sparkPlugLength * 0.35, 0]} material={resources.materials.steel}>
							<cylinderGeometry
								args={[G.sparkPlugRadius * 1.2, G.sparkPlugRadius * 1.2, G.sparkPlugLength * 0.28, 6]}
							/>
						</mesh>
						<mesh position={[0, -G.sparkPlugRadius / 2, 0]} material={resources.materials.steel}>
							<cylinderGeometry args={[G.valveStemRadius / 3, G.valveStemRadius / 3, G.sparkPlugRadius, 8]} />
						</mesh>
					</group>
					<group userData={{partId: `ignition-coil-${cylinder}`}}>
						<mesh position={[0, G.headHeight, 0]} material={resources.materials.rubber}>
							<cylinderGeometry args={[G.sparkPlugRadius * 1.3, G.sparkPlugRadius * 1.3, G.headHeight, 20]} />
						</mesh>
						<mesh position={[0, G.camY - G.deckY + G.coilHeight, 0]} material={resources.materials.black}>
							<boxGeometry args={[G.coilRadius * 2.1, G.coilHeight, G.coilRadius * 2]} />
						</mesh>
					</group>
				</group>
			))}
			{Array.from({length: 5}, (_, index) => {
				const x = E.cylinder1X + E.cylinderSpacing / 2 - index * E.cylinderSpacing
				return (
					<group key={index} userData={{partId: `main-bearing-${index + 1}`}}>
						<mesh
							position={[x, E.crankY - G.crankMainRadius, 0]}
							material={xray ? resources.materials.xray : resources.materials.aluminum}>
							<boxGeometry args={[G.crankWebThickness * 1.7, G.crankMainRadius, G.blockWidth * 0.8]} />
						</mesh>
						{[-1, 1].map((side) => (
							<group key={side}>
								<mesh
									position={[x, G.deckY + G.headHeight + G.ringTube * 2, side * G.headWidth * 0.43]}
									material={resources.materials.steel}>
									<cylinderGeometry args={[G.pinRadius * 0.45, G.pinRadius * 0.45, G.ringTube * 3, 6]} />
								</mesh>
								<mesh
									position={[x, G.blockBottom + (G.deckY - G.blockBottom) / 2, (side * G.blockWidth) / 2]}
									material={xray ? resources.materials.xray : resources.materials.aluminum}>
									<boxGeometry
										args={[G.crankWebThickness / 2, G.deckY - G.blockBottom, G.crankWebThickness / 2]}
									/>
								</mesh>
							</group>
						))}
					</group>
				)
			})}
		</>
	)
}

/** All coordinates remain in the vehicle's frame. The caller owns system-level
 * explosion and ghosting, while this component owns only the engine mechanism.
 */
export function Engine({angleRef, rpm, xray}: EngineProps) {
	const resources = useMemo(makeResources, [])
	useEffect(
		() => () => {
			for (const geometry of [
				resources.block,
				resources.head,
				resources.cover,
				resources.pan,
				resources.lowerCase,
				...resources.castingEdges,
				resources.spring,
				resources.crankWeb,
				resources.rodBigEye,
				resources.rodSmallEye,
				...resources.camLobes,
				resources.chainGeometry,
			])
				geometry.dispose()
			Object.values(resources.materials).forEach((material) => material.dispose())
		},
		[resources],
	)
	return (
		<group name="inline-four-engine" userData={{system: 'powertrain'}}>
			<Casting
				geometry={resources.block}
				edges={resources.castingEdges[0]}
				position={[ENGINE_CENTER_X, G.blockBottom, 0]}
				xray={xray}
				resources={resources}
				partId="engine-block"
			/>
			<Casting
				geometry={resources.head}
				edges={resources.castingEdges[1]}
				position={[ENGINE_CENTER_X, G.deckY, 0]}
				xray={xray}
				resources={resources}
				partId="cylinder-head"
			/>
			<Casting
				geometry={resources.cover}
				edges={resources.castingEdges[2]}
				position={[ENGINE_CENTER_X, G.camY + E.timing.camBaseRadius + G.camShaftRadius, 0]}
				xray={xray}
				resources={resources}
				partId="cam-cover"
				dark
			/>
			<Casting
				geometry={resources.pan}
				edges={resources.castingEdges[3]}
				position={[ENGINE_CENTER_X, G.blockBottom - G.crankcaseHeight - G.oilPanHeight / 2, 0]}
				xray={xray}
				resources={resources}
				partId="oil-pan"
			/>
			<Casting
				geometry={resources.lowerCase}
				edges={resources.castingEdges[4]}
				position={[ENGINE_CENTER_X, G.blockBottom - G.crankcaseHeight, 0]}
				xray={xray}
				resources={resources}
				partId="engine-block"
			/>
			<Crankshaft angleRef={angleRef} resources={resources} />
			{CYLINDERS.map((cylinder) => (
				<PistonAssembly
					key={cylinder}
					cylinder={cylinder}
					angleRef={angleRef}
					rpm={rpm}
					xray={xray}
					resources={resources}
				/>
			))}
			{(['intake', 'exhaust'] as const).map((valve) => (
				<group key={valve}>
					<Camshaft valve={valve} angleRef={angleRef} resources={resources} />
					{CYLINDERS.flatMap((cylinder) =>
						[0, 1].map((index) => (
							<Valve
								key={`${cylinder}-${index}`}
								cylinder={cylinder}
								valve={valve}
								index={index}
								angleRef={angleRef}
								rpm={rpm}
								resources={resources}
							/>
						)),
					)}
				</group>
			))}
			<TimingChain angleRef={angleRef} resources={resources} />
			<EngineAncillaries resources={resources} xray={xray} />
		</group>
	)
}

/** The charging and starting hardware belongs to the electrical explosion
 * group, but shares the engine's coordinate frame and dimensional authority. */
export function EngineElectrical({angleRef}: {angleRef?: RefObject<number>}) {
	const crankPulley = useRef<THREE.Group>(null)
	const alternatorPulley = useRef<THREE.Group>(null)
	const pulleyRadius = G.crankPulleyRadius / VEHICLE_SPEC.electrical.alternatorPulleyRatio
	const flywheelRearX = ENGINE_CENTER_X - G.blockLength / 2 - G.shaftEnd / 2 - G.flywheelThickness / 2
	const starterCenterX = flywheelRearX - G.starterLength / 2
	const belt = useMemo(
		() =>
			createRibbonLoop(
				createPitchLoop(
					[
						{y: E.crankY, z: 0, radius: G.crankPulleyRadius},
						{y: G.alternatorY, z: G.alternatorZ, radius: pulleyRadius},
					],
					G.accessoryDriveX,
				),
				G.timingThickness * 1.3,
				G.ringTube * 1.5,
			),
		[pulleyRadius],
	)
	const materials = useMemo(
		() => ({
			aluminum: createCastAluminumMaterial(),
			steel: new THREE.MeshStandardMaterial(M.steel),
			dark: new THREE.MeshStandardMaterial({...M.steel, color: '#505760', roughness: 0.4}),
			black: new THREE.MeshStandardMaterial(M.rubber),
			copper: new THREE.MeshStandardMaterial({...M.caliper, color: '#79634f'}),
		}),
		[],
	)
	useEffect(
		() => () => {
			belt.dispose()
			Object.values(materials).forEach((material) => material.dispose())
		},
		[belt, materials],
	)
	useFrame(() => {
		if (!angleRef) return
		if (crankPulley.current) crankPulley.current.rotation.x = angleRef.current * DEG
		if (alternatorPulley.current)
			alternatorPulley.current.rotation.x =
				angleRef.current * DEG * VEHICLE_SPEC.electrical.alternatorPulleyRatio
	})
	return (
		<group name="engine-electrical-accessories">
			<mesh geometry={belt} material={materials.black} userData={{partId: 'alternator-belt'}} />
			<group
				ref={crankPulley}
				position={[G.accessoryDriveX, E.crankY, 0]}
				userData={{partId: 'crank-pulley'}}>
				<mesh rotation={X_AXIS} material={materials.dark}>
					<cylinderGeometry args={[G.crankPulleyRadius, G.crankPulleyRadius, G.timingThickness, 48]} />
				</mesh>
				<mesh rotation={RING_X} position={[G.timingThickness / 2, 0, 0]} material={materials.steel}>
					<torusGeometry args={[G.crankPulleyRadius * 0.8, G.ringTube, 8, 48]} />
				</mesh>
				<mesh rotation={X_AXIS} position={[G.timingThickness / 2, 0, 0]} material={materials.steel}>
					<cylinderGeometry args={[G.camShaftRadius, G.camShaftRadius, G.timingThickness, 6]} />
				</mesh>
			</group>
			<group
				position={[
					G.accessoryDriveX - G.alternatorLength / 2 - G.timingThickness,
					G.alternatorY,
					G.alternatorZ,
				]}
				userData={{partId: 'alternator'}}>
				<mesh rotation={X_AXIS} material={materials.aluminum} castShadow>
					<cylinderGeometry args={[G.alternatorRadius, G.alternatorRadius, G.alternatorLength, 40]} />
				</mesh>
				{Array.from({length: 12}, (_, index) => {
					const theta = (index / 12) * Math.PI * 2
					return (
						<mesh
							key={index}
							position={[0, Math.cos(theta) * G.alternatorRadius, Math.sin(theta) * G.alternatorRadius]}
							rotation={[theta, 0, 0]}
							material={materials.dark}>
							<boxGeometry args={[G.alternatorLength * 0.67, G.ringTube * 2, G.alternatorRadius * 0.22]} />
						</mesh>
					)
				})}
				{[-1, 1].map((side) => (
					<mesh
						key={side}
						position={[side * G.alternatorLength * 0.42, 0, 0]}
						rotation={RING_X}
						material={materials.aluminum}>
						<torusGeometry args={[G.alternatorRadius, G.ringTube * 1.4, 8, 40]} />
					</mesh>
				))}
				<mesh
					rotation={RING_X}
					position={[G.alternatorLength / 2 + G.ringTube, 0, 0]}
					material={materials.copper}>
					<torusGeometry args={[G.alternatorRadius * 0.76, G.ringTube * 1.5, 8, 40]} />
				</mesh>
			</group>
			<group
				ref={alternatorPulley}
				position={[G.accessoryDriveX, G.alternatorY, G.alternatorZ]}
				userData={{partId: 'alternator-pulley'}}>
				<mesh rotation={X_AXIS} material={materials.dark}>
					<cylinderGeometry args={[pulleyRadius, pulleyRadius, G.timingThickness, 32]} />
				</mesh>
				{Array.from({length: 8}, (_, index) => (
					<mesh
						key={index}
						position={[-G.timingThickness, 0, 0]}
						rotation={[(index / 8) * Math.PI * 2, 0, 0]}
						material={materials.steel}>
						<boxGeometry args={[G.ringTube, G.alternatorRadius * 1.6, G.ringTube * 1.5]} />
					</mesh>
				))}
			</group>
			<group position={[starterCenterX, G.starterY, G.starterZ]} userData={{partId: 'starter'}}>
				<mesh rotation={X_AXIS} material={materials.dark} castShadow>
					<cylinderGeometry args={[G.starterRadius, G.starterRadius, G.starterLength, 32]} />
				</mesh>
				<mesh rotation={X_AXIS} position={[G.starterLength * 0.4, 0, 0]} material={materials.aluminum}>
					<cylinderGeometry
						args={[G.starterRadius * 1.12, G.starterRadius * 1.12, G.starterLength * 0.2, 32]}
					/>
				</mesh>
				<mesh rotation={X_AXIS} position={[0, G.starterRadius * 1.2, 0]} material={materials.steel}>
					<cylinderGeometry
						args={[G.starterRadius * 0.45, G.starterRadius * 0.45, G.starterLength * 0.55, 24]}
					/>
				</mesh>
				<mesh
					rotation={X_AXIS}
					position={[G.starterLength / 2 + G.flywheelThickness / 2, 0, 0]}
					material={materials.steel}>
					<cylinderGeometry args={[G.starterRadius * 0.3, G.starterRadius * 0.3, G.flywheelThickness, 24]} />
				</mesh>
			</group>
		</group>
	)
}
