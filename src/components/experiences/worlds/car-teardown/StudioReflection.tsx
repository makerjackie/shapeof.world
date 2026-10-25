/** Reflector projection adapted from @react-three/drei (MIT, see DREI-LICENSE.txt).
 * Cache the heavily blurred floor image; paint reflections still use the full
 * environment map every frame. A camera or assembly change refreshes the cache. */
import { useEffect, useMemo, useRef, type ComponentProps, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MeshReflectorMaterial as ReflectorComponent } from '@react-three/drei'
import { MeshReflectorMaterial } from '@react-three/drei/materials/MeshReflectorMaterial'
import { BlurPass } from '@react-three/drei/materials/BlurPass'
import * as T from 'three'

type Props = ComponentProps<typeof ReflectorComponent> & {
	moving: () => boolean
	pose: RefObject<number>
	revision: string
	mobile: boolean
}
export function StudioReflection({
	moving,
	pose,
	revision,
	mobile,
	resolution = 512,
	blur = [500, 250],
	...props
}: Props) {
	const { gl, camera, scene } = useThree()
	const material = useMemo(() => new MeshReflectorMaterial(), [])
	const cache = useMemo(() => {
		const target = new T.WebGLRenderTarget(resolution, resolution, { type: T.HalfFloatType })
		target.depthTexture = new T.DepthTexture(resolution, resolution, T.UnsignedShortType)
		const blurred = new T.WebGLRenderTarget(resolution, resolution, { type: T.HalfFloatType })
		const blurPass = new BlurPass({
			gl,
			resolution,
			width: Array.isArray(blur) ? blur[0] : blur,
			height: Array.isArray(blur) ? blur[1] : blur,
			depthScale: 0,
		})
		return {
			target,
			blurred,
			blurPass,
			plane: new T.Plane(),
			normal: new T.Vector3(),
			position: new T.Vector3(),
			cameraPosition: new T.Vector3(),
			rotation: new T.Matrix4(),
			look: new T.Vector3(),
			clip: new T.Vector4(),
			view: new T.Vector3(),
			aim: new T.Vector3(),
			q: new T.Vector4(),
			texture: new T.Matrix4(),
			virtual: new T.PerspectiveCamera(),
			lastCamera: new T.Matrix4(),
			lastProjection: new T.Matrix4(),
		}
	}, [gl, resolution])
	const last = useRef(-Infinity),
		dirty = useRef(true),
		lastPose = useRef(NaN),
		frame = useRef(0),
		lastFrame = useRef(-2)
	useEffect(() => {
		dirty.current = true
	}, [revision, cache])
	useEffect(
		() => () => {
			cache.target.dispose()
			cache.blurred.dispose()
			cache.blurPass.renderTargetA.dispose()
			cache.blurPass.renderTargetB.dispose()
			cache.blurPass.convolutionMaterial.dispose()
			cache.blurPass.screen.geometry.dispose()
		},
		[cache],
	)
	useEffect(() => () => material.dispose(), [material])
	useFrame(({ clock }) => {
		frame.current++
		const parent = (material as unknown as { __r3f?: { parent?: { object?: T.Mesh } } }).__r3f
			?.parent?.object
		if (!parent) return
		const changed =
			!cache.lastCamera.equals(camera.matrixWorld) ||
			!cache.lastProjection.equals(camera.projectionMatrix)
		if (!dirty.current && !changed && lastPose.current === pose.current && !moving()) return
		// Always leave a main-only frame, even when a slow device is below the cap.
		if (
			frame.current - lastFrame.current < (mobile ? 3 : 2) ||
			clock.elapsedTime - last.current < 1 / (mobile ? 12 : 30)
		)
			return
		lastFrame.current = frame.current
		last.current = clock.elapsedTime
		dirty.current = false
		lastPose.current = pose.current
		cache.lastCamera.copy(camera.matrixWorld)
		cache.lastProjection.copy(camera.projectionMatrix)
		const {
			normal,
			position,
			cameraPosition,
			rotation,
			look,
			clip,
			view,
			aim,
			q,
			texture,
			virtual,
			plane,
		} = cache
		position.setFromMatrixPosition(parent.matrixWorld)
		cameraPosition.setFromMatrixPosition(camera.matrixWorld)
		rotation.extractRotation(parent.matrixWorld)
		normal.set(0, 0, 1).applyMatrix4(rotation)
		view.subVectors(position, cameraPosition)
		if (view.dot(normal) > 0) return
		view.reflect(normal).negate().add(position)
		rotation.extractRotation(camera.matrixWorld)
		look.set(0, 0, -1).applyMatrix4(rotation).add(cameraPosition)
		aim.subVectors(position, look).reflect(normal).negate().add(position)
		virtual.position.copy(view)
		virtual.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal)
		virtual.lookAt(aim)
		virtual.far = camera.far
		virtual.updateMatrixWorld()
		virtual.projectionMatrix.copy(camera.projectionMatrix)
		texture
			.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
			.multiply(virtual.projectionMatrix)
			.multiply(virtual.matrixWorldInverse)
			.multiply(parent.matrixWorld)
		plane.setFromNormalAndCoplanarPoint(normal, position).applyMatrix4(virtual.matrixWorldInverse)
		clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant)
		const m = virtual.projectionMatrix.elements
		q.set(
			(Math.sign(clip.x) + m[8]) / m[0],
			(Math.sign(clip.y) + m[9]) / m[5],
			-1,
			(1 + m[10]) / m[14],
		)
		clip.multiplyScalar(2 / clip.dot(q))
		m[2] = clip.x
		m[6] = clip.y
		m[10] = clip.z + 1
		m[14] = clip.w
		const oldTarget = gl.getRenderTarget(),
			xr = gl.xr.enabled,
			shadow = gl.shadowMap.autoUpdate,
			clear = gl.autoClear
		parent.visible = false
		gl.xr.enabled = false
		gl.shadowMap.autoUpdate = false
		gl.autoClear = true
		gl.setRenderTarget(cache.target)
		gl.state.buffers.depth.setMask(true)
		gl.render(scene, virtual)
		cache.blurPass.render(gl, cache.target, cache.blurred)
		gl.setRenderTarget(oldTarget)
		gl.xr.enabled = xr
		gl.shadowMap.autoUpdate = shadow
		gl.autoClear = clear
		parent.visible = true
	}, 0.6)
	return (
		<primitive
			object={material}
			attach="material"
			textureMatrix={cache.texture}
			tDiffuse={cache.target.texture}
			tDepth={cache.target.depthTexture}
			tDiffuseBlur={cache.blurred.texture}
			hasBlur
			defines-USE_BLUR=""
			{...props}
		/>
	)
}
