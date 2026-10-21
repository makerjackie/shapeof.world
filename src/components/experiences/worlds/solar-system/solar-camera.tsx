import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { PLANETS, MOONS } from './solar-data'
import { MINOR_BODIES } from './minor-bodies'
import { bodyRadius, moonRadius, moonOrbitRadius, SUN_RADIUS_KM, type ScaleMode } from './scale-model'

export type GalacticView = 'oblique' | 'top' | 'forward'
export type ViewPreset = 'overview' | 'inner' | 'side' | 'surface' | 'system' | 'galaxy' | 'outer'
export function SolarCamera({
	revision,
	focusedId,
	locateId,
	bodies,
	view,
	galacticView,
	mode,
	onControl,
	onSettled,
	reducedMotion,
}: {
	revision: number
	focusedId: string | null
	locateId: string | null
	bodies: React.MutableRefObject<Map<string, THREE.Object3D>>
	view: ViewPreset
	galacticView: GalacticView
	mode: ScaleMode
	onControl: () => void
	onSettled: () => void
	reducedMotion: boolean
}) {
	const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
	const { camera, size, gl } = useThree()
	const immersive = useRef(false)
	const pending = useRef(true)
	const tween = useRef<{
		start: THREE.Vector3
		offset: THREE.Vector3
		target: THREE.Vector3
		t: number
		startZoom: number
		endZoom: number
	} | null>(null)
	const previousMode = useRef(mode)
	const initialized = useRef(false)
	const previousCamera = useRef(camera)
	const previousPose = useRef<{ target: THREE.Vector3; offset: THREE.Vector3; halfHeight: number } | null>(null)
	const target = useRef(new THREE.Vector3())
	const lastTarget = useRef(new THREE.Vector3())
	useEffect(() => {
		pending.current = true
	}, [revision, focusedId, locateId, view, galacticView, mode, size.width, size.height, camera])
	useEffect(() => {
		const shell = gl.domElement.closest('[data-overlays-hidden]')
		const update = () => {
			immersive.current = shell?.getAttribute('data-overlays-hidden') === 'true'
			pending.current = true
		}
		update()
		const observer = new MutationObserver(update)
		if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-overlays-hidden'] })
		return () => observer.disconnect()
	}, [gl])
	useFrame((_, delta) => {
		const c = controls.current
		if (!c) return
		const body = focusedId ? bodies.current.get(focusedId) : null
		const located = !focusedId && locateId ? bodies.current.get(locateId) : null
		if (focusedId && !body) return
		if (body) body.getWorldPosition(target.current)
		else if (located) located.getWorldPosition(target.current)
		else if (view === 'galaxy') target.current.set(-180, -260, 0)
		else target.current.set(0, 0, 0)
		if (pending.current) {
			const moon = MOONS.find((m) => m.id === focusedId)
			const planet = PLANETS.find((p) => p.id === (moon?.parentId ?? focusedId))
			const minor = MINOR_BODIES.find((b) => b.id === focusedId)
			const radius =
				moon && planet ? moonRadius(moon, planet, mode) : bodyRadius(planet?.radiusKm ?? minor?.radiusKm ?? SUN_RADIUS_KM, mode)
			const aspect = size.width / size.height
			const fit = 1 / Math.min(1, aspect)
			let extent = mode === 'physical' ? 400 : 260
			let direction = new THREE.Vector3(0, mode === 'illustrated' ? 0.5 : 0.85, 1)
			if (view === 'outer') extent = 100000 * 12
			if (view === 'inner') extent = mode === 'physical' ? 21 : 125
			if (view === 'side') direction.set(0, 0.15, 1)
			if (view === 'galaxy') {
				extent = 580
				if (galacticView === 'top') direction.set(0, 1, 0.001)
				else if (galacticView === 'forward') direction.set(-1, -0.5, 0.25)
				else direction.set(0.2, 0.5, 1)
			}
			if (body) {
				extent = radius * (minor?.kind === 'comet' ? 4 : 1) * (planet?.rings && !moon ? 2.7 : 1.4)
				const sunward = target.current.clone().normalize().negate()
				// Keep the illuminated hemisphere in view, with a visible terminator.
				direction.set(sunward.x * 0.8 - sunward.z * 0.5, 0.5, sunward.z * 0.8 + sunward.x * 0.5)
				if (focusedId === 'sun') direction.set(0, 0.25, 1)
				if (view === 'system' && planet) {
					extent = Math.max(radius * 3, ...planet.moons.map((m) => moonOrbitRadius(m, planet, mode) * (1 + m.e)))
					direction.set(0.25, 1.3, 1)
				}
			}
			let distance = extent * 3.1 * fit * (body && size.width <= 720 && !immersive.current ? 1.2 : 1)
			if (body && mode === 'illustrated' && view !== 'system' && !minor) {
				// Preserve the original comfortable portrait scale, including Saturn's rings.
				const mobile = size.width <= 720 && !immersive.current
				distance = radius * (planet?.rings && !moon ? (mobile ? 17.5 : 7.8) : mobile ? 10.5 : 5.5)
			}
			const offset =
				located && previousCamera.current === camera
					? camera.position.clone().sub(c.target)
					: direction.normalize().multiplyScalar(distance)
			c.minDistance = body ? radius * 1.4 : mode === 'physical' ? 0.001 : 3
			c.maxDistance = view === 'outer' ? 1e8 : 18000
			const perspective = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera
			const orthographic = camera instanceof THREE.OrthographicCamera
			if (orthographic) {
				const halfHeight = view === 'inner' ? 72 : size.width <= 720 ? 190 : 115
				camera.left = -halfHeight * aspect
				camera.right = halfHeight * aspect
				camera.top = halfHeight
				camera.bottom = -halfHeight
				if (!located || previousCamera.current !== camera) camera.zoom = 1
			}
			perspective.far = Math.max(60000, distance * 8)
			perspective.near = body ? Math.max(radius * 0.025, 1e-9) : 0.01
			if (size.width <= 720 && body && !immersive.current)
				perspective.setViewOffset(size.width, size.height, 0, size.height * 0.105, size.width, size.height)
			else perspective.clearViewOffset()
			perspective.updateProjectionMatrix()
			// Illustrated space keeps every planet mounted, so travel stays continuous.
			// True-scale jumps need a local reframe across otherwise invisible AU gaps.
			const continuous = initialized.current && mode === 'illustrated' && previousMode.current === mode && !minor && !reducedMotion
			const changingProjection = previousCamera.current !== camera && previousPose.current
			const oldPose = previousPose.current
			const fromTarget = continuous ? (changingProjection && oldPose ? oldPose.target.clone() : c.target.clone()) : target.current.clone()
			let start = continuous ? camera.position.clone().sub(fromTarget) : offset.clone()
			const endZoom = camera.zoom
			let startZoom = endZoom
			if (continuous && changingProjection && oldPose) {
				start = oldPose.offset.clone()
				if (camera instanceof THREE.OrthographicCamera) {
					startZoom = (camera.top - camera.bottom) / (2 * oldPose.halfHeight)
				} else if (camera instanceof THREE.PerspectiveCamera) {
					start.setLength(oldPose.halfHeight / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
				}
				camera.zoom = startZoom
				camera.updateProjectionMatrix()
			}
			if (!continuous) {
				c.target.copy(target.current)
				camera.position.copy(target.current).add(offset)
			}
			tween.current = continuous ? { start, offset, target: fromTarget, t: 0, startZoom, endZoom } : null
			previousMode.current = mode
			previousCamera.current = camera
			initialized.current = true
			if (!continuous) onSettled()
			lastTarget.current.copy(target.current)
			pending.current = false
		}
		if (tween.current) {
			const t = tween.current
			t.t = Math.min(1, t.t + Math.min(delta, 0.05) / 1.2)
			const e = t.t * t.t * (3 - 2 * t.t)
			// Interpolate visible span, not zoom, to keep size change continuous across projections.
			camera.zoom = 1 / THREE.MathUtils.lerp(1 / t.startZoom, 1 / t.endZoom, e)
			camera.updateProjectionMatrix()
			c.target.lerpVectors(t.target, target.current, e)
			const offset = t.start.clone().lerp(t.offset, e)
			// Pull back during a long pan so both ends remain spatially legible.
			// A straight close-up-to-close-up pan otherwise points at empty space.
			const travel = t.target.distanceTo(target.current)
			const arc = Math.sin(Math.PI * e)
			const fit = Math.max(1, size.height / size.width)
			const length = Math.max(offset.length(), travel * 1.6 * fit * arc)
			offset.y += travel * 0.25 * arc
			if (offset.lengthSq() > 1e-12) offset.setLength(length)
			camera.position.copy(c.target).add(offset)
			if (t.t === 1) {
				tween.current = null
				onSettled()
			}
		} else if (body || located) {
			// Drag changes the orbiting camera, never disables target tracking.
			const movement = target.current.clone().sub(lastTarget.current)
			camera.position.add(movement)
			c.target.add(movement)
		}
		lastTarget.current.copy(target.current)
		c.update()
		const poseOffset = camera.position.clone().sub(c.target)
		previousPose.current = {
			target: c.target.clone(),
			offset: poseOffset,
			halfHeight:
				camera instanceof THREE.OrthographicCamera
					? (camera.top - camera.bottom) / (2 * camera.zoom)
					: (poseOffset.length() * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2))) / camera.zoom,
		}
	}, -0.5)
	return (
		<OrbitControls
			ref={controls}
			makeDefault
			enableDamping={!reducedMotion}
			dampingFactor={0.08}
			enablePan={!focusedId && mode === 'illustrated'}
			minZoom={0.2}
			maxZoom={100}
			onStart={() => {
				tween.current = null
				onSettled()
				onControl()
			}}
		/>
	)
}
