import {useMemo, useEffect, useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {ContactShadows, Environment, Lightformer, MeshReflectorMaterial} from '@react-three/drei'
import * as T from 'three'
import {STUDIO_SPEC as G, VEHICLE_SPEC as S} from './vehicle-spec'

/** A continuous surface of revolution: floor, quarter-circle cove, wall, dome. */
export function createStudioGeometry() {
	const p = [new T.Vector2(0, G.floorY), new T.Vector2(G.floorRadius, G.floorY)]
	for (let i = 1; i <= 64; i++) {
		const a = ((i / 64) * Math.PI) / 2
		p.push(
			new T.Vector2(
				G.floorRadius + G.coveRadius * Math.sin(a),
				G.floorY + G.coveRadius * (1 - Math.cos(a)),
			),
		)
	}
	p.push(new T.Vector2(G.floorRadius + G.coveRadius, G.wallHeight))
	for (let i = 1; i <= 64; i++) {
		const a = ((i / 64) * Math.PI) / 2
		p.push(
			new T.Vector2(
				(G.floorRadius + G.coveRadius) * Math.cos(a),
				G.wallHeight + (G.floorRadius + G.coveRadius) * Math.sin(a),
			),
		)
	}
	const geometry = new T.LatheGeometry(p, 128)
	const positions = geometry.getAttribute('position')
	const colors = new Float32Array(positions.count * 3)
	const floor = new T.Color(G.color),
		wall = new T.Color(G.wallColor),
		color = new T.Color()
	for (let i = 0; i < positions.count; i++) {
		const radius = Math.hypot(positions.getX(i), positions.getZ(i))
		color
			.copy(floor)
			.lerp(wall, T.MathUtils.smoothstep(radius + positions.getY(i) * 0.2, 2, 12))
			.multiplyScalar(3.2)
		color.toArray(colors, i * 3)
	}
	geometry.setAttribute('color', new T.BufferAttribute(colors, 3))
	return geometry
}
export function Studio({mobile}: {mobile: boolean}) {
	const autoClear = useRef(false)
	// Composer owns the main render at priority 1 and disables automatic clears.
	// Drei's priority-0 contact-shadow/blur passes rely on fresh transparent targets.
	// Restore that behavior only for the offscreen passes, then restore composer state.
	useFrame(({gl}) => {
		autoClear.current = gl.autoClear
		gl.autoClear = true
	}, -1)
	useFrame(({gl}) => {
		gl.autoClear = autoClear.current
	}, 0.5)
	const bowl = useMemo(createStudioGeometry, [])
	const fade = useMemo(() => {
		const size = 128,
			data = new Uint8Array(size * size * 4)
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const r = Math.hypot((x / (size - 1) - 0.5) * 2, (y / (size - 1) - 0.5) * 2)
				const a = Math.max(0, Math.min(1, (1 - r) / 0.3))
				const i = (y * size + x) * 4
				data[i] = data[i + 1] = data[i + 2] = Math.round(a * a * (3 - 2 * a) * 255)
				data[i + 3] = 255
			}
		const texture = new T.DataTexture(data, size, size)
		texture.needsUpdate = true
		return texture
	}, [])
	useEffect(
		() => () => {
			bowl.dispose()
			fade.dispose()
		},
		[bowl, fade],
	)
	return (
		<>
			<ambientLight intensity={0.26} />
			<directionalLight position={[0, 3, 6]} intensity={0.65} color="#dce7f4" />
			<directionalLight
				position={[...G.keyPosition]}
				intensity={1.6}
				color={S.materials.keyLight}
				shadow-mapSize={[1024, 1024]}
				shadow-camera-left={-5}
				shadow-camera-right={5}
				shadow-camera-top={5}
				shadow-camera-bottom={-5}
				shadow-bias={-0.0003}
			/>
			<directionalLight
				position={[...G.rimPosition]}
				intensity={1.2}
				color={S.materials.rimLight}
			/>
			<Environment resolution={mobile ? 256 : 512} frames={1}>
				<Lightformer
					form="rect"
					intensity={5}
					color={S.materials.keyLight}
					position={[0, G.softboxY, 0]}
					rotation={[Math.PI / 2, 0, 0]}
					scale={[...G.softboxSize]}
				/>
				{[-1, 1].flatMap((side) =>
					G.stripHeights.map((height, i) => (
						<Lightformer
							key={`${side}-${i}`}
							form="rect"
							intensity={i === 0 ? 6 : 5}
							color={side === 1 ? S.materials.keyLight : S.materials.rimLight}
							position={[0, height, side * G.stripDistance]}
							rotation={[0, side === 1 ? Math.PI : 0, 0]}
							scale={[...G.stripSize]}
						/>
					)),
				)}
				<Lightformer
					form="rect"
					intensity={3}
					color={S.materials.rimLight}
					position={[...G.rimPanelPosition]}
					rotation={[0, Math.PI / 2, 0]}
					scale={[...G.rimPanelSize]}
				/>
				<Lightformer
					form="rect"
					intensity={1.5}
					position={[...G.frontPanelPosition]}
					rotation={[0, -Math.PI / 2, 0]}
					scale={[...G.frontPanelSize]}
				/>
			</Environment>
			<mesh geometry={bowl} receiveShadow onUpdate={(mesh) => mesh.layers.set(2)}>
				<meshBasicMaterial vertexColors toneMapped={false} side={T.DoubleSide} />
			</mesh>
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, G.floorY + 0.002, 0]}
				receiveShadow
				onUpdate={(mesh) => mesh.layers.set(2)}>
				<planeGeometry args={[G.floorRadius * 2, G.floorRadius * 2]} />
				<MeshReflectorMaterial
					onUpdate={(material) => {
						if (material.userData.charcoalReflection) return
						material.userData.charcoalReflection = true
						const prepare = material.onBeforeCompile.bind(material)
						const floor = new T.Color(G.color).multiplyScalar(3.2)
						material.onBeforeCompile = (shader) => {
							prepare(shader)
							// Keep the cove and floor at the same charcoal exposure. Only the
							// blurred reflected image is added; direct lights cannot tint a disc.
							shader.fragmentShader = shader.fragmentShader.replace(
								'#include <opaque_fragment>',
								`outgoingLight = vec3(${floor.r}, ${floor.g}, ${floor.b}) + clamp(newMerge.rgb, 0.0, 8.0) * 0.012;\n#include <opaque_fragment>`,
							)
						}
						material.needsUpdate = true
					}}
					color={G.color}
					// The alpha-faded overlay must not write an opaque rectangle into N8AO depth.
					depthWrite={false}
					transparent
					alphaMap={fade}
					envMapIntensity={0}
					resolution={mobile ? 256 : 512}
					blur={[500, 250]}
					mixBlur={1}
					mixStrength={2.4}
					roughness={1}
					metalness={0}
					depthScale={0}
					minDepthThreshold={0.4}
					maxDepthThreshold={1.4}
					mirror={0.35}
				/>
			</mesh>
			<ContactShadows
				position={[0, G.floorY + 0.004, 0]}
				opacity={0.6}
				scale={12}
				blur={2.8}
				far={4.5}
				resolution={mobile ? 256 : 512}
				color="#000000"
				frames={Infinity}
			/>
		</>
	)
}
