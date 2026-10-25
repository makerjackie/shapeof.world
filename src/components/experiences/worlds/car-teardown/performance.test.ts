import { batchRigidMeshes } from './rigid-batch'
import { inspectionEvents } from './pointer-events'
import type { RootState, RootStore } from '@react-three/fiber'
import { guardHiddenGroup } from './visibility'
import { describe, it, expect } from 'vitest'
import * as T from 'three'
import { radialGeometry } from './repeated-geometry'
import { framingSamples, explodedAssemblyPoints } from './assembly-framing'

describe('rendering optimizations preserve mechanical geometry', () => {
	it('bakes every repeated tooth with the same vertices and normals', () => {
		const source = new T.BoxGeometry(0.1, 0.2, 0.3),
			original = source.clone()
		const merged = radialGeometry(source, 12, 0.5, 'x')
		expect(merged.getAttribute('position').count).toBe(original.getAttribute('position').count * 12)
		const point = new T.Vector3()
		for (let i = 0; i < 12; i++)
			for (let j = 0; j < original.getAttribute('position').count; j++) {
				const a = (i * Math.PI * 2) / 12
				point
					.fromBufferAttribute(original.getAttribute('position'), j)
					.applyAxisAngle(new T.Vector3(1, 0, 0), a)
					.add(new T.Vector3(0, 0.5 * Math.cos(a), 0.5 * Math.sin(a)))
				expect(
					point.distanceTo(
						new T.Vector3().fromBufferAttribute(
							merged.getAttribute('position'),
							i * original.getAttribute('position').count + j,
						),
					),
				).toBeLessThan(1e-7)
			}
		for (let i = 0; i < 12; i++)
			for (let j = 0; j < original.getAttribute('normal').count; j++) {
				const n = new T.Vector3()
					.fromBufferAttribute(original.getAttribute('normal'), j)
					.applyAxisAngle(new T.Vector3(1, 0, 0), (i * Math.PI * 2) / 12)
				expect(
					n.distanceTo(
						new T.Vector3().fromBufferAttribute(
							merged.getAttribute('normal'),
							i * original.getAttribute('normal').count + j,
						),
					),
				).toBeLessThan(1e-7)
			}
		merged.dispose()
		original.dispose()
	})
	it('bounds camera-fit work and invalidates samples for changed geometry', () => {
		const g = new T.SphereGeometry(1, 128, 64)
		const first = framingSamples(g)
		expect(first).toHaveLength(512)
		expect(framingSamples(g)).toBe(first)
		g.scale(2, 2, 2)
		expect(framingSamples(g)).not.toBe(first)
		expect(Math.max(...framingSamples(g).map((p) => p.length()))).toBeCloseTo(2, 5)
		const scaled = framingSamples(g)
		g.setAttribute('position', g.getAttribute('position').clone())
		expect(framingSamples(g)).not.toBe(scaled)
		g.dispose()
	})
	it('camera fitting includes repeated meshes in their instance positions', () => {
		const g = new T.BoxGeometry(1, 1, 1),
			material = new T.MeshBasicMaterial(),
			mesh = new T.InstancedMesh(g, material, 2)
		mesh.setMatrixAt(0, new T.Matrix4().makeTranslation(-2, 0, 0))
		mesh.setMatrixAt(1, new T.Matrix4().makeTranslation(2, 0, 0))
		const box = new T.Box3().setFromPoints(explodedAssemblyPoints(mesh))
		expect(box.min.x).toBe(-2.5)
		expect(box.max.x).toBe(2.5)
		g.dispose()
		material.dispose()
	})
})

it('hidden view groups skip picking and resume matrices at their current position', () => {
	const group = new T.Group(),
		mesh = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial())
	group.add(mesh)
	guardHiddenGroup(group)
	group.updateMatrixWorld(true)
	const guardedUpdate = group.updateMatrixWorld
	group.userData = { teardownId: 'updated' }
	guardHiddenGroup(group)
	expect(group.updateMatrixWorld).toBe(guardedUpdate)
	group.visible = false
	group.position.x = 3
	group.updateMatrixWorld(true)
	expect(mesh.matrixWorld.elements[12]).toBe(0)
	const ray = new T.Raycaster(new T.Vector3(0, 0, 2), new T.Vector3(0, 0, -1))
	expect(ray.intersectObject(group, true)).toHaveLength(0)
	group.visible = true
	group.updateMatrixWorld(true)
	expect(mesh.matrixWorld.elements[12]).toBe(3)
	ray.ray.origin.x = 3
	expect(ray.intersectObject(group, true).length).toBeGreaterThan(0)
	mesh.geometry.dispose()
	;(mesh.material as T.Material).dispose()
})

it('keeps hover and click picking but gives camera gestures to CameraControls', () => {
	const manager = inspectionEvents({} as RootStore)
	const camera = new T.PerspectiveCamera(34, 1, 0.01, 100)
	const state = {
		camera,
		raycaster: new T.Raycaster(),
		pointer: new T.Vector2(),
		size: { width: 100, height: 100 },
	} as RootState
	const compute = (type: string, buttons: number) =>
		manager.compute({ type, buttons, offsetX: 50, offsetY: 50 } as PointerEvent, state)
	compute('pointerdown', 1)
	compute('pointermove', 0)
	expect(state.raycaster.camera).toBe(camera)
	expect(state.raycaster.params.Line.threshold).toBe(0.004)
	compute('pointermove', 1)
	expect(state.raycaster.camera).toBeNull()
	compute('wheel', 0)
	expect(state.raycaster.camera).toBeNull()
	compute('click', 0)
	expect(state.raycaster.camera).toBe(camera)
	manager.compute({ type: 'pointerdown', offsetX: 20, offsetY: 20 } as PointerEvent, state)
	manager.compute(
		{ type: 'pointermove', buttons: 1, offsetX: 40, offsetY: 20 } as PointerEvent,
		state,
	)
	compute('pointerup', 0)
	expect(state.raycaster.camera).toBeNull()
	compute('click', 0)
	expect(state.raycaster.camera).toBeNull()
	compute('pointerdown', 1)
	compute('click', 0)
	expect(state.raycaster.camera).toBe(camera)
})

it('retains the nearest pickable object without duplicating every X-ray edge', () => {
	const manager = inspectionEvents({} as RootStore)
	const first = new T.LineSegments(),
		second = new T.Mesh()
	const hits = Array.from({ length: 10000 }, (_, i) => ({
		object: i === 1 ? second : first,
		distance: i,
		point: new T.Vector3(),
	}))
	const filtered = manager.filter(hits)
	expect(filtered).toHaveLength(2)
	expect(filtered[0]).toBe(hits[0])
	expect(filtered[1]).toBe(hits[1])
	// A second event must not inherit the previous event's deduplication set.
	expect(manager.filter(hits)).toHaveLength(2)
})

it('batches identical rigid surfaces while preserving part boundaries and glass', () => {
	const root = new T.Group(),
		part = new T.Group()
	part.userData.teardownId = 'one-part'
	root.add(part)
	const material = new T.MeshStandardMaterial({ color: '#87939c' })
	const glass = new T.MeshStandardMaterial({ transparent: true, opacity: 0.2 })
	const meshes = [0, 1, 2, 3].map((i) => {
		const mesh = new T.Mesh(new T.BoxGeometry(1, 1, 1), material.clone())
		mesh.position.set(i, i % 2, 0)
		;(i < 2 ? root : part).add(mesh)
		return mesh
	})
	const window = new T.Mesh(new T.BoxGeometry(1, 1, 1), glass)
	root.add(window)
	root.position.set(10, 2, -3)
	part.position.z = 2
	root.updateMatrixWorld(true)
	const before = new T.Box3().setFromObject(root)
	const restore = batchRigidMeshes(root)
	const visible: T.Mesh[] = []
	root.traverseVisible((o) => {
		if (o instanceof T.Mesh) visible.push(o)
	})
	expect(visible).toHaveLength(3)
	expect(window.visible).toBe(true)
	expect(visible.filter((o) => o.parent === part)).toHaveLength(1)
	root.updateMatrixWorld(true)
	const visibleBounds = new T.Box3()
	visible.forEach((mesh) => visibleBounds.union(new T.Box3().setFromObject(mesh)))
	expect(visibleBounds.min.distanceTo(before.min)).toBeLessThan(1e-7)
	expect(visibleBounds.max.distanceTo(before.max)).toBeLessThan(1e-7)
	const ray = new T.Raycaster(new T.Vector3(10, 2, 5), new T.Vector3(0, 0, -1))
	root.updateMatrixWorld(true)
	expect(ray.intersectObjects(visible).length).toBeGreaterThan(0)
	restore()
	expect(meshes.every((m) => m.visible)).toBe(true)
	expect(root.children).toHaveLength(4)
	for (const mesh of [...meshes, window]) {
		mesh.geometry.dispose()
		;(mesh.material as T.Material).dispose()
	}
	material.dispose()
})
