import * as T from 'three'
import { mergeOwned } from './repeated-geometry'

/** Only for authored rigid subassemblies. Keep transparent/custom-shader meshes
 * and part boundaries separate. No vertex reduction and no material averaging. */
export function batchRigidMeshes(root: T.Group) {
	root.updateWorldMatrix(true, true)
	const restore: (() => void)[] = []
	const batch = (scope: T.Object3D) => {
		const inverse = scope.matrixWorld.clone().invert()
		const buckets = new Map<string, T.Mesh[]>()
		const visit = (object: T.Object3D) => {
			if (!object.visible) return
			if (object !== scope && object.userData.teardownId) {
				batch(object)
				return
			}
			if (object instanceof T.Mesh && !(object instanceof T.InstancedMesh)) {
				const m = object.material
				if (
					!Array.isArray(m) &&
					!m.transparent &&
					!object.customDepthMaterial &&
					m.onBeforeCompile === T.Material.prototype.onBeforeCompile &&
					object.geometry.drawRange.count === Infinity
				) {
					const { uuid: _uuid, metadata: _metadata, ...properties } = m.toJSON()
					const key = JSON.stringify([
						properties,
						Object.keys(object.geometry.attributes).sort(),
						object.castShadow,
						object.receiveShadow,
						object.layers.mask,
						object.renderOrder,
					])
					const meshes = buckets.get(key) ?? []
					meshes.push(object)
					buckets.set(key, meshes)
				}
			}
			object.children.forEach(visit)
		}
		visit(scope)
		for (const meshes of buckets.values()) {
			if (meshes.length < 2) continue
			const pieces = meshes.map((mesh) => {
				const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
				return geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
			})
			const first = meshes[0],
				geometry = mergeOwned(pieces)
			const merged = new T.Mesh(geometry, first.material)
			merged.castShadow = first.castShadow
			merged.receiveShadow = first.receiveShadow
			merged.layers.mask = first.layers.mask
			merged.renderOrder = first.renderOrder
			merged.name = 'Rigid surface batch'
			scope.add(merged)
			const originals = meshes.map((mesh) => ({
				mesh,
				raycast: mesh.raycast,
				update: mesh.updateMatrixWorld,
			}))
			originals.forEach(({ mesh }) => {
				mesh.visible = false
				mesh.raycast = () => {}
				mesh.updateMatrixWorld = () => {}
			})
			restore.push(() => {
				scope.remove(merged)
				geometry.dispose()
				originals.forEach(({ mesh, raycast, update }) => {
					mesh.visible = true
					mesh.raycast = raycast
					mesh.updateMatrixWorld = update
				})
			})
		}
	}
	batch(root)
	return () => restore.forEach((fn) => fn())
}
