import {memo, Suspense, useEffect, useRef, type ReactNode, type RefObject} from 'react'
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {
	CameraControls,
	ContactShadows,
	Environment,
	Lightformer,
	MeshReflectorMaterial,
} from '@react-three/drei'
import {Bloom, EffectComposer, N8AO, ToneMapping, Vignette} from '@react-three/postprocessing'
import {ToneMappingMode} from 'postprocessing'
import * as T from 'three'
import {Body} from './Body'
import {Wheels} from './Wheels'
import {Engine, EngineElectrical} from './Engine'
import {Brakes, Chassis, Drivetrain, Electrical, PowertrainAccessories, Steering} from './Systems'
import {SYSTEMS, systemOffset, systemProgress, type SystemId, type Point3} from './parts'
import {VEHICLE_SPEC as S} from './vehicle-spec'
import {advanceCrankAngle} from './model'
import {isWorldPaused} from '~/lib/world-playback'

export type ProjectedAnchor = {x: number; y: number; visible: boolean}
export type AnchorMap = Partial<Record<SystemId, ProjectedAnchor>>
export type SceneProps = {
	explode: number
	selected: SystemId | null
	hovered: SystemId | null
	xray: boolean
	rpm: number
	slowdown: number
	pausedRef: RefObject<boolean>
	reducedMotion: boolean
	angleRef: RefObject<number>
	anchorsRef: RefObject<AnchorMap>
	onSelect: (id: SystemId) => void
	onHover: (id: SystemId | null) => void
	onInteract: () => void
	onReady: () => void
}
// Keep the pass tree stable while the user scrubs. Re-adding N8AO recreates
// the composer's depth buffers; doing that on every animation frame loses frames.
const StudioEffects = memo(function StudioEffects({mobile}: {mobile: boolean}) {
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
	const ghost = selected !== null && selected !== id
	useEffect(() => {
		group.current?.traverse((object) => {
			if (!(object instanceof T.Mesh)) return
			let ancestor: T.Object3D | null = object
			let accessory = false
			while (ancestor) {
				if (ancestor.name === 'engine-accessories') accessory = selected === 'powertrain'
				ancestor = ancestor.parent
			}
			const faded = ghost || accessory
			object.userData.originalCastShadow ??= object.castShadow
			object.castShadow = !faded && object.userData.originalCastShadow
			const list = Array.isArray(object.material) ? object.material : [object.material]
			for (const material of list) {
				if (!material.userData.original)
					material.userData.original = {
						opacity: material.opacity,
						transparent: material.transparent,
						depthWrite: material.depthWrite,
						emissiveIntensity: material.emissiveIntensity ?? 0,
						emissive: material.emissive?.clone(),
					}
				const original = material.userData.original
				material.opacity = faded ? original.opacity * 0.08 : original.opacity
				material.transparent = faded || original.transparent
				material.depthWrite = faded ? false : original.depthWrite
				if (material instanceof T.MeshStandardMaterial) {
					material.emissive.copy(original.emissive)
					if (hovered === id && !ghost) material.emissive.add(new T.Color('#677580').multiplyScalar(0.14))
					material.emissiveIntensity =
						hovered === id && !ghost ? Math.max(0.14, original.emissiveIntensity) : original.emissiveIntensity
				}
				material.needsUpdate = true
			}
		})
	}, [ghost, hovered, id, selected])
	const offset = systemOffset(id, amount)
	if (ghost) {
		offset[1] += id === 'body' ? 1.5 : 0
		offset[2] -= 3.5
		offset[0] -= 1.5
	}
	return (
		<group
			ref={group}
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
	selected,
	explode,
	reducedMotion,
	onInteract,
}: Pick<SceneProps, 'selected' | 'explode' | 'reducedMotion' | 'onInteract'>) {
	const camera = useRef<CameraControls>(null)
	const {size} = useThree()
	const mobile = size.width < 700
	const touched = useRef(false)
	const expanded = explode > 0.08
	useEffect(() => {
		const cc = camera.current
		if (!cc) return
		touched.current = false
		if (selected === 'powertrain') {
			const offset = systemOffset('powertrain', 1)
			const target: Point3 = [
				S.engine.cylinder1X - S.engine.cylinderSpacing * 1.5 + offset[0],
				S.engine.crankY + 0.15 + offset[1],
				0,
			]
			const shift = mobile ? 0.09 : 0.035
			void cc.setLookAt(
				target[0] + (mobile ? 1.5 : 0.82),
				target[1] + (mobile ? 0.8 : 0.5),
				mobile ? 2.05 : 1.12,
				target[0] - shift,
				target[1] - (mobile ? 0.24 : 0),
				0,
				!reducedMotion,
			)
			void cc.setFocalOffset(mobile ? 0.1 : 0.18, 0, 0, !reducedMotion)
		} else if (selected) {
			void cc.setFocalOffset(0, 0, 0, !reducedMotion)
			const system = SYSTEMS.find((s) => s.id === selected)!
			const offset = systemOffset(selected, 1)
			const target = system.anchor.map((n, i) => n + offset[i]) as Point3
			const wide = ['body', 'electrical', 'chassis', 'brakes', 'drivetrain'].includes(selected)
			if (wide) target[0] = offset[0]
			const distance = wide ? (mobile ? 11.4 : 5.5) : mobile ? 5.8 : 2.8
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
				mobile ? 15.6 : 7.4,
				mobile ? 9.0 : 4.9,
				mobile ? 17.5 : 8.3,
				0,
				mobile ? 1.55 : 1.55,
				0,
				!reducedMotion,
			)
		} else {
			void cc.setFocalOffset(0, 0, 0, !reducedMotion)
			void cc.setLookAt(
				mobile ? 12.8 : 5.5,
				mobile ? 5 : 2.45,
				mobile ? 14 : 6.1,
				0,
				mobile ? 0.72 : 0.68,
				0,
				!reducedMotion,
			)
		}
	}, [selected, expanded, mobile, reducedMotion])
	useFrame((state, delta) => {
		if (!camera.current || touched.current || reducedMotion || selected || expanded || isWorldPaused()) return
		camera.current.azimuthAngle += Math.sin(state.clock.elapsedTime * 0.14) * Math.min(delta, 0.05) * 0.004
	})
	return (
		<CameraControls
			ref={camera}
			makeDefault
			minDistance={0.16}
			maxDistance={35}
			maxPolarAngle={Math.PI * 0.48}
			smoothTime={0.55}
			draggingSmoothTime={0.12}
			onStart={() => {
				touched.current = true
				onInteract()
			}}
		/>
	)
}
function SceneContents(props: SceneProps) {
	const {size, camera} = useThree()
	const mobile = size.width < 700
	const projection = useRef(new T.Vector3())
	useFrame((_, delta) => {
		if (!props.pausedRef.current && !isWorldPaused())
			props.angleRef.current = advanceCrankAngle(
				props.angleRef.current,
				Math.min(delta, 0.075),
				props.rpm,
				props.slowdown,
			)
		for (const system of SYSTEMS) {
			const offset = systemOffset(system.id, props.explode)
			projection.current
				.set(...system.anchor)
				.add(new T.Vector3(...offset))
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
			<fog attach="fog" args={[S.materials.background, 16, 38]} />
			<ambientLight intensity={0.3} />
			<directionalLight
				position={[2, 7, 4]}
				intensity={2.2}
				color={S.materials.keyLight}
				castShadow
				shadow-mapSize={[1024, 1024]}
				shadow-camera-left={-5}
				shadow-camera-right={5}
				shadow-camera-top={5}
				shadow-camera-bottom={-5}
				shadow-bias={-0.0003}
			/>
			<directionalLight position={[-4, 3, -3]} intensity={1.8} color={S.materials.rimLight} />
			<Environment resolution={mobile ? 128 : 256} frames={1}>
				<Lightformer
					form="rect"
					intensity={4}
					color={S.materials.keyLight}
					position={[0, 5, 0]}
					rotation={[Math.PI / 2, 0, 0]}
					scale={[9, 3, 1]}
				/>
				<Lightformer
					form="rect"
					intensity={5}
					color={S.materials.keyLight}
					position={[0, 2.6, 3.6]}
					rotation={[0, Math.PI, 0]}
					scale={[8, 0.23, 1]}
				/>
				<Lightformer
					form="rect"
					intensity={4}
					color={S.materials.rimLight}
					position={[0, 3, -3.6]}
					scale={[7, 0.32, 1]}
				/>
				<Lightformer
					form="rect"
					intensity={2.2}
					color={S.materials.rimLight}
					position={[-4, 2.4, 0]}
					rotation={[0, Math.PI / 2, 0]}
					scale={[2, 3, 1]}
				/>
				<Lightformer
					form="rect"
					intensity={1}
					position={[4, 2, 0]}
					rotation={[0, -Math.PI / 2, 0]}
					scale={[2, 2, 1]}
				/>
				<Lightformer
					form="rect"
					intensity={1.2}
					position={[0, 1.5, 4]}
					rotation={[0, Math.PI, 0]}
					scale={[6, 1.2, 1]}
				/>
			</Environment>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0]} receiveShadow>
				<planeGeometry args={[90, 90]} />
				<MeshReflectorMaterial
					color={S.materials.floor}
					envMapIntensity={0.06}
					resolution={mobile ? 256 : 512}
					blur={[380, 150]}
					mixBlur={1}
					mixStrength={1.8}
					roughness={0.92}
					metalness={0.98}
					depthScale={0.3}
					minDepthThreshold={0.4}
					maxDepthThreshold={1.4}
					mirror={0.12}
				/>
			</mesh>
			<ContactShadows
				position={[0, -0.006, 0]}
				opacity={0.55}
				scale={12}
				blur={2.5}
				far={4.5}
				resolution={mobile ? 256 : 512}
				color="#000000"
				frames={1}
			/>
			<System id="body" {...common}>
				<Body />
			</System>
			<System id="powertrain" {...common}>
				<Engine
					angleRef={props.angleRef}
					rpm={props.rpm}
					xray={props.xray && props.selected === 'powertrain'}
				/>
				<group
					name="engine-accessories"
					position={props.selected === 'powertrain' ? [0, 0, -1.5] : [0, 0, 0]}
				>
					<PowertrainAccessories />
				</group>
			</System>
			<System id="drivetrain" {...common}>
				<Drivetrain />
			</System>
			<System id="chassis" {...common}>
				<Chassis />
				<Wheels explode={systemProgress('chassis', props.explode)} />
			</System>
			<System id="steering" {...common}>
				<Steering />
			</System>
			<System id="brakes" {...common}>
				<Brakes explode={systemProgress('brakes', props.explode)} />
			</System>
			<System id="electrical" {...common}>
				<Electrical />
				<EngineElectrical angleRef={props.angleRef} />
			</System>
			<CameraRig
				selected={props.selected}
				explode={props.explode}
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
			shadows={{type: T.PCFShadowMap}}
			dpr={[1, 1.6]}
			camera={{position: [6.4, 2.8, 6.8], fov: 34, near: 0.015, far: 100}}
			gl={{
				antialias: true,
				powerPreference: 'high-performance',
				toneMapping: T.ACESFilmicToneMapping,
				toneMappingExposure: 1.05,
			}}
			onCreated={({gl}) => {
				gl.setClearColor(S.materials.background)
				props.onReady()
			}}
		>
			<Suspense fallback={null}>
				<SceneContents {...props} />
			</Suspense>
		</Canvas>
	)
}
