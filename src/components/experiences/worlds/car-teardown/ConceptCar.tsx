import {createContext, useContext, useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import * as T from 'three'
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js'
import type {WheelPose} from './Wheels'
import {VEHICLE_SPEC as S} from './vehicle-spec'

export const CarAssetContext = createContext<GLTF | null>(null)
export const useCarAsset = () => useContext(CarAssetContext)
const smooth = (x: number) => {
	const t = T.MathUtils.clamp(x, 0, 1)
	return t * t * (3 - 2 * t)
}
export const layerProgress = (amount: number, start: number) => smooth((amount - start) / (1 - start))

/** Clone materials only: geometry and KTX2 textures stay shared across views. */
export function cloneAsset(scene: T.Group, splitMaterials = false) {
	const result = scene.clone(true)
	const materials = new Map<T.Material, T.Material>()
	result.traverse((o) => {
		if (o instanceof T.Mesh) {
			const clone = (m: T.Material) => {
				if (splitMaterials) return m.clone()
				if (!materials.has(m)) materials.set(m, m.clone())
				return materials.get(m)!
			}
			o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material)
			o.castShadow = true
			o.receiveShadow = true
		}
	})
	return result
}
export function disposeAssetMaterials(scene: T.Group) {
	const seen = new Set<T.Material>()
	scene.traverse((o) => {
		if (o instanceof T.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) seen.add(m)
	})
	seen.forEach((m) => m.dispose())
}
/** The asset's dark teal paint vanishes on the dark stage. A light graphite metallic keeps the body's
 * form readable and leaves amber free for the active part. Only the main paint changes; the lower trim stays dark. */
const STAGE_PAINT = {color: '#8a9199', metalness: 0.88, roughness: 0.3}
function stagePaint(model: T.Object3D) {
	model.traverse((o) => {
		if (!(o instanceof T.Mesh)) return
		for (const m of Array.isArray(o.material) ? o.material : [o.material])
			if (m instanceof T.MeshStandardMaterial && m.name.startsWith('Paint 1')) {
				m.color.set(STAGE_PAINT.color)
				m.metalness = STAGE_PAINT.metalness
				m.roughness = STAGE_PAINT.roughness
			}
	})
}
export function ConceptBody({asset, amount, hood, bodyOnly = false}: {asset: GLTF; amount: number; hood: boolean; bodyOnly?: boolean}) {
	const model = useMemo(() => {
		const clone = cloneAsset(asset.scene)
		stagePaint(clone)
		return clone
	}, [asset])
	useEffect(() => () => disposeAssetMaterials(model), [model])
	useFrame(() => {
		for (const node of model.children) {
			const {kind, bindOrigin = [0, 0, 0]} = node.userData
			node.visible = kind !== 'wheel' && (!bodyOnly || kind === 'body' || kind === 'door' || kind === 'hood' || kind === 'hatch')
			// Remove the canopy glazing only in the inspection view; it overhangs the engine.
			if (hood && /BodyWindshield/.test(node.name)) node.visible = false
			node.position.fromArray(bindOrigin)
			if (kind === 'interior') node.position.y += layerProgress(amount, 0.2) * 0.92
			else if (node.name === 'BodyUnderside') node.position.y += layerProgress(amount, 0.2) * 0.55
			else node.position.y += layerProgress(amount, 0) * 1.85
			if (kind === 'door') node.position.z += Math.sign(new T.Box3().setFromObject(node).getCenter(new T.Vector3()).z) * amount * 0.55
			if (kind === 'hood') node.rotation.z = T.MathUtils.damp(node.rotation.z, hood ? -1.04 : 0, 8, 0.016)
		}
	})
	return <primitive object={model} />
}

export function ConceptWheel({
	asset,
	axle,
	side,
	explode = 0,
	poseRef,
	spinRef,
	rearSpinRef,
}: {
	asset: GLTF
	axle: 'front' | 'rear'
	side: -1 | 1
	explode?: number
	poseRef?: RefObject<WheelPose>
	spinRef?: RefObject<number>
	rearSpinRef?: RefObject<number>
}) {
	const pose = useRef<T.Group>(null),
		spin = useRef<T.Group>(null)
	const key = `Wheel${axle === 'front' ? 'Front' : 'Rear'}${side < 0 ? 'L' : 'R'}`
	const model = useMemo(() => {
		const group = new T.Group()
		for (const node of asset.scene.children) if (node.userData.key === key) group.add(node.clone(true))
		return group
	}, [asset, key])
	const track = axle === 'front' ? S.wheels.frontTrack : S.wheels.rearTrack
	useFrame(() => {
		if (pose.current) {
			pose.current.position.set(
				axle === 'front' ? S.dimensions.frontAxleX : S.dimensions.rearAxleX,
				S.wheels.radius + (poseRef?.current.heave ?? 0),
				side * (track / 2 + explode * 0.56),
			)
			pose.current.rotation.y = poseRef?.current.steer ?? 0
		}
		if (spin.current) spin.current.rotation.z = (spinRef ?? (axle === 'rear' ? rearSpinRef : undefined))?.current ?? 0
	})
	return (
		<group ref={pose}>
			<group ref={spin}>
				<primitive object={model} />
			</group>
		</group>
	)
}
