/** Contact-shadow pass adapted from drei (MIT, see DREI-LICENSE.txt). */
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js'
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js'
import * as T from 'three'
import { STUDIO_SPEC as G } from './vehicle-spec'

export function StudioShadows({
	mobile,
	moving,
	revision,
	pose,
}: {
	mobile: boolean
	moving: () => boolean
	revision: string
	pose: RefObject<number>
}) {
	const group = useRef<T.Group>(null),
		dirty = useRef(true),
		last = useRef(-Infinity),
		lastPose = useRef(NaN),
		frame = useRef(0),
		lastFrame = useRef(-3)
	const { gl, scene } = useThree()
	const resources = useMemo(() => {
		const resolution = mobile ? 256 : 512
		const target = new T.WebGLRenderTarget(resolution, resolution),
			blur = new T.WebGLRenderTarget(resolution, resolution)
		target.texture.generateMipmaps = blur.texture.generateMipmaps = false
		const camera = new T.OrthographicCamera(-6, 6, 6, -6, 0, 4.5)
		camera.position.set(0, G.floorY + 0.004, 0)
		camera.up.set(0, 0, 1)
		camera.lookAt(0, 4, 0)
		camera.updateMatrixWorld()
		const depth = new T.MeshDepthMaterial({ depthTest: false, depthWrite: false })
		depth.onBeforeCompile = (shader) => {
			shader.fragmentShader = shader.fragmentShader.replace(
				'vec4( vec3( 1.0 - fragCoordZ ), opacity );',
				'vec4(0.0, 0.0, 0.0, (1.0 - fragCoordZ));',
			)
		}
		const geometry = new T.PlaneGeometry(12, 12)
		const horizontal = new T.ShaderMaterial(HorizontalBlurShader),
			vertical = new T.ShaderMaterial(VerticalBlurShader)
		horizontal.depthTest = vertical.depthTest = false
		const plane = new T.Mesh(geometry, horizontal)
		plane.rotation.x = Math.PI / 2
		plane.position.copy(camera.position)
		plane.position.y += 0.01
		plane.updateMatrixWorld()
		return { target, blur, camera, depth, geometry, horizontal, vertical, plane }
	}, [mobile])
	useEffect(() => {
		dirty.current = true
	}, [revision, resources])
	useEffect(
		() => () => {
			for (const r of [
				resources.target,
				resources.blur,
				resources.depth,
				resources.geometry,
				resources.horizontal,
				resources.vertical,
			])
				r.dispose()
		},
		[resources],
	)
	useFrame(({ clock }) => {
		frame.current++
		if (
			!group.current ||
			(!dirty.current && lastPose.current === pose.current && !moving()) ||
			frame.current - lastFrame.current < (mobile ? 6 : 3) ||
			clock.elapsedTime - last.current < (mobile ? 0.2 : 0.1)
		)
			return
		lastFrame.current = frame.current
		dirty.current = false
		last.current = clock.elapsedTime
		lastPose.current = pose.current
		const r = resources,
			oldTarget = gl.getRenderTarget(),
			background = scene.background,
			override = scene.overrideMaterial,
			clear = gl.autoClear
		group.current.visible = false
		scene.background = null
		scene.overrideMaterial = r.depth
		gl.autoClear = true
		gl.setRenderTarget(r.target)
		gl.render(scene, r.camera)
		const blur = (amount: number) => {
			r.plane.material = r.horizontal
			r.horizontal.uniforms.tDiffuse.value = r.target.texture
			r.horizontal.uniforms.h.value = amount / 256
			gl.setRenderTarget(r.blur)
			gl.render(r.plane, r.camera)
			r.plane.material = r.vertical
			r.vertical.uniforms.tDiffuse.value = r.blur.texture
			r.vertical.uniforms.v.value = amount / 256
			gl.setRenderTarget(r.target)
			gl.render(r.plane, r.camera)
		}
		blur(2.8)
		blur(2.8 * 0.4)
		gl.setRenderTarget(oldTarget)
		scene.background = background
		scene.overrideMaterial = override
		gl.autoClear = clear
		group.current.visible = true
	}, 0.7)
	return (
		<group ref={group}>
			<mesh position={[0, G.floorY + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, -1, 1]}>
				<planeGeometry args={[12, 12]} />
				<meshBasicMaterial
					map={resources.target.texture}
					transparent
					opacity={0.72}
					depthWrite={false}
				/>
			</mesh>
		</group>
	)
}
