import { describe, expect, it } from 'vitest'
import * as T from 'three'
import { assemblyFrame, explodedAssemblyBounds, explodedAssemblyPoints } from './assembly-framing'
import { ASSEMBLIES, assemblyParts } from './subassemblies'
import {
	VEHICLE_SPEC as S,
	BRAKE_GEOMETRY as B,
	TRANSMISSION_GEOMETRY as G,
	STEERING_GEOMETRY as R,
	AUXILIARY_TEARDOWN_GEOMETRY as A,
} from './vehicle-spec'

describe('compact teardown views', () => {
	for (const assembly of ASSEMBLIES) {
		it(`${assembly.id}: complete bilingual inventory, bounded extraction and perspective fit`, () => {
			const parts = assemblyParts(assembly)
			expect(parts.length).toBeGreaterThan(1)
			expect(parts.length).toBeLessThanOrEqual(15)
			expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length)
			for (const part of parts) {
				expect(part.name.zh).toBeTruthy()
				expect(part.name.en).toBeTruthy()
				expect(part.count).toBeGreaterThan(0)
				expect(new T.Vector3(...part.offset).length()).toBeLessThan(assembly.size * 1.7)
			}
			// A synthetic solid occupies the natural size in each axis. This includes
			// corners nearer the lens; fitting only width at the centre would clip them.
			const box = new T.Box3(
				new T.Vector3(-0.5, -0.4, -0.3).multiplyScalar(assembly.size),
				new T.Vector3(0.5, 0.4, 0.3).multiplyScalar(assembly.size),
			)
			for (const part of parts) box.expandByPoint(new T.Vector3(...part.offset))
			for (const mobile of [false, true]) {
				const aspect = mobile ? 390 / 844 : 1.6,
					fov = mobile ? 56 : 34,
					frame = assemblyFrame(box, assembly.view, aspect, fov, mobile)
				expect(frame.distance).toBeGreaterThan(assembly.size * 0.5)
				expect(frame.distance).toBeLessThan(assembly.size * 12)
				const camera = new T.PerspectiveCamera(fov, aspect, 0.01, 100)
				camera.position.copy(frame.position)
				camera.lookAt(frame.center)
				camera.updateMatrixWorld()
				for (const x of [box.min.x, box.max.x])
					for (const y of [box.min.y, box.max.y])
						for (const z of [box.min.z, box.max.z]) {
							const p = new T.Vector3(x, y, z).project(camera)
							expect(Math.abs(p.x)).toBeLessThanOrEqual(frame.widthFraction)
							expect(Math.abs(p.y)).toBeLessThanOrEqual(frame.heightFraction)
							expect(p.z).toBeLessThan(1)
						}
			}
		})
	}
	it('fits final extraction even halfway through the slider, ignoring hidden systems and harness', () => {
		const root = new T.Group(),
			piece = new T.Group()
		piece.position.x = 1
		piece.userData = { teardownId: 'test', extraction: [2, 0, 0], extractionAmount: 0.5 }
		piece.add(new T.Mesh(new T.BoxGeometry(1, 1, 1)))
		root.add(piece)
		const background = new T.Mesh(new T.BoxGeometry(100, 100, 100))
		background.userData.excludeFromFit = true
		root.add(background)
		const hidden = new T.Mesh(new T.BoxGeometry(100, 100, 100))
		hidden.visible = false
		root.add(hidden)
		const box = explodedAssemblyBounds(root)
		expect(box.min.x).toBeCloseTo(1.5)
		expect(box.max.x).toBeCloseTo(2.5)
		expect(box.getSize(new T.Vector3()).length()).toBeCloseTo(Math.sqrt(3))
	})
	for (const front of [true, false])
		it(`${front ? 'front' : 'rear'} brake: both friction pads clear their disc in the exploded lane`, () => {
			const a = ASSEMBLIES.find((a) => a.id === (front ? 'brake-front' : 'brake-rear'))!,
				spec = front ? S.brakes.front : S.brakes.rear
			const parts = assemblyParts(a),
				shift = (id: string) => parts.find((p) => p.id === id)!.offset[2]
			const innerZ = -spec.thickness / 2 - B.padGap * B.gapMagnification - B.padThickness / 2
			const discMin = shift('brake-discs') - spec.thickness / 2,
				discMax = shift('brake-discs') + spec.thickness / 2
			expect(discMin - (innerZ + shift('brake-pads') + B.padThickness / 2)).toBeGreaterThan(0.02)
			expect(-innerZ + a.size * 0.76 - B.padThickness / 2 - discMax).toBeGreaterThan(0.02)
		})
})

it('does not zoom out just because a circular rotor has rotated inside its old bounding box', () => {
	const root = new T.Group(),
		part = new T.Group(),
		mesh = new T.Mesh(new T.CircleGeometry(1, 128))
	part.userData = { teardownId: 'rotor', extraction: [0, 0, 0], extractionAmount: 1 }
	part.add(mesh)
	root.add(part)
	const distances = [0, Math.PI / 4].map((angle) => {
		mesh.rotation.z = angle
		const points = explodedAssemblyPoints(root),
			box = new T.Box3().setFromPoints(points)
		return assemblyFrame(box, [1, 0.65, 1.5], 1.6, 34, false, points).distance
	})
	expect(Math.abs(distances[0] - distances[1]) / distances[0]).toBeLessThan(0.005)
	mesh.geometry.dispose()
})

it('keeps major extraction lanes clear across the other subassemblies', () => {
	const lane = (assembly: string, id: string) =>
		assemblyParts(ASSEMBLIES.find((a) => a.id === assembly)!).find((p) => p.id === id)!.offset
	const gap = (a: string, outer: string, inner: string, axis: number) =>
		lane(a, outer)[axis] - lane(a, inner)[axis]
	expect(gap('gearbox', 'drive-flywheel', 'drive-disc', 0)).toBeGreaterThan(
		(S.engine.geometry.flywheelThickness + G.clutchThickness) / 2,
	)
	expect(gap('gearbox', 'drive-disc', 'drive-pressure', 0)).toBeGreaterThan(
		(G.clutchThickness + G.pressurePlateThickness) / 2,
	)
	expect(gap('hydraulics', 'brake-master', 'brake-booster', 0)).toBeGreaterThan(0.05)
	expect(gap('rack', 'steer-rackbar', 'steer-housing', 1)).toBeGreaterThan(
		R.rackHousingRadius + R.rackRadius,
	)
	for (const a of ['susp-front', 'susp-rear'])
		expect(Math.abs(gap(a, 'susp-dampers', 'susp-springs', 0))).toBeGreaterThan(0.1)
	expect(lane('propshaft', 'drive-joints')[0]).toBeGreaterThan(G.jointLength)
	expect(A.electrical.flatColumnSpacing).toBeGreaterThan(A.electrical.lampSize[2] * 2)
	expect(
		A.electrical.flatRowSpacing - A.electrical.flatLampSpacing * 2 - A.electrical.lampSize[2],
	).toBeGreaterThan(0.05)
})
