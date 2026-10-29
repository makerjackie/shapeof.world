import {lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type RefObject} from 'react'
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
import {Studio, STAGE} from './Studio'
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
				// Near side-on: the gear row reads left to right and the propshaft leaves the frame
				// horizontally instead of cutting diagonally across the panels.
				eye = [1.24, 0.78, 1.12]
				target = [0.86, 0.34, 0]
			} else {
				eye = [2.75, 2.15, 3.05]
				target = [-0.1, 0.3, 0]
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
				eye = [2.85, 2.25, 3.05]
				target = [0, 0.3, 0]
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
		// The canvas fills the viewport under glass panels; these views were framed for a smaller canvas.
		// Pull back so the subject fits the free area between panels (portrait phones lose most width).
		const factor = p.selected === 'body' ? (mobile ? 1.9 : 1.05) : mobile ? (p.selected ? 2.4 : 3.1) : 1.6
		const spread = p.selected === 'powertrain' && p.partsExplode > 0.1 ? 1.3 : 1
		eye = eye.map((v, i) => target[i] + (v - target[i]) * factor * spread) as typeof eye
		c.setFocalOffset(0, 0, 0, !p.reducedMotion)
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
			maxDistance={30}
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
/** The canvas fills the viewport under glass overlays. Shift the projection centre into the
 * free area between them, in pixels, so the subject is not framed behind a panel. On phones the
 * selected system sits between the top card and the bottom drawer: the free band is measured
 * from the DOM, the subject is centred in it and scaled to its height, and both ease back when
 * the drawer is collapsed. A view offset larger than the full frame zooms the projection out. */
function StageFraming({selected}: {selected: boolean}) {
	const camera = useThree((state) => state.camera) as T.PerspectiveCamera
	const canvas = useThree((state) => state.gl.domElement)
	const width = useThree((state) => state.size.width),
		height = useThree((state) => state.size.height)
	const band = useRef<{top: number; bottom: number} | null>(null),
		lastMeasure = useRef(0),
		current = useRef<{cx: number; cy: number; scale: number} | null>(null)
	const mobile = width < 700
	const measure = () => {
		const root = canvas.closest('.ct-world')
		if (!root) return null
		const frame = canvas.getBoundingClientRect()
		const hud = root.querySelector('.ct-hud')?.getBoundingClientRect()
		let top = hud && hud.height > 0 ? hud.bottom - frame.top : 0,
			bottom = frame.height
		root.querySelectorAll('.ct-instruments, .ct-system-detail, .ct-steel-legend, .ct-bottom').forEach((el) => {
			const r = el.getBoundingClientRect()
			if (r.height > 0 && r.top - frame.top > top + 40) bottom = Math.min(bottom, r.top - frame.top)
		})
		return {top, bottom}
	}
	const goal = () => {
		if (!mobile)
			return {
				cx: width / 2 - (selected ? Math.min(170, width * 0.1) : Math.min(60, width * 0.04)),
				cy: height / 2 - (selected ? -10 : -20),
				scale: 1,
			}
		const b = band.current
		if (!selected || !b) return {cx: width / 2, cy: height / 2 - (selected ? 50 : -40), scale: 1}
		const free = b.bottom - b.top
		// The phone views were framed (ViewCamera) to fill about 40% of the screen height.
		return {cx: width / 2, cy: (b.top + b.bottom) / 2, scale: T.MathUtils.clamp(free / (height * 0.4), 0.5, 1.15)}
	}
	const apply = (v: {cx: number; cy: number; scale: number}) => {
		const fw = width * v.scale,
			fh = height * v.scale
		camera.setViewOffset(fw, fh, fw / 2 - v.cx, fh / 2 - v.cy, width, height)
		camera.updateProjectionMatrix()
	}
	useLayoutEffect(() => {
		band.current = mobile && selected ? measure() : null
		lastMeasure.current = performance.now()
		current.current = goal()
		apply(current.current)
		return () => {
			current.current = null
			camera.clearViewOffset()
			camera.updateProjectionMatrix()
		}
	}, [camera, width, height, selected])
	useFrame((_, delta) => {
		const now = performance.now()
		if (mobile && selected && now - lastMeasure.current > 200) {
			lastMeasure.current = now
			band.current = measure()
		}
		const c = current.current
		if (!c) return
		const g = goal()
		if (Math.abs(g.cx - c.cx) < 0.5 && Math.abs(g.cy - c.cy) < 0.5 && Math.abs(g.scale - c.scale) < 0.002) {
			if (g.cx === c.cx && g.cy === c.cy && g.scale === c.scale) return
			Object.assign(c, g)
		} else {
			const dt = Math.min(delta, 0.06)
			c.cx = T.MathUtils.damp(c.cx, g.cx, 8, dt)
			c.cy = T.MathUtils.damp(c.cy, g.cy, 8, dt)
			c.scale = T.MathUtils.damp(c.scale, g.scale, 8, dt)
		}
		apply(c)
	})
	return null
}
function Contents(p: SceneProps) {
	const {gl, scene, size} = useThree()
	const [car, setCar] = useState<GLTF | null>(null),
		[engine, setEngine] = useState<GLTF | null>(null)
	const [detailRequested, setDetailRequested] = useState(false)
	const turntable = useRef<T.Group>(null),
		rearSpin = useRef(0),
		studioPose = useRef(0),
		shadowPose = useRef(0)
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
		// Floor reflection and contact shadow caches compare these poses between frames.
		studioPose.current =
			p.selected === 'powertrain' || (p.selected === null && p.explode > 0)
				? p.angleRef.current
				: (turntable.current?.rotation.y ?? 0)
		shadowPose.current = p.selected === null ? (turntable.current?.rotation.y ?? 0) : studioPose.current

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
			<color attach="background" args={[STAGE.background]} />
			<hemisphereLight args={['#d6e0ea', '#07090b', 0.55]} />
			<directionalLight
				position={[2, 7, 4]}
				intensity={2.4}
				color="#fff3e2"
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-6}
				shadow-camera-right={6}
				shadow-camera-top={6}
				shadow-camera-bottom={-6}
				shadow-bias={-0.00008}
				shadow-normalBias={0.006}
			/>
			{/* Rim and kicker lights separate dark parts from the dark stage. */}
			<directionalLight position={[-4.5, 3.2, -4]} intensity={3.2} color="#cfdcef" />
			<directionalLight position={[4.5, 1.6, -3.5]} intensity={1.4} color="#dfe8f2" />
			<Studio
				mobile={size.width < 700}
				pose={studioPose}
				shadowPose={shadowPose}
				revision={`${p.selected}/${p.assembly?.id}/${p.explode}/${p.partsExplode}/${p.xray}/${p.engineView}/${p.transmissionView}/${p.gear}/${p.mechanisms.wheelAngle}/${p.mechanisms.pedalForce}/${p.mechanisms.steeringView}/${p.mechanisms.brakeView}/${!!car}/${!!engine}`}
				shadowMoving={() =>
					p.selected !== null && p.selected !== 'body' && p.selected !== 'electrical' && !p.pausedRef.current && !isWorldPaused()
				}
				moving={() =>
					!p.pausedRef.current &&
					!isWorldPaused() &&
					((p.explode > 0 && p.selected === null) ||
						(p.selected !== null && p.selected !== 'body' && p.selected !== 'electrical') ||
						((p.selected !== null || p.explode > 0) && Math.abs(turntable.current?.rotation.y ?? 0) > 0.0001) ||
						(!p.interactionRef.current && !p.reducedMotion && p.explode === 0))
				}
			/>
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
			<StageFraming selected={p.selected !== null} />
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
			onCreated={({scene, camera}) => {
				// Studio floor, reflection disc and contact shadow occupy layer 2.
				camera.layers.enable(2)
				if (import.meta.env.DEV) (window as unknown as {__carScene: T.Scene}).__carScene = scene
			}}
		>
			<Contents {...p} />
		</Canvas>
	)
}
