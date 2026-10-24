import { memo, Suspense, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as T from 'three'
import { Body } from './Body'
import { Electrical } from './Electrical'
import { TeardownAssembly } from './TeardownPart'
import { teardownParts } from './teardown-registry'
import { Wheels } from './Wheels'
import { Engine, EngineElectrical } from './Engine'
import { Brakes, Chassis, PowertrainAccessories, Steering } from './Systems'
import { SYSTEMS, systemOffset, systemProgress, type SystemId, type Point3 } from './parts'
import { STUDIO_SPEC, VEHICLE_SPEC as S, type Gear } from './vehicle-spec'
import { Studio } from './Studio'
import { Transmission } from './Transmission'
import { advanceTransmission, type TransmissionState } from './transmission-model'
import { ENGINE_PARTS, enginePartAnchor } from './engine-parts'
import type { PartAnchors } from './EnginePartsUI'
import { advanceCrankAngle } from './model'
import { isWorldPaused } from '~/lib/world-playback'
import { isRoadMechanism, type Mechanisms } from './MechanismControls'
import { advanceSteering, steeringGeometry } from './steering-model'
import { advanceBrake } from './brake-model'
import { advanceSuspension } from './suspension-model'
import { SteeringMechanism } from './SteeringMechanism'
import { BrakeMechanism } from './BrakeMechanism'
import { SuspensionMechanism } from './SuspensionMechanism'

export type ProjectedAnchor = { x: number; y: number; visible: boolean }
export type AnchorMap = Partial<Record<SystemId, ProjectedAnchor>>
export type SceneProps = {
	captureMode: boolean
	mechanisms: Mechanisms
	explode: number
	partsExplode: number
	gear: Gear
	transmissionView: 'gearbox' | 'path'
	transmissionRef: RefObject<TransmissionState>
	hoveredPart: string | null
	selectedPart: string | null
	partAnchorsRef: RefObject<PartAnchors>
	onHoverPart: (id: string | null) => void
	onSelectPart: (id: string) => void
	selected: SystemId | null
	hovered: SystemId | null
	xray: boolean
	rpm: number
	slowdown: number
	pausedRef: RefObject<boolean>
	reducedMotion: boolean
	angleRef: RefObject<number>
	anchorsRef: RefObject<AnchorMap>
	interactionRef: RefObject<boolean>
	onSelect: (id: SystemId) => void
	onHover: (id: SystemId | null) => void
	onInteract: () => void
	onReady: () => void
}
// Keep the pass tree stable while the user scrubs. Re-adding N8AO recreates
// the composer's depth buffers; doing that on every animation frame loses frames.
const StudioEffects = memo(function StudioEffects({ mobile }: { mobile: boolean }) {
	return (
		<EffectComposer multisampling={mobile ? 2 : 4}>
			<N8AO
				aoRadius={0.22}
				intensity={1.5}
				distanceFalloff={1}
				halfRes
				quality={mobile ? 'performance' : 'medium'}
			/>
			<Bloom luminanceThreshold={2.5} mipmapBlur intensity={0.3} />
			<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
			<Vignette offset={0.25} darkness={0.3} />
		</EffectComposer>
	)
})
function System({
	id,
	amount,
	selected,
	hovered,
	onSelect,
	onHover,
	children,
}: {
	id: SystemId
	amount: number
	selected: SystemId | null
	hovered: SystemId | null
	onSelect: SceneProps['onSelect']
	onHover: SceneProps['onHover']
	children: ReactNode
}) {
	const group = useRef<T.Group>(null)
	const hidden = selected !== null && selected !== id
	useEffect(() => {
		group.current?.traverse((object) => {
			if (!(object instanceof T.Mesh)) return
			const materials = Array.isArray(object.material) ? object.material : [object.material]
			for (const material of materials) {
				if (!(material instanceof T.MeshStandardMaterial)) continue
				material.userData.systemEmissive ??= material.emissive.clone()
				material.userData.systemIntensity ??= material.emissiveIntensity
				material.emissive.copy(material.userData.systemEmissive)
				if (!selected && hovered === id)
					material.emissive.add(new T.Color('#718591').multiplyScalar(0.14))
				material.emissiveIntensity =
					!selected && hovered === id
						? Math.max(0.14, material.userData.systemIntensity)
						: material.userData.systemIntensity
			}
		})
	}, [hovered, id, selected])
	const offset =
		selected === id && (isRoadMechanism(id) || id === 'body' || id === 'electrical')
			? ([0, 0, 0] as Point3)
			: systemOffset(id, amount)
	return (
		<group
			ref={group}
			visible={!hidden}
			name={`system-${id}`}
			position={offset}
			onPointerOver={(event) => {
				if (amount < 0.1 || selected) return
				event.stopPropagation()
				onHover(id)
			}}
			onPointerOut={() => onHover(null)}
			onClick={(event) => {
				if (amount < 0.1 || selected) return
				if (event.delta > 5) return
				event.stopPropagation()
				onSelect(id)
			}}
		>
			{children}
		</group>
	)
}
function CameraRig({
	captureMode,
	selected,
	transmissionView,
	mechanisms,
	partsExplode,
	explode,
	reducedMotion,
	onInteract,
}: Pick<
	SceneProps,
	| 'captureMode'
	| 'selected'
	| 'transmissionView'
	| 'mechanisms'
	| 'explode'
	| 'partsExplode'
	| 'reducedMotion'
	| 'onInteract'
>) {
	const camera = useRef<CameraControls>(null)
	const { size, camera: perspective } = useThree()
	const mobile = size.width < 700 || (captureMode && size.width < size.height)
	useEffect(() => {
		if (perspective instanceof T.PerspectiveCamera) {
			perspective.layers.enable(2)
			perspective.fov = mobile
				? selected === 'body'
					? 60
					: 56
				: selected === 'steering' && mechanisms.steeringView === 'top'
					? 45
					: 34
			perspective.updateProjectionMatrix()
		}
	}, [mobile, perspective, selected, mechanisms.steeringView])
	const expanded = explode > 0.08
	const partsExpanded = partsExplode > 0.08
	useEffect(() => {
		const cc = camera.current
		if (!cc) return
		if (captureMode) {
			void cc.setFocalOffset(0, 0, 0, false)
			if (selected === 'body')
				void cc.setLookAt(
					mobile ? 8 : 7.8,
					mobile ? 6.8 : 5.2,
					mobile ? 8.5 : 8.8,
					0,
					1.1,
					0,
					false,
				)
			else
				void cc.setLookAt(
					mobile ? 7.8 : 7.2,
					mobile ? 5.4 : 4.8,
					mobile ? 8.3 : 8,
					0,
					1.5,
					0,
					false,
				)
		} else if (selected && selected !== 'powertrain' && partsExpanded) {
			void cc.setFocalOffset(mobile ? 0 : 0.2, mobile ? 0.45 : 0, 0, !reducedMotion)
			const targetY = selected === 'body' ? 1.1 : selected === 'electrical' ? 0.8 : 0.6
			const distance =
				selected === 'body'
					? mobile
						? 10
						: 8.9
					: selected === 'chassis'
						? mobile
							? 9.4
							: 8.2
						: mobile
							? 8
							: 6.6
			void cc.setLookAt(
				distance * 0.7,
				targetY + distance * 0.55,
				distance,
				0,
				targetY,
				0,
				!reducedMotion,
			)
		} else if (selected === 'powertrain') {
			const offset = systemOffset('powertrain', 1)
			const target: Point3 = [
				S.engine.cylinder1X - S.engine.cylinderSpacing * 1.5 + offset[0],
				S.engine.crankY + (partsExpanded ? 0.43 : 0.15) + offset[1],
				0,
			]
			const shift = mobile ? 0.09 : 0.035
			const zoom = partsExpanded ? (mobile ? 1.75 : 3.6) : 1
			void cc.setLookAt(
				target[0] + (mobile ? 1.5 : 0.82) * zoom,
				target[1] + (mobile ? 0.8 : 0.5) * zoom,
				(mobile ? 2.05 : 1.12) * zoom,
				target[0] - shift,
				target[1] - (mobile ? 0.24 : 0),
				0,
				!reducedMotion,
			)
			void cc.setFocalOffset(mobile ? 0.1 : 0.18, 0, 0, !reducedMotion)
		} else if (selected === 'drivetrain' && transmissionView === 'gearbox') {
			void cc.setFocalOffset(mobile ? 0 : 0.15, 0, 0, !reducedMotion)
			void cc.setLookAt(
				mobile ? 1.05 : 0.95,
				mobile ? 1.18 : 1.02,
				mobile ? 1.75 : 1.25,
				0.54,
				0.61,
				0,
				!reducedMotion,
			)
		} else if (selected === 'steering') {
			void cc.setFocalOffset(
				mobile ? 0 : 0.6,
				mobile ? (mechanisms.steeringView === 'perspective' ? 1.25 : 1) : 0.8,
				0,
				!reducedMotion,
			)
			if (mechanisms.steeringView === 'top') {
				const geometry = steeringGeometry(mechanisms.wheelAngle)
				const centerZ = Number.isFinite(geometry.radius)
					? -Math.sign(mechanisms.wheelAngle) * Math.min(geometry.radius, 6) * 0.45
					: 0
				void cc.setLookAt(
					-0.4,
					mobile ? 13 : 12.6,
					centerZ + 0.001,
					-0.4,
					0.1,
					centerZ,
					!reducedMotion,
				)
			} else if (mechanisms.steeringView === 'differential') {
				void cc.setFocalOffset(mobile ? 0 : 0.07, mobile ? 0.07 : 0, 0, !reducedMotion)
				void cc.setLookAt(
					-0.94,
					0.72,
					0.55,
					S.dimensions.rearAxleX,
					S.wheels.radius,
					0,
					!reducedMotion,
				)
			} else
				void cc.setLookAt(
					mobile ? 6.6 : 4.2,
					mobile ? 5 : 3.3,
					mobile ? 7.2 : 4.4,
					0,
					0.4,
					0,
					!reducedMotion,
				)
		} else if (selected === 'brakes') {
			void cc.setFocalOffset(
				mobile ? 0 : mechanisms.brakeView === 'caliper' ? 0.07 : 0.16,
				mobile ? (mechanisms.brakeView === 'caliper' ? 0.1 : 0.25) : 0,
				0,
				!reducedMotion,
			)
			if (mechanisms.brakeView === 'caliper')
				void cc.setLookAt(
					0.7,
					0.65,
					0.2,
					S.dimensions.frontAxleX - 0.13,
					S.wheels.radius,
					S.wheels.frontTrack / 2,
					!reducedMotion,
				)
			else
				void cc.setLookAt(
					mobile ? 4.4 : 4.2,
					mobile ? 3.4 : 3.6,
					mobile ? 4.6 : 4.4,
					0,
					0.35,
					0,
					!reducedMotion,
				)
		} else if (selected === 'chassis') {
			void cc.setFocalOffset(mobile ? 0 : 0.5, mobile ? 0.6 : 0, 0, !reducedMotion)
			void cc.setLookAt(0.15, mobile ? 1.9 : 1.35, mobile ? 9.95 : 7.8, 0, 0.6, 0, !reducedMotion)
		} else if (selected) {
			void cc.setFocalOffset(0, 0, 0, !reducedMotion)
			const system = SYSTEMS.find((s) => s.id === selected)!
			const offset: Point3 =
				selected === 'body' || selected === 'electrical' ? [0, 0, 0] : systemOffset(selected, 1)
			const target = system.anchor.map((n, i) => n + offset[i]) as Point3
			const wide = ['body', 'electrical', 'chassis', 'brakes', 'drivetrain'].includes(selected)
			if (wide) target[0] = selected === 'drivetrain' ? -0.24 : offset[0]
			const distance =
				selected === 'drivetrain'
					? mobile
						? 5
						: 3.3
					: wide
						? mobile
							? 7
							: 5.5
						: mobile
							? 5.8
							: 2.8
			void cc.setLookAt(
				target[0] + distance,
				target[1] + distance * 0.45,
				target[2] + distance,
				target[0],
				target[1],
				0,
				!reducedMotion,
			)
		} else if (expanded) {
			void cc.setFocalOffset(0, 0, 0, !reducedMotion)
			void cc.setLookAt(
				mobile ? 7.8 : 7.4,
				mobile ? 5.4 : 4.9,
				mobile ? 8.3 : 8.3,
				0,
				mobile ? 1.55 : 1.55,
				0,
				!reducedMotion,
			)
		} else if (new URLSearchParams(window.location.search).get('view') === 'side') {
			void cc.setFocalOffset(0, 0, 0, false)
			void cc.setLookAt(0, 1.45, 8.7, 0, 0.68, 0, false)
		} else if (new URLSearchParams(window.location.search).get('view') === 'rear') {
			void cc.setFocalOffset(0, 0, 0, false)
			void cc.setLookAt(-5.6, 2.7, 6.4, 0, 0.68, 0, false)
		} else {
			void cc.setFocalOffset(0, 0, 0, !reducedMotion)
			void cc.setLookAt(
				mobile ? 7 : 5.5,
				mobile ? 3.4 : 2.45,
				mobile ? 7.8 : 6.1,
				0,
				mobile ? 0.72 : 0.68,
				0,
				!reducedMotion,
			)
		}
	}, [
		captureMode,
		selected,
		expanded,
		partsExpanded,
		transmissionView,
		mobile,
		reducedMotion,
		mechanisms.steeringView,
		mechanisms.brakeView,
		mechanisms.wheelAngle,
	])
	return (
		<CameraControls
			ref={camera}
			makeDefault
			mouseButtons={{
				left: CameraControlsImpl.ACTION.ROTATE,
				middle: CameraControlsImpl.ACTION.DOLLY,
				right: CameraControlsImpl.ACTION.NONE,
				wheel: CameraControlsImpl.ACTION.DOLLY,
			}}
			touches={{
				one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
				two: CameraControlsImpl.ACTION.TOUCH_DOLLY_ROTATE,
				three: CameraControlsImpl.ACTION.NONE,
			}}
			minDistance={
				isRoadMechanism(selected)
					? 0.35
					: selected === 'drivetrain' && transmissionView === 'gearbox'
						? 0.55
						: selected === 'powertrain'
							? 0.65
							: !selected || selected === 'body'
								? 3.2
								: 1
			}
			maxDistance={16}
			maxPolarAngle={Math.PI * 0.48}
			smoothTime={0.55}
			draggingSmoothTime={0.12}
			onStart={() => {
				onInteract()
			}}
		/>
	)
}
function SceneContents(props: SceneProps) {
	const { size, camera } = useThree()
	const mobile = size.width < 700
	const projection = useRef(new T.Vector3())
	const turntable = useRef<T.Group>(null)
	const rearSpinRef = useRef(0)
	useFrame((_, delta) => {
		const m = props.mechanisms
		const paused = props.pausedRef.current || isWorldPaused()
		const dt = Math.min(delta, 0.075)
		m.steeringRef.current = advanceSteering(m.steeringRef.current, {
			dt,
			slowdown: props.slowdown,
			paused: paused || props.selected !== 'steering',
			wheelAngle: m.wheelAngle,
			speedKmh: m.steeringSpeed,
		})
		m.brakeRef.current = advanceBrake(m.brakeRef.current, {
			dt,
			slowdown: props.slowdown,
			paused: paused || props.selected !== 'brakes',
			pedalForceN: m.pedalForce,
			speedKmh: m.brakeSpeed,
			restartToken: m.brakeRestart,
		})
		advanceSuspension(m.suspensionRef.current, {
			dt,
			slowdown: props.slowdown,
			paused: paused || props.selected !== 'chassis',
			speedKmh: m.suspensionSpeed,
			bumpHeight: m.bumpHeight,
			damping: m.damping,
			restartToken: m.suspensionRestart,
		})
		props.transmissionRef.current = advanceTransmission(props.transmissionRef.current, {
			dt: Math.min(delta, 0.075),
			rpm: props.rpm,
			slowdown: props.slowdown,
			requestedGear: props.gear,
			paused: props.pausedRef.current || isWorldPaused(),
		})
		rearSpinRef.current = props.transmissionRef.current.wheelAngle
		if (turntable.current) {
			if (
				!props.interactionRef.current &&
				!props.reducedMotion &&
				!props.selected &&
				props.explode === 0 &&
				!isWorldPaused()
			)
				turntable.current.rotation.y +=
					(Math.min(delta, 0.075) * Math.PI * 2) / STUDIO_SPEC.turntablePeriod
			if (props.explode > 0 || props.selected)
				turntable.current.rotation.y = T.MathUtils.damp(turntable.current.rotation.y, 0, 8, delta)
			turntable.current.updateMatrixWorld()
		}
		if (!props.pausedRef.current && !isWorldPaused())
			props.angleRef.current = advanceCrankAngle(
				props.angleRef.current,
				Math.min(delta, 0.075),
				props.rpm,
				props.slowdown,
			)
		if (props.selected === 'powertrain')
			for (const part of ENGINE_PARTS) {
				const p = enginePartAnchor(part.id, props.partsExplode),
					offset = systemOffset('powertrain', 1)
				projection.current.set(p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]).project(camera)
				props.partAnchorsRef.current[part.id] = {
					x: ((projection.current.x + 1) / 2) * size.width,
					y: ((1 - projection.current.y) / 2) * size.height,
					visible: projection.current.z < 1,
				}
			}
		for (const system of SYSTEMS) {
			const offset = systemOffset(system.id, props.explode)
			projection.current
				.set(...system.anchor)
				.add(new T.Vector3(...offset))
				.applyMatrix4(turntable.current?.matrixWorld ?? new T.Matrix4())
				.project(camera)
			props.anchorsRef.current[system.id] = {
				x: ((projection.current.x + 1) / 2) * size.width,
				y: ((1 - projection.current.y) / 2) * size.height,
				visible: projection.current.z < 1,
			}
		}
	}, -2)
	const common = {
		amount: props.explode,
		selected: props.selected,
		hovered: props.hovered,
		onSelect: props.onSelect,
		onHover: props.onHover,
	}
	return (
		<>
			<color attach="background" args={[S.materials.background]} />
			<Studio mobile={mobile} />
			<TeardownAssembly
				system={props.selected}
				amount={props.partsExplode}
				parts={teardownParts(props.selected)}
				hovered={props.hoveredPart}
				selected={props.selectedPart}
				anchorsRef={props.partAnchorsRef}
				onHover={props.onHoverPart}
				onSelect={props.onSelectPart}
			>
				<group ref={turntable} name="vehicle-turntable">
					<System id="body" {...common}>
						<Body />
					</System>
					<System id="powertrain" {...common}>
						<Engine
							angleRef={props.angleRef}
							rpm={props.rpm}
							partsExplode={props.selected === 'powertrain' ? props.partsExplode : 0}
							hoveredPart={props.selected === 'powertrain' ? props.hoveredPart : null}
							selectedPart={props.selected === 'powertrain' ? props.selectedPart : null}
							onHoverPart={props.selected === 'powertrain' ? props.onHoverPart : undefined}
							onSelectPart={props.selected === 'powertrain' ? props.onSelectPart : undefined}
							xray={props.xray && props.selected === 'powertrain'}
						/>
						<group name="engine-accessories" visible={props.selected !== 'powertrain'}>
							<PowertrainAccessories />
						</group>
					</System>
					<System id="drivetrain" {...common}>
						<Transmission stateRef={props.transmissionRef} xray={props.selected === 'drivetrain'} />
						{props.selected === 'drivetrain' && <Wheels axle="rear" rearSpinRef={rearSpinRef} />}
					</System>
					<System id="chassis" {...common}>
						{props.selected === 'chassis' ? (
							<SuspensionMechanism stateRef={props.mechanisms.suspensionRef} />
						) : (
							<>
								<Chassis />
								<Wheels
									explode={systemProgress('chassis', props.explode)}
									rearSpinRef={rearSpinRef}
								/>
							</>
						)}
					</System>
					<System id="steering" {...common}>
						{props.selected === 'steering' ? (
							<SteeringMechanism
								stateRef={props.mechanisms.steeringRef}
								showConstruction={
									props.mechanisms.steeringView === 'top' && props.partsExplode < 0.05
								}
								closeup={
									props.mechanisms.steeringView === 'differential' && props.partsExplode < 0.05
								}
							/>
						) : (
							<Steering />
						)}
					</System>
					<System id="brakes" {...common}>
						{props.selected === 'brakes' ? (
							<BrakeMechanism
								stateRef={props.mechanisms.brakeRef}
								closeup={props.mechanisms.brakeView === 'caliper' && props.partsExplode < 0.05}
							/>
						) : (
							<Brakes explode={systemProgress('brakes', props.explode)} />
						)}
					</System>
					<System id="electrical" {...common}>
						<Electrical angleRef={props.angleRef} detailed={props.selected === 'electrical'} />
						{props.selected !== 'electrical' && <EngineElectrical angleRef={props.angleRef} />}
					</System>
				</group>
			</TeardownAssembly>
			<CameraRig
				captureMode={props.captureMode}
				selected={props.selected}
				transmissionView={props.transmissionView}
				mechanisms={props.mechanisms}
				explode={props.explode}
				partsExplode={props.partsExplode}
				reducedMotion={props.reducedMotion}
				onInteract={props.onInteract}
			/>
			<StudioEffects mobile={mobile} />
		</>
	)
}
export function CarScene(props: SceneProps) {
	return (
		<Canvas
			className="ct-canvas"
			shadows={{ type: T.PCFShadowMap }}
			dpr={[1, typeof window !== 'undefined' && window.innerWidth < 700 ? 1.15 : 1.6]}
			camera={{ position: [6.4, 2.8, 6.8], fov: 34, near: 0.015, far: 100 }}
			gl={{
				antialias: true,
				powerPreference: 'high-performance',
				toneMapping: T.ACESFilmicToneMapping,
				toneMappingExposure: 1.05,
			}}
			onCreated={({ gl }) => {
				gl.setClearColor(S.materials.background, 0)
				props.onReady()
			}}
		>
			<Suspense fallback={null}>
				<SceneContents {...props} />
			</Suspense>
		</Canvas>
	)
}
