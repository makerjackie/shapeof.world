import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GALACTIC_DIRECTION } from '../orbital-model'

const STAR_LAYERS = [
	{ count: 2200, span: 40000, near: 6000, depth: 10000, speed: 0.16, brightness: 0.48 },
	{ count: 800, span: 18000, near: 1500, depth: 4000, speed: 0.65, brightness: 0.62 },
	{ count: 120, span: 10000, near: 300, depth: 1500, speed: 1.2, brightness: 0.55 },
] as const

/** Original artistic star layers, not measured stars. Pause and rewind share the orbital clock. */
export function GalacticDrift({
	simDaysRef,
	blendRef,
}: {
	simDaysRef: React.MutableRefObject<number>
	blendRef: React.MutableRefObject<number>
}) {
	const { gl } = useThree()
	const backdrop = useRef<THREE.Group>(null)
	const direction = useMemo(() => new THREE.Vector3(), [])
	const rotation = useMemo(() => new THREE.Quaternion(), [])
	const previous = useRef(simDaysRef.current)
	const layers = useMemo(() => {
		let seed = 271828
		const random = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
			return seed / 4294967296
		}
		return STAR_LAYERS.map((settings) => {
			const positions = new Float32Array(settings.count * 3)
			const colors = new Float32Array(settings.count * 3)
			const sizes = new Float32Array(settings.count)
			for (let i = 0; i < settings.count; i++) {
				positions.set(
					[(random() - 0.5) * settings.span, (random() - 0.5) * settings.span, -settings.near - random() * settings.depth],
					i * 3,
				)
				const tint = new THREE.Color(random() < 0.2 ? '#eed8ba' : '#b8d1e9')
				tint.multiplyScalar(0.5 + random() * 0.5)
				colors.set([tint.r, tint.g, tint.b], i * 3)
				sizes[i] = 2 + random() * 3.5
			}
			const geometry = new THREE.BufferGeometry()
			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
			geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
			geometry.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1))
			const material = new THREE.ShaderMaterial({
				transparent: true,
				depthWrite: false,
				depthTest: false,
				vertexColors: true,
				uniforms: { uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
				vertexShader: `
          attribute float starSize;
          varying vec3 vTint;
          uniform float uPixelRatio;
          void main() {
            vTint = color;
            vec4 p = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * p;
            gl_Position.z = gl_Position.w * 0.999998;
            gl_PointSize = clamp(starSize * 1800.0 / max(1.0, -p.z), 1.0, 3.6) * uPixelRatio;
          }
        `,
				fragmentShader: `
          varying vec3 vTint;
          uniform float uOpacity;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            if (r > 1.0) discard;
            float light = exp(-r * r * 4.0) * 0.65 + exp(-r * r * 30.0) * 0.35;
            gl_FragColor = vec4(vTint, light * uOpacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
			})
			const points = new THREE.Points(geometry, material)
			points.frustumCulled = false
			points.renderOrder = -80
			return { ...settings, positions, geometry, material, points }
		})
	}, [])
	useEffect(
		() => () =>
			layers.forEach(({ geometry, material }) => {
				geometry.dispose()
				material.dispose()
			}),
		[layers],
	)
	useFrame(({ camera }) => {
		backdrop.current?.position.copy(camera.position)
		backdrop.current?.quaternion.copy(camera.quaternion)
		direction.set(...GALACTIC_DIRECTION).applyQuaternion(rotation.copy(camera.quaternion).invert())
		const elapsed = simDaysRef.current - previous.current
		previous.current = simDaysRef.current
		for (const layer of layers) {
			layer.material.uniforms.uOpacity.value = blendRef.current * layer.brightness
			layer.material.uniforms.uPixelRatio.value = gl.getPixelRatio()
			// A reset changes the epoch, not the star placement.
			if (blendRef.current < 0.001 || elapsed === 0 || Math.abs(elapsed) > 1000) continue
			const half = layer.span / 2
			for (let i = 0; i < layer.positions.length; i += 3) {
				for (let axis = 0; axis < 2; axis++) {
					const next = layer.positions[i + axis] - direction.getComponent(axis) * elapsed * layer.speed * blendRef.current
					layer.positions[i + axis] = ((((next + half) % layer.span) + layer.span) % layer.span) - half
				}
			}
			layer.geometry.attributes.position.needsUpdate = true
		}
	})
	return (
		<group ref={backdrop}>
			{layers.map((layer, i) => (
				<primitive key={i} object={layer.points} />
			))}
		</group>
	)
}
