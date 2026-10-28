import {useEffect, useMemo, type RefObject} from 'react'
import * as T from 'three'
import {StudioReflection} from './StudioReflection'
import {StudioShadows} from './StudioShadows'
import {STUDIO_SPEC as G} from './vehicle-spec'

/** Dark stage colours. The far floor resolves exactly to the page/clear colour, so the canvas has no edge. */
export const STAGE = {
	background: '#07090b',
	floor: '#121820',
	/** Lit radius around the car; beyond it the floor fades into the background. */
	lit: 3.2,
	fade: 15,
	poolStrength: 0.55,
	poolOuter: 4.5,
} as const

/** Unlit floor disc: a soft pool under the car fading into the clear colour. Vertex colours are linear. */
export function createStageFloor() {
	const rings = new T.RingGeometry(0.001, STAGE.fade + 1, 128, 48)
	const positions = rings.getAttribute('position')
	const colors = new Float32Array(positions.count * 3)
	const floor = new T.Color(STAGE.floor),
		background = new T.Color(STAGE.background),
		color = new T.Color()
	for (let i = 0; i < positions.count; i++) {
		const r = Math.hypot(positions.getX(i), positions.getY(i))
		const pool = 1 + STAGE.poolStrength * (1 - T.MathUtils.smoothstep(r, 0.4, STAGE.poolOuter))
		color
			.copy(floor)
			.multiplyScalar(pool)
			.lerp(background, T.MathUtils.smoothstep(r, STAGE.lit, STAGE.fade))
		color.toArray(colors, i * 3)
	}
	rings.setAttribute('color', new T.BufferAttribute(colors, 3))
	return rings
}

/** Faint, blurred floor reflection plus contact shadows. Both caches refresh only while something moves. */
export function Studio({
	mobile,
	moving,
	shadowMoving,
	shadowPose,
	revision,
	pose,
}: {
	mobile: boolean
	moving: () => boolean
	shadowMoving: () => boolean
	shadowPose: RefObject<number>
	revision: string
	pose: RefObject<number>
}) {
	const floor = useMemo(createStageFloor, [])
	const fade = useMemo(() => {
		const size = 128,
			data = new Uint8Array(size * size * 4)
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const r = Math.hypot((x / (size - 1) - 0.5) * 2, (y / (size - 1) - 0.5) * 2)
				const a = Math.max(0, Math.min(1, (1 - r) / 0.45))
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
			floor.dispose()
			fade.dispose()
		},
		[floor, fade],
	)
	return (
		<>
			{/* Studio surfaces live on layer 2: the main camera sees them; reflection, shadow capture and picking do not. */}
			<mesh geometry={floor} rotation-x={-Math.PI / 2} position-y={G.floorY} onUpdate={(mesh) => mesh.layers.set(2)}>
				<meshBasicMaterial vertexColors toneMapped={false} depthWrite />
			</mesh>
			<mesh rotation-x={-Math.PI / 2} position-y={G.floorY + 0.002} onUpdate={(mesh) => mesh.layers.set(2)}>
				<planeGeometry args={[G.floorRadius * 2, G.floorRadius * 2]} />
				<StudioReflection
					moving={moving}
					pose={pose}
					revision={revision}
					mobile={mobile}
					onUpdate={(material) => {
						if (material.userData.stageReflection) return
						material.userData.stageReflection = true
						const prepare = material.onBeforeCompile.bind(material)
						material.onBeforeCompile = (shader) => {
							prepare(shader)
							// Only the blurred reflected image is added over the unlit floor; lights never tint the disc.
							shader.fragmentShader = shader.fragmentShader.replace(
								'#include <opaque_fragment>',
								'outgoingLight = clamp(newMerge.rgb, 0.0, 4.0) * 0.16;\n#include <opaque_fragment>',
							)
						}
						material.needsUpdate = true
					}}
					blending={T.AdditiveBlending}
					depthWrite={false}
					transparent
					alphaMap={fade}
					envMapIntensity={0}
					resolution={mobile ? 256 : 512}
					blur={[400, 200]}
					mixBlur={1}
					mixStrength={1}
					roughness={1}
					metalness={0}
					depthScale={0}
					minDepthThreshold={0.4}
					maxDepthThreshold={1.4}
					mirror={0}
				/>
			</mesh>
			<StudioShadows mobile={mobile} moving={shadowMoving} revision={revision} pose={shadowPose} />
		</>
	)
}
