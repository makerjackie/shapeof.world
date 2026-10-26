import {lazy, Suspense, useEffect, useRef, useState, type RefObject} from 'react'
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {CameraControls, CameraControlsImpl} from '@react-three/drei'
import * as T from 'three'
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js'
import type {Assembly} from './subassemblies'
import {type Mechanisms} from './MechanismControls'
import {SYSTEMS, systemOffset, type SystemId} from './parts'
import {VEHICLE_SPEC as S, type Gear} from './vehicle-spec'
import type {PartAnchors} from './EnginePartsUI'
import {advanceTransmission, type TransmissionState} from './transmission-model'
import {advanceCrankAngle} from './model'
import {advanceSteering} from './steering-model'
import {advanceBrake} from './brake-model'
import {advanceSuspension} from './suspension-model'
import {isWorldPaused} from '~/lib/world-playback'
import {loadCarAsset, loadStudio} from './asset-loader'
import {type AssetProgress, ASSET_INSTALL as I, CAR_ASSET_BYTES} from './asset-config'
import {CarAssetContext, ConceptBody, ConceptWheel, layerProgress} from './ConceptCar'
const CadEngine = lazy(() => import('./CadEngine').then((m) => ({default: m.CadEngine})))
const MechanismsScene = lazy(() => import('./MechanismScene'))
export type ProjectedAnchor = {x: number; y: number; visible: boolean}
export type AnchorMap = Partial<Record<SystemId, ProjectedAnchor>>
export type SceneProps = {
	captureMode: boolean
	engineView: 'bay' | 'section' | 'assembly'
	onLoad: (state: AssetProgress) => void
	assembly?: Assembly
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

function ViewCamera(p: SceneProps) {
	const controls = useRef<CameraControls>(null)
	const {size} = useThree(),
		mobile = size.width < 700
	useEffect(() => {
		const c = controls.current
		if (!c) return
		let eye: [number, number, number] = [3.3, 1.85, 3.8],
			target: [number, number, number] = [0, 0.55, 0]
		if (p.explode > 0.15 && !p.selected) {
			eye = [4.2, 3.7, 4.8]
			target = [0, 1.15, 0]
		}
		if (p.selected === 'powertrain') {
			if (p.engineView === 'bay') {
				eye = [1.62, 1.58, 1.08]
				target = [1.58, 0.5, 0]
			} else if (p.engineView === 'section') {
				eye = [1.98, 0.89, 0.69]
				target = [I.cylinder1X, 0.53, 0]
			} else {
				eye = [2.32, 1.15, 1.13]
				target = [I.engineCenterX, 0.57, 0]
			}
		} else if (p.selected === 'drivetrain') {
			if (p.transmissionView === 'gearbox') {
				eye = [1.7, 1.0, 1.1]
				target = [0.88, 0.34, 0]
			} else {
				eye = [4.8, 3.4, 4.8]
				target = [0, 0.32, 0]
			}
		} else if (p.selected === 'steering') {
			if (p.mechanisms.steeringView === 'top') {
				eye = [0, 10.2, 0.001]
				target = [0, 0, 0]
			} else if (p.mechanisms.steeringView === 'differential') {
				eye = [-0.9, 0.86, 0.55]
				target = [S.dimensions.rearAxleX, 0.38, 0]
			} else {
				eye = [4.5, 3.4, 4.5]
				target = [0, 0.38, 0]
			}
		} else if (p.selected === 'brakes') {
			if (p.mechanisms.brakeView === 'caliper') {
				eye = [S.dimensions.frontAxleX - 0.6, 0.72, S.wheels.frontTrack / 2 + 0.45]
				target = [S.dimensions.frontAxleX - 0.08, 0.4, S.wheels.frontTrack / 2]
			} else {
				eye = [4.5, 3.3, 4.7]
				target = [0, 0.32, 0]
			}
		} else if (p.selected === 'chassis') {
			eye = [S.dimensions.frontAxleX + 0.9, 1.04, 1.9]
			target = [S.dimensions.frontAxleX, 0.58, 0.82]
		} else if (p.selected === 'electrical') {
			eye = [4, 3, 4.3]
			target = [0, 0.55, 0]
		} else if (p.selected === 'body') {
			eye = [6.5, 4, 7]
			target = [0, 1.3, 0]
		}
		if (mobile) {
			const factor = p.selected ? 1.02 : 1.85
			eye = eye.map((v, i) => target[i] + (v - target[i]) * factor) as typeof eye
		}
		c.setFocalOffset(mobile ? 0 : p.selected ? 0.12 : 0.3, 0, 0, !p.reducedMotion)
		void c.setLookAt(...eye, ...target, !p.reducedMotion)
	}, [
		p.selected,
		p.engineView,
		p.transmissionView,
		p.mechanisms.steeringView,
		p.mechanisms.brakeView,
		p.explode > 0.15,
		p.partsExplode > 0.1,
		mobile,
	])
	return (
		<CameraControls
			ref={controls}
			makeDefault
			minDistance={0.25}
			maxDistance={18}
			maxPolarAngle={Math.PI * 0.49}
			smoothTime={0.4}
			onStart={p.onInteract}
			mouseButtons={{
				left: CameraControlsImpl.ACTION.ROTATE,
				middle: CameraControlsImpl.ACTION.DOLLY,
				right: CameraControlsImpl.ACTION.TRUCK,
				wheel: CameraControlsImpl.ACTION.DOLLY,
			}}
		/>
	)
}
function Contents(p: SceneProps) {
	const {gl, scene, size} = useThree()
	const [car, setCar] = useState<GLTF | null>(null),
		[engine, setEngine] = useState<GLTF | null>(null)
	const [detailRequested, setDetailRequested] = useState(false)
	const turntable = useRef<T.Group>(null),
		rearSpin = useRef(0)
	const needDetails = p.explode > 0.01 || p.selected !== null
	const onLoad = useRef(p.onLoad)
	onLoad.current = p.onLoad
	useEffect(() => {
		let live = true,
			environment: T.DataTexture | null = null
		const progress = (state: AssetProgress) => {
			if (live) onLoad.current(state)
		}
		Promise.all([loadCarAsset('car.glb', gl, 'body', progress), loadStudio(progress)])
			.then(([asset, texture]) => {
				environment = texture
				if (!live) {
					texture.dispose()
					return
				}
				scene.environment = texture
				scene.environmentIntensity = 0.9
				setCar(asset)
				p.onReady()
				progress({phase: 'body', loaded: 1, total: 1, ready: true})
			})
			.catch((error) => {
				console.error(error)
				progress({phase: 'body', loaded: 0, total: 0, ready: false, error: String(error)})
			})
		return () => {
			live = false
			if (scene.environment === environment) scene.environment = null
			environment?.dispose()
		}
	}, [gl, scene])
	useEffect(() => {
		if (!needDetails || detailRequested) return
		setDetailRequested(true)
		const progress = (s: AssetProgress) => onLoad.current(s)
		progress({phase: 'mechanisms', loaded: 0, total: CAR_ASSET_BYTES['engine.glb'], ready: false})
		loadCarAsset('engine.glb', gl, 'mechanisms', progress)
			.then((asset) => {
				setEngine(asset)
				progress({phase: 'mechanisms', loaded: 1, total: 1, ready: true})
			})
			.catch((error) => {
				progress({phase: 'mechanisms', loaded: 0, total: 0, ready: false, error: String(error)})
			})
	}, [needDetails, detailRequested, gl])
	useFrame(({camera}, delta) => {
		const dt = Math.min(delta, 0.06),
			m = p.mechanisms,
			paused = p.pausedRef.current || isWorldPaused()
		if (!paused) p.angleRef.current = advanceCrankAngle(p.angleRef.current, dt, p.rpm, p.slowdown)
		p.transmissionRef.current = advanceTransmission(p.transmissionRef.current, {
			dt,
			rpm: p.rpm,
			slowdown: p.slowdown,
			requestedGear: p.gear,
			paused,
		})
		m.steeringRef.current = advanceSteering(m.steeringRef.current, {
			dt,
			slowdown: p.slowdown,
			paused: paused || p.selected !== 'steering',
			wheelAngle: m.wheelAngle,
			speedKmh: m.steeringSpeed,
		})
		m.brakeRef.current = advanceBrake(m.brakeRef.current, {
			dt,
			slowdown: p.slowdown,
			paused: paused || p.selected !== 'brakes',
			pedalForceN: m.pedalForce,
			speedKmh: m.brakeSpeed,
			restartToken: m.brakeRestart,
		})
		advanceSuspension(m.suspensionRef.current, {
			dt,
			slowdown: p.slowdown,
			paused: paused || p.selected !== 'chassis',
			speedKmh: m.suspensionSpeed,
			bumpHeight: m.bumpHeight,
			damping: m.damping,
			restartToken: m.suspensionRestart,
		})
		rearSpin.current = p.transmissionRef.current.wheelAngle
		if (turntable.current) {
			const moving = !p.selected && p.explode === 0 && !p.interactionRef.current && !paused && !p.reducedMotion
			turntable.current.rotation.y = moving
				? turntable.current.rotation.y + dt * 0.035
				: T.MathUtils.damp(turntable.current.rotation.y, 0, 7, dt)
		}

		const viewport = gl.domElement.getBoundingClientRect()
		const host = gl.domElement.closest('.ct-world')?.getBoundingClientRect()
		const installation: Record<SystemId, [number, number, number]> = {
			body: [-0.5, 1.05 + layerProgress(p.explode, 0) * 1.85, 0.7],
			electrical: [-0.8, 0.58 + layerProgress(p.explode, 0.35) * 0.35, 0.59],
			powertrain: [1.56 + layerProgress(p.explode, 0.4) * 0.35, 0.6 + layerProgress(p.explode, 0.4) * 0.55, 0],
			drivetrain: [0.8, 0.35 + systemOffset('drivetrain', p.explode)[1], 0],
			steering: [1.2, 0.3, 0],
			chassis: [1.4, 0.55, 0.9],
			brakes: [S.dimensions.frontAxleX, S.wheels.radius, S.wheels.frontTrack / 2 + S.explosion.brakeOutward * p.explode],
		}
		for (const sys of SYSTEMS) {
			const v = new T.Vector3(...installation[sys.id]).project(camera)
			p.anchorsRef.current[sys.id] = {
				x: viewport.left - (host?.left ?? 0) + ((v.x + 1) * size.width) / 2,
				y: viewport.top - (host?.top ?? 0) + ((1 - v.y) * size.height) / 2,
				visible: v.z < 1,
			}
		}

		if (import.meta.env.DEV) {
			scene.userData.carInspection = {
				angle: p.angleRef.current,
				gear: p.transmissionRef.current.gear,
				wheelRpm: p.transmissionRef.current.wheelRpm,
				carLoaded: !!car,
				engineLoaded: !!engine,
				engine: scene
					.getObjectByName('cad-engine')
					?.children[0]?.children.filter((n) => n.userData.kind === 'piston')
					.map((n) => ({name: n.name, y: n.position.y, kind: n.userData.kind})),
				camera: camera.position.toArray(),
			}
		}
	}, -2)
	// Legacy teardown labels run at +0.4. A positive-priority callback takes over
	// R3F's render loop; keep one explicit final render after those projections.
	useFrame(({gl, scene, camera}) => gl.render(scene, camera), 1)
	const bay = p.selected === 'powertrain' && p.engineView === 'bay'
	const showBody = !p.selected || bay || p.selected === 'body'
	const showWheels = !p.selected || p.selected === 'body' || bay
	return (
		<CarAssetContext.Provider value={car}>
			<color attach="background" args={['#e5e8e8']} />
			<hemisphereLight args={['#f5f8fa', '#a0aaad', 1.7]} />
			<directionalLight
				position={[2, 7, 4]}
				intensity={2.2}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-6}
				shadow-camera-right={6}
				shadow-camera-top={6}
				shadow-camera-bottom={-6}
				shadow-bias={-0.00008}
				shadow-normalBias={0.006}
			/>
			<directionalLight position={[-4, 3, -4]} intensity={1.4} color="#e1ecf3" />
			<mesh rotation-x={-Math.PI / 2} position-y={-0.012} receiveShadow>
				<planeGeometry args={[200, 200]} />
				<meshStandardMaterial color="#e5e8e8" roughness={0.86} metalness={0.12} />
			</mesh>
			<group ref={turntable}>
				{car && showBody && <ConceptBody asset={car} amount={bay ? 0 : p.selected === 'body' ? p.partsExplode : p.explode} hood={bay} />}
				{car &&
					showWheels &&
					(['front', 'rear'] as const).flatMap((axle) =>
						([-1, 1] as const).map((side) => (
							<ConceptWheel
								key={axle + side}
								asset={car}
								axle={axle}
								side={side}
								explode={bay ? 0 : layerProgress(p.explode, 0.65)}
								rearSpinRef={p.explode > 0 && !bay ? rearSpin : undefined}
							/>
						)),
					)}
				{engine && (!p.selected || p.selected === 'powertrain') && (
					<group
						name="system-powertrain"
						position={p.selected ? [0, 0, 0] : [layerProgress(p.explode, 0.4) * 0.35, layerProgress(p.explode, 0.4) * 0.55, 0]}
					>
						<Suspense fallback={null}>
							<CadEngine
								asset={engine}
								angleRef={p.angleRef}
								rpm={p.rpm}
								mode={p.selected ? p.engineView : 'assembly'}
								explode={p.selected === 'powertrain' ? p.partsExplode : 0}
							/>
						</Suspense>
					</group>
				)}
				{detailRequested && (
					<Suspense fallback={null}>
						<MechanismsScene {...p} />
					</Suspense>
				)}
			</group>
			<ViewCamera {...p} />
		</CarAssetContext.Provider>
	)
}
export function CarScene(p: SceneProps) {
	return (
		<Canvas
			className="ct-canvas"
			shadows={{type: T.PCFShadowMap}}
			dpr={[1, 1.3]}
			camera={{position: [3.3, 1.85, 3.8], fov: 36, near: 0.01, far: 200}}
			gl={{
				antialias: true,
				powerPreference: 'high-performance',
				toneMapping: T.ACESFilmicToneMapping,
				toneMappingExposure: 1.0,
				localClippingEnabled: true,
			}}
			onCreated={({scene}) => {
				if (import.meta.env.DEV) (window as unknown as {__carScene: T.Scene}).__carScene = scene
			}}
		>
			<Contents {...p} />
		</Canvas>
	)
}
