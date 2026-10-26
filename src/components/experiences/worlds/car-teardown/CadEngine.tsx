import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import {RoundedBox, Html} from '@react-three/drei'
import * as T from 'three'
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js'
import {cloneAsset, disposeAssetMaterials} from './ConceptCar'
import {cylinderState, cycleAngle, valveLift, camLobeRadius} from './model'
import {VEHICLE_SPEC as S, type CylinderNumber, type ValveType} from './vehicle-spec'
import {useExperienceI18n} from '~/i18n/experience'
import {ASSET_INSTALL as I} from './asset-config'
import {createPitchLoop, createRibbonLoop} from './engine-geometry'
const cylinders = [1, 2, 3, 4] as const
const steel = {color: '#929fa3', metalness: 0.85, roughness: 0.28}
type Mode = 'bay' | 'section' | 'assembly'

export function camGeometry(cylinder: CylinderNumber, valve: ValveType) {
	const shape = new T.Shape()
	for (let i = 0; i <= 120; i++) {
		const a = (i / 120) * Math.PI * 2,
			r = camLobeRadius(180 - (a * 180) / Math.PI, cylinder, valve)
		const x = Math.sin(a) * r,
			y = Math.cos(a) * r
		i ? shape.lineTo(x, y) : shape.moveTo(x, y)
	}
	const g = new T.ExtrudeGeometry(shape, {
		depth: 0.009,
		bevelEnabled: true,
		bevelSegments: 2,
		bevelSize: 0.0003,
		bevelThickness: 0.0003,
		steps: 1,
	})
	g.translate(0, 0, -0.0045)
	g.rotateY(Math.PI / 2)
	return g
}
function Cam({side, angleRef, section}: {side: -1 | 1; angleRef: RefObject<number>; section: boolean}) {
	const group = useRef<T.Group>(null)
	const lobes = useMemo(() => cylinders.map((c) => camGeometry(c, side < 0 ? 'intake' : 'exhaust')), [side])
	useEffect(() => () => lobes.forEach((g) => g.dispose()), [lobes])
	useFrame(() => {
		if (group.current) group.current.rotation.x = (angleRef.current * Math.PI) / 360
	})
	return (
		<group ref={group} position={[0, 0.355, side * 0.023]} name={`cam-${side}`}>
			<mesh position-x={section ? 0.144 : 0} rotation-z={Math.PI / 2}>
				<cylinderGeometry args={[0.009, 0.009, section ? 0.13 : 0.426, 32]} />
				<meshStandardMaterial {...steel} />
			</mesh>
			{cylinders
				.filter((c) => !section || c === 1)
				.flatMap((c) =>
					[-0.017, 0.017].map((dx) => (
						<mesh key={`${c}/${dx}`} position={[0.144 - (c - 1) * 0.096 + dx, 0, 0]} geometry={lobes[c - 1]}>
							<meshStandardMaterial {...steel} />
						</mesh>
					)),
				)}
		</group>
	)
}
function ValveSpring({cylinder, side, dx, angleRef}: {cylinder: CylinderNumber; side: -1 | 1; dx: number; angleRef: RefObject<number>}) {
	const mesh = useRef<T.Mesh>(null)
	const material = useMemo(() => {
		const m = new T.MeshStandardMaterial({...steel, roughness: 0.38})
		m.onBeforeCompile = (s) => {
			s.uniforms.coilHeight = {value: 0.025}
			m.userData.height = s.uniforms.coilHeight
			s.vertexShader = 'uniform float coilHeight;\n' + s.vertexShader
			s.vertexShader = s.vertexShader.replace(
				'#include <begin_vertex>',
				'#include <begin_vertex>\ntransformed.y += uv.x * (coilHeight - 0.025);',
			)
		}
		m.customProgramCacheKey = () => 'cad-valve-spring'
		return m
	}, [])
	const geometry = useMemo(() => {
		const pts = Array.from({length: 121}, (_, i) => {
			const t = i / 120,
				a = t * Math.PI * 12
			return new T.Vector3(0.0075 * Math.cos(a), t * 0.025, 0.0075 * Math.sin(a))
		})
		return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, 0.001, 6, false)
	}, [])
	useEffect(
		() => () => {
			geometry.dispose()
			material.dispose()
		},
		[geometry, material],
	)
	useFrame(() => {
		const lift = valveLift(cycleAngle(angleRef.current, cylinder), side < 0 ? 'intake' : 'exhaust')
		if (material.userData.height) material.userData.height.value = 0.025 - lift
	})
	return <mesh ref={mesh} geometry={geometry} material={material} position={[0.144 - (cylinder - 1) * 0.096 + dx, 0.305, side * 0.023]} />
}
function Hose({points, radius = 0.008, color = '#242e32'}: {points: [number, number, number][]; radius?: number; color?: string}) {
	const geometry = useMemo(
		() => new T.TubeGeometry(new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))), 48, radius, 8, false),
		[points, radius],
	)
	useEffect(() => () => geometry.dispose(), [geometry])
	return (
		<mesh geometry={geometry} castShadow>
			<meshStandardMaterial color={color} roughness={0.78} />
		</mesh>
	)
}
function EngineDress({section}: {section: boolean}) {
	return (
		<group name="engine-hoses-and-wiring" visible={!section}>
			<Hose
				points={[
					[0.22, 0.29, -0.09],
					[0.29, 0.24, -0.16],
					[0.4, 0.22, -0.19],
					[0.49, 0.18, -0.12],
				]}
				radius={0.014}
			/>
			<Hose
				points={[
					[-0.18, 0.28, 0.1],
					[-0.25, 0.24, 0.18],
					[-0.2, 0.08, 0.21],
					[0.04, 0.03, 0.2],
					[0.2, 0.06, 0.18],
				]}
				radius={0.01}
			/>
			<Hose
				points={[
					[-0.22, 0.37, -0.09],
					[-0.1, 0.39, -0.09],
					[0.1, 0.39, -0.09],
					[0.22, 0.37, -0.09],
				]}
				radius={0.006}
			/>
			{cylinders.map((c) => (
				<Hose
					key={`wire-${c}`}
					points={[
						[0.144 - (c - 1) * 0.096, 0.39, -0.09],
						[0.144 - (c - 1) * 0.096, 0.42, -0.06],
						[0.144 - (c - 1) * 0.096, 0.421, 0],
					]}
					radius={0.003}
				/>
			))}
			{cylinders.map((c) => (
				<group key={c} position={[0.144 - (c - 1) * 0.096, 0.421, 0]}>
					<RoundedBox args={[0.032, 0.027, 0.035]} radius={0.006} smoothness={3}>
						<meshStandardMaterial color="#25373b" roughness={0.62} />
					</RoundedBox>
				</group>
			))}
			{[-1, 1].map((side) => (
				<group key={side} position={[side * 0.19, -0.085, side * 0.145]}>
					<RoundedBox args={[0.11, 0.025, 0.1]} radius={0.009}>
						<meshStandardMaterial color="#535f63" metalness={0.75} roughness={0.5} />
					</RoundedBox>
					<mesh position-y={-0.025}>
						<cylinderGeometry args={[0.027, 0.034, 0.042, 24]} />
						<meshStandardMaterial color="#252b2c" roughness={0.85} />
					</mesh>
				</group>
			))}
		</group>
	)
}
function CylinderContents({angleRef, rpm, section}: {angleRef: RefObject<number>; rpm: number; section: boolean}) {
	const gas = useRef<T.Group>(null),
		spark = useRef<T.Group>(null)
	useFrame(() => {
		const s = cylinderState(angleRef.current, 1, rpm)
		if (gas.current) {
			const bottom = s.pistonPosition + 0.03,
				top = S.engine.rodLength + S.engine.crankRadius + 0.03 + S.engine.stroke / (S.engine.compressionRatio - 1)
			gas.current.position.y = (top + bottom) / 2
			gas.current.scale.y = Math.max(0.001, top - bottom)
			const m = (gas.current.children[0] as T.Mesh).material as T.MeshStandardMaterial
			m.color.set(S.materials.strokes[s.stroke])
			m.emissive.copy(m.color)
			m.emissiveIntensity = s.stroke === 'power' ? 0.5 : 0.08
		}
		if (spark.current) spark.current.visible = s.sparkIntensity > 0.1
	})
	return (
		<group visible={section}>
			<group ref={gas} position-x={0.144}>
				<mesh>
					<cylinderGeometry args={[0.043, 0.043, 1, 48]} />
					<meshStandardMaterial transparent opacity={0.18} depthWrite={false} />
				</mesh>
			</group>
			<group position={[0.144, 0.272, 0]} rotation-z={Math.PI}>
				<mesh position-y={-0.018}>
					<cylinderGeometry args={[0.005, 0.005, 0.028, 24]} />
					<meshStandardMaterial color="#e5e7df" roughness={0.28} />
				</mesh>
				<mesh>
					<cylinderGeometry args={[0.0055, 0.0045, 0.011, 6]} />
					<meshStandardMaterial {...steel} />
				</mesh>
				<group ref={spark} position-y={0.008}>
					<mesh>
						<sphereGeometry args={[0.005, 12, 8]} />
						<meshBasicMaterial color="#ffe4ac" />
					</mesh>
					<pointLight color="#ffbf65" intensity={0.07} distance={0.17} />
				</group>
			</group>
		</group>
	)
}
function BeltDrive({angleRef}: {angleRef: RefObject<number>}) {
	const chain = useRef<T.InstancedMesh>(null)
	const assets = useMemo(() => {
		const accessory = createPitchLoop(
			[
				{y: 0, z: 0, radius: 0.078},
				{y: 0.115, z: -0.17, radius: 0.038},
			],
			0.276,
		)
		const timing = createPitchLoop(
			[
				{y: 0, z: 0, radius: 0.0105},
				{y: 0.355, z: -0.023, radius: 0.021},
				{y: 0.355, z: 0.023, radius: 0.021},
			],
			0.248,
		)
		return {belt: createRibbonLoop(accessory, 0.014, 0.0025), timing}
	}, [])
	useEffect(() => () => assets.belt.dispose(), [assets])
	useFrame(() => {
		if (!chain.current) return
		const dummy = new T.Object3D()
		for (let i = 0; i < 128; i++) {
			const t = (i / 128 + (angleRef.current / 360) * 0.083) % 1
			dummy.position.copy(assets.timing.getPointAt(t))
			dummy.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), assets.timing.getTangentAt(t).normalize())
			dummy.updateMatrix()
			chain.current.setMatrixAt(i, dummy.matrix)
		}
		chain.current.instanceMatrix.needsUpdate = true
	})
	return (
		<group name="timing-chain-and-accessory-belt">
			<mesh geometry={assets.belt}>
				<meshStandardMaterial color="#242d30" roughness={0.82} />
			</mesh>
			<instancedMesh ref={chain} args={[undefined, undefined, 128]} frustumCulled={false}>
				<boxGeometry args={[0.004, 0.004, 0.003]} />
				<meshStandardMaterial {...steel} />
			</instancedMesh>
			{[
				{y: 0, z: 0, r: 0.0105},
				{y: 0.355, z: -0.023, r: 0.021},
				{y: 0.355, z: 0.023, r: 0.021},
			].map((v, i) => (
				<mesh key={i} position={[0.248, v.y, v.z]} rotation-y={Math.PI / 2}>
					<torusGeometry args={[v.r, 0.003, 8, 40]} />
					<meshStandardMaterial {...steel} />
				</mesh>
			))}
		</group>
	)
}
export function CadEngine({
	asset,
	angleRef,
	rpm,
	mode,
	explode = 0,
}: {
	asset: GLTF
	angleRef: RefObject<number>
	rpm: number
	mode: Mode
	explode?: number
}) {
	const scene = useMemo(() => cloneAsset(asset.scene, true), [asset])
	const frame = useRef<T.Group>(null)
	const planes = useMemo(() => [new T.Plane(new T.Vector3(0, 0, -1), 0), new T.Plane(new T.Vector3(1, 0, 0), -0.096)], [])
	useEffect(() => () => disposeAssetMaterials(scene), [scene])
	useEffect(() => {
		scene.traverse((o) => {
			if (o instanceof T.Mesh)
				for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
					const m = material as T.MeshStandardMaterial
					const parent = o.parent?.userData
					const section = mode === 'section' && (parent?.kind === 'static' || parent?.kind === 'valve' || parent?.kind === 'crank')
					m.clippingPlanes = section ? planes : null
					m.clipShadows = true
					m.needsUpdate = true
				}
		})
	}, [mode, scene, planes])
	useFrame(() => {
		if (frame.current) {
			planes[0].setFromNormalAndCoplanarPoint(
				new T.Vector3(0, 0, -1).transformDirection(frame.current.matrixWorld),
				frame.current.localToWorld(new T.Vector3(0, 0, 0)),
			)
			planes[1].setFromNormalAndCoplanarPoint(
				new T.Vector3(1, 0, 0).transformDirection(frame.current.matrixWorld),
				frame.current.localToWorld(new T.Vector3(0.096, 0, 0)),
			)
		}
		for (const node of scene.children) {
			const p = node.userData
			const v = p.bindOrigin ?? [0, 0, 0]
			node.position.fromArray(v)
			node.rotation.set(0, 0, 0)
			node.visible = true
			const state = cylinderState(angleRef.current, (p.cylinder || 1) as CylinderNumber, rpm)
			if (p.kind === 'crank') node.rotation.x = (angleRef.current * Math.PI) / 180
			if (p.kind === 'piston') {
				node.position.y = state.pistonPosition
				node.userData.renderedPinY = node.position.y
			}
			if (p.kind === 'rod') {
				const a = (state.cycleAngle * Math.PI) / 180,
					y = S.engine.crankRadius * Math.cos(a),
					z = S.engine.crankRadius * Math.sin(a)
				node.position.y = y
				node.position.z = z
				node.rotation.x = Math.atan2(-z, state.pistonPosition - y)
			}
			if (p.kind === 'valve') node.position.y = -valveLift(state.cycleAngle, p.side < 0 ? 'intake' : 'exhaust') + explode * 0.17
			if (p.kind === 'alternator') node.rotation.x = ((angleRef.current * Math.PI) / 180) * (0.078 / 0.038)
			if (p.cover) node.position.y += explode * 0.32
			else if (p.head) node.position.y += explode * 0.17
			else if (p.kind === 'piston' || p.kind === 'rod') node.position.z += explode * 0.22
			if (
				mode === 'section' &&
				(/manifold|plenum|throttle|alternator|pulley|flywheel|pump|filter/i.test(node.name) ||
					p.cover ||
					/housing|bearing.bridge|bearing.fastener|lower.seat|retainer/i.test(node.name))
			)
				node.visible = false
			if (mode === 'section' && p.cylinder && p.cylinder !== 1) node.visible = false
		}
		scene.userData.crankAngle = angleRef.current
	})
	return (
		<group ref={frame} name="cad-engine" position={[I.engineCenterX, S.engine.crankY, 0]}>
			<primitive object={scene} />
			<group position-y={explode * 0.22}>
				{([-1, 1] as const).map((side) => (
					<Cam key={side} side={side} section={mode === 'section'} angleRef={angleRef} />
				))}
			</group>
			<group position-y={explode * 0.17}>
				{cylinders
					.filter((c) => mode !== 'section' || c === 1)
					.flatMap((c) =>
						([-1, 1] as const).flatMap((side) =>
							[-0.017, 0.017].map((dx) => <ValveSpring key={`${c}/${side}/${dx}`} cylinder={c} side={side} dx={dx} angleRef={angleRef} />),
						),
					)}
			</group>
			<EngineDress section={mode === 'section'} />
			{mode !== 'section' && <BeltDrive angleRef={angleRef} />}
			{mode === 'section' && <SectionLabels />}
			<CylinderContents angleRef={angleRef} rpm={rpm} section={mode === 'section'} />
		</group>
	)
}

function SectionLabels() {
	const tx = useExperienceI18n()
	return (
		<group>
			{(
				[
					[0.144, 0.3, 0.006, '气门'],
					[0.144, 0.272, 0.03, '火花塞'],
					[0.144, 0.17, 0.055, '活塞'],
					[0.144, -0.01, 0.03, '曲轴'],
				] as const
			).map(([x, y, z, text]) => (
				<Html key={text} position={[x, y, z]} className="ct-section-label" style={{pointerEvents: 'none'}}>
					<span>{tx(text)}</span>
				</Html>
			))}
		</group>
	)
}
