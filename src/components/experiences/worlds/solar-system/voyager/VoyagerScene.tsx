import { useEffect, useMemo, useRef, type ComponentRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { PLANETS, MOONS } from '../solar-data'
import { PlanetNode, Sun, StarField, OrbitLine } from '../solar-bodies'
import { AU_KM, UNITS_PER_AU, bodyRadius } from '../scale-model'
import { bodyPosition, bodyTrack, covers, craftPosition, sampleTrack, worldPosition, DAY, type Ephemeris } from './ephemeris'
import { sampleJourney, type Journey } from './journey'
export type CameraMode = 'cinema' | 'observer' | 'ship' | 'free'
const noop = () => {}
const KM = UNITS_PER_AU / AU_KM

/** Original schematic geometry in metres; dish diameter 3.7 m, boom ~13 m. */
function Spacecraft({ inspection = false }: { inspection?: boolean }) {
	const dish = useMemo(
		() =>
			new THREE.LatheGeometry(
				Array.from({ length: 25 }, (_, i) => {
					const r = (1.85 * i) / 24
					return new THREE.Vector2(r, (r * r) / 6)
				}),
				48,
			),
		[],
	)
	useEffect(() => () => dish.dispose(), [dish])
	return (
		<group scale={inspection ? 1 : KM / 1000} rotation={[0.5, 0, 0.3]}>
			<mesh geometry={dish}>
				<meshStandardMaterial color="#e2dacc" roughness={0.48} metalness={0.3} side={THREE.DoubleSide} />
			</mesh>
			<mesh position={[0, -0.5, 0]}>
				<cylinderGeometry args={[0.9, 0.9, 0.7, 10]} />
				<meshStandardMaterial color="#b89b4e" metalness={0.65} roughness={0.4} />
			</mesh>
			<mesh position={[0, 0.9, 0]}>
				<cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
				<meshStandardMaterial color="#bec5ca" />
			</mesh>
			<mesh position={[5, -0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
				<cylinderGeometry args={[0.025, 0.025, 10, 6]} />
				<meshStandardMaterial color="#b7bdc4" />
			</mesh>
			<mesh position={[-2.4, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
				<cylinderGeometry args={[0.035, 0.035, 4, 6]} />
				<meshStandardMaterial color="#c1c5c8" />
			</mesh>
			{[0, 1, 2].map((i) => (
				<mesh key={i} position={[-3.3 - i * 0.5, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
					<cylinderGeometry args={[0.23, 0.23, 0.44, 12]} />
					<meshStandardMaterial color="#42464d" metalness={0.7} roughness={0.7} />
				</mesh>
			))}
			<mesh position={[0, -0.85, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.16, 0.16, 0.025, 32]} />
				<meshStandardMaterial color="#c5a24a" metalness={0.8} roughness={0.25} />
			</mesh>
		</group>
	)
}

function MovingBody({ id, data, time }: { id: string; data: Ephemeris; time: MutableRefObject<number> }) {
	const group = useRef<THREE.Group>(null)
	const moon = MOONS.find((m) => m.id === id)!
	useFrame(() => {
		const track = bodyTrack(data, id, time.current)
		if (!group.current) return
		group.current.visible = !!track && covers(track, time.current)
		if (group.current.visible) group.current.position.set(...worldPosition(sampleTrack(track!, time.current)))
	})
	return (
		<group ref={group}>
			<mesh>
				<sphereGeometry args={[moon.radiusKm * KM, 40, 28]} />
				<meshStandardMaterial color={id === 'titan' ? '#d9a86b' : id === 'triton' ? '#bab9b2' : moon.color} roughness={0.95} />
			</mesh>
		</group>
	)
}

function Trail({
	data,
	journey,
	elapsed,
	origin,
}: {
	data: Ephemeris
	journey: Journey
	elapsed: MutableRefObject<number>
	origin: MutableRefObject<THREE.Vector3>
}) {
	const geometry = useMemo(() => {
		const value = new THREE.BufferGeometry()
		value.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3))
		return value
	}, [])
	const material = useMemo(
		() =>
			new THREE.LineBasicMaterial({
				color: data.mission === 1 ? '#edc98a' : '#9cc9e7',
				transparent: true,
				opacity: 0.64,
				depthTest: false,
			}),
		[data.mission],
	)
	const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material])
	const positions = geometry.attributes.position.array as Float32Array
	const last = useRef('')
	useEffect(
		() => () => {
			geometry.dispose()
			material.dispose()
		},
		[geometry, material],
	)
	useFrame(() => {
		const key = `${elapsed.current}:${origin.current.x}:${origin.current.y}:${origin.current.z}`
		if (last.current === key) return
		last.current = key
		const s = sampleJourney(journey, elapsed.current)
		const local = !['overview', 'future'].includes(s.chapter.target)
		const from = local ? s.chapter.from : data.start
		const to = Math.max(from + 1, s.time)
		for (let i = 0; i < 600; i++) {
			const t = from + ((to - from) * i) / 599
			const p = new THREE.Vector3(...worldPosition(craftPosition(data, t)))
			if (local) {
				// Encounter arc is explicitly planet-relative, not a frozen heliocentric path.
				const track = bodyTrack(data, s.chapter.target, t)
				if (track && covers(track, t)) p.sub(new THREE.Vector3(...worldPosition(sampleTrack(track, t))))
				p.add(new THREE.Vector3(...worldPosition(bodyPosition(data, s.chapter.target, s.time)))).sub(origin.current)
			} else p.sub(origin.current)
			p.toArray(positions, i * 3)
		}
		geometry.attributes.position.needsUpdate = true
		geometry.setDrawRange(0, 600)
		line.frustumCulled = false
	})
	return <primitive object={line} />
}

export function VoyagerScene({
	data,
	journey,
	elapsed,
	cameraMode,
	fov,
	reducedMotion,
	onFree,
}: {
	data: Ephemeris
	journey: Journey
	elapsed: MutableRefObject<number>
	cameraMode: CameraMode
	fov: number
	reducedMotion: boolean
	onFree: () => void
}) {
	const tx = useExperienceI18n()
	const { camera, size, gl } = useThree()
  const immersive = useRef(false)
  useEffect(() => {
    const shell = gl.domElement.closest('[data-overlays-hidden]')
    const update = () => { immersive.current = shell?.getAttribute('data-overlays-hidden') === 'true' }
    update()
    const observer = new MutationObserver(update)
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-overlays-hidden'] })
    return () => observer.disconnect()
  }, [gl])
	const orbit = useRef<ComponentRef<typeof OrbitControls>>(null)
	const universe = useRef<THREE.Group>(null),
		craft = useRef<THREE.Group>(null),
		marker = useRef<THREE.Group>(null)
	const time = useRef(data.start),
		days = useRef(0),
		origin = useRef(new THREE.Vector3())
	const state = useRef(sampleJourney(journey, elapsed.current))
	const first = useRef(true),
		originChapter = useRef('')
	const localBodies = useMemo(
		() =>
			Array.from(new Set(data.encounters.flatMap((e) => [e.id, ...Object.keys(e.moons)]))).filter((id) => MOONS.some((m) => m.id === id)),
		[data],
	)
	useFrame(() => {
		const s = sampleJourney(journey, elapsed.current)
		state.current = s
		time.current = s.time
		days.current = (Math.min(s.time, data.end) - 946728000) / DAY
		const close = !['overview', 'future'].includes(s.chapter.target)
		const globalCamera = camera.position.clone().add(origin.current)
		if (cameraMode === 'ship') origin.current.set(...worldPosition(craftPosition(data, s.time)))
		else if (close) origin.current.set(...worldPosition(bodyPosition(data, s.chapter.target, s.time)))
		else origin.current.set(0, 0, 0)
		if (originChapter.current !== s.chapter.id + cameraMode) {
			camera.position.copy(globalCamera).sub(origin.current)
			originChapter.current = s.chapter.id + cameraMode
		}
		universe.current?.position.copy(origin.current).negate()
		const ship = new THREE.Vector3(...worldPosition(craftPosition(data, s.time)))
		craft.current?.position.copy(ship)
		marker.current?.position.copy(ship)
		if (universe.current) universe.current.visible = cameraMode !== 'ship'
	}, -3)
	useFrame((_, delta) => {
		const s = state.current,
			close = !['overview', 'future'].includes(s.chapter.target)
		const ship = new THREE.Vector3(...worldPosition(craftPosition(data, s.time))).sub(origin.current)
		const c = camera as THREE.PerspectiveCamera
		c.fov = cameraMode === 'observer' ? fov : 46
		c.near = cameraMode === 'ship' ? 0.01 : 1e-10
		c.far = Math.max(60000, ship.length() * 8)
		if (size.width <= 720 && !immersive.current && cameraMode === 'cinema' && close) c.setViewOffset(size.width, size.height, 0, size.height * .06, size.width, size.height)
    else c.clearViewOffset()
    c.updateProjectionMatrix()
		if (craft.current) craft.current.visible = cameraMode !== 'observer'
		if (cameraMode === 'ship') {
			const direction = new THREE.Vector3(-0.6, 0.5, 1).normalize()
			camera.position.copy(direction).multiplyScalar(18 / Math.min(1, size.width / size.height))
			camera.lookAt(0, 0, 0)
			orbit.current?.target.set(0, 0, 0)
			first.current = true
		} else if (cameraMode === 'observer') {
			camera.position.copy(ship)
			const target = close ? new THREE.Vector3() : new THREE.Vector3().sub(origin.current)
			camera.lookAt(target)
			if (orbit.current) orbit.current.target.copy(target)
		} else if (cameraMode === 'cinema') {
			const planet = PLANETS.find((p) => p.id === s.chapter.target),
				moon = MOONS.find((m) => m.id === s.chapter.target)
			const r = bodyRadius(planet?.radiusKm ?? moon?.radiusKm ?? 6371, 'physical')
			const extent = close ? (r * (planet?.rings ? 8 : 4.3) * (size.width <= 720 && !immersive.current ? 1.15 : 1)) / Math.min(1, size.width / size.height) : Math.max(35, ship.length() * 1.8) / Math.min(1, size.width / size.height)
			const sunward = origin.current.clone().negate().normalize()
			const direction = close
				? new THREE.Vector3(sunward.x * 0.8 - sunward.z * 0.55, 0.38, sunward.z * 0.8 + sunward.x * 0.55).normalize()
				: new THREE.Vector3(0.15, 0.85, 1).normalize()
			// Slow orbit makes the illuminated limb legible; no motion with reduced-motion.
			if (!reducedMotion) direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), (s.progress - 0.5) * 0.22)
			const target = close ? new THREE.Vector3() : ship.clone().multiplyScalar(0.4)
			const desired = target.clone().addScaledVector(direction, extent)
			if (first.current || reducedMotion) {
				camera.position.copy(desired)
				first.current = false
			} else {
				const current = camera.position.clone().sub(target),
					length = Math.max(current.length(), 1e-10)
				const mix = 1 - Math.exp(-Math.min(delta, 0.05) * 4)
				camera.position.copy(target).add(
					current
						.normalize()
						.lerp(direction, mix)
						.normalize()
						.multiplyScalar(Math.exp(THREE.MathUtils.lerp(Math.log(length), Math.log(extent), mix))),
				)
			}
			camera.lookAt(target)
			orbit.current?.target.copy(target)
		} else orbit.current?.update()
		if (craft.current)
			craft.current.lookAt(new THREE.Vector3(...worldPosition(bodyPosition(data, 'earth', Math.min(s.time, data.end)))).sub(origin.current))
	}, -1)
	const initial = sampleJourney(journey, elapsed.current)
	const future = initial.chapter.future
	return (
		<>
			<color attach="background" args={['#02050a']} />
			<ambientLight intensity={0.18} color="#b8c5d9" />
			<StarField followCamera />
			<group ref={universe}>
				<Sun mode="physical" hidden={false} registerBody={noop} />
        {['overview','future'].includes(initial.chapter.target) && <Html center zIndexRange={[6,0]}><span className="vg-ship-marker" data-experience-overlay="true"><i/>{tx('太阳')}</span></Html>}
				{!future &&
					PLANETS.map((planet) => (
						<group key={planet.id}>
							<PlanetNode
								data={planet}
								mode="physical"
								labels={false}
								showMoons={false}
								showOrbits={false}
								simDaysRef={days}
								selected={false}
								onSelect={noop}
								registerBody={noop}
								sunPositionAt={() => [-origin.current.x, -origin.current.y, -origin.current.z]}
								positionAt={() => worldPosition(bodyPosition(data, planet.id, Math.min(time.current, data.end)))}
							/>
							{initial.chapter.target === 'overview' && (
								<OrbitLine elements={planet.elements} color={planet.color} highlighted={false} mode="physical" />
							)}
						</group>
					))}
				{!future && localBodies.map((id) => <MovingBody key={id} id={id} data={data} time={time} />)}
				<group ref={craft}>
					<Spacecraft />
				</group>
				{cameraMode !== 'observer' && cameraMode !== 'ship' && (
					<group ref={marker}>
						<Html center zIndexRange={[6, 0]}>
							<span className="vg-ship-marker" data-experience-overlay="true">
								<i />
								{tx(data.mission === 1 ? '旅行者 1 号' : '旅行者 2 号')}
							</span>
						</Html>
					</group>
				)}
				{['interstellar', 'present'].includes(initial.chapter.id) && (
					<mesh rotation={[Math.PI / 2, 0, 0]}>
						<ringGeometry args={[119.8 * UNITS_PER_AU, 120.2 * UNITS_PER_AU, 256]} />
						<meshBasicMaterial color="#849ca9" opacity={0.35} transparent side={THREE.DoubleSide} />
					</mesh>
				)}
				{future && (
					<group rotation={[Math.PI / 2, 0, 0]}>
						{[2000, 100000].map((au) => (
							<mesh key={au}>
								<ringGeometry args={[au * UNITS_PER_AU * 0.999, au * UNITS_PER_AU * 1.001, 256]} />
								<meshBasicMaterial color="#697589" opacity={0.35} transparent side={THREE.DoubleSide} />
							</mesh>
						))}
					</group>
				)}
			</group>
			{cameraMode === 'ship' ? (
				<>
					<Spacecraft inspection />
					<directionalLight position={[4, 6, 8]} intensity={3} />
				</>
			) : (
				<Trail data={data} journey={journey} elapsed={elapsed} origin={origin} />
			)}
			<OrbitControls
				ref={orbit}
				makeDefault
				enabled={cameraMode !== 'observer' && cameraMode !== 'ship'}
				enablePan={false}
				enableDamping={!reducedMotion}
				minDistance={1e-9}
				maxDistance={1e8}
				onStart={onFree}
			/>
		</>
	)
}
