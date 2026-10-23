import {describe, expect, it} from 'vitest'
import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three'
import {createBoredCasting, createCamLobe, cylinderX, ENGINE_CENTER_X} from './engine-geometry'
import {cycleAngle, valveLift} from './model'
import {VEHICLE_SPEC as S} from './vehicle-spec'
import {ENGINE_GEOMETRY as C} from './vehicle-spec'
import {
	createEngineBlock,
	createCylinderHead,
	createCamCover,
	createOilPan,
	camCoverRoofY,
} from './engine-castings'
import {ENGINE_PARTS, enginePartAnchor, enginePartOffset} from './engine-parts'

const E = S.engine
const G = E.geometry

describe('visible engine geometry follows the mechanical model', () => {
	it('leaves all four bores physically open but retains the walls between them', () => {
		const height = G.deckY - G.blockBottom
		const geometry = createBoredCasting(G.blockLength, G.blockWidth, height, E.bore / 2)
		const material = new MeshBasicMaterial({side: DoubleSide})
		const mesh = new Mesh(geometry, material)
		mesh.updateMatrixWorld()
		for (const cylinder of [1, 2, 3, 4] as const) {
			const ray = new Raycaster(
				new Vector3(cylinderX(cylinder) - ENGINE_CENTER_X, height + 1, 0),
				new Vector3(0, -1, 0),
			)
			expect(ray.intersectObject(mesh)).toHaveLength(0)
		}
		const wall = (cylinderX(1) + cylinderX(2)) / 2 - ENGINE_CENTER_X
		expect(
			new Raycaster(new Vector3(wall, height + 1, 0), new Vector3(0, -1, 0)).intersectObject(mesh)
				.length,
		).toBeGreaterThanOrEqual(2)
		geometry.dispose()
		material.dispose()
	})

	it('puts each inclined valve stem on the centreline of its camshaft', () => {
		const seatToCam = G.valveStemLength + E.timing.camBaseRadius
		expect(G.valveSeatY + seatToCam * Math.cos(G.valveInclination)).toBeCloseTo(G.camY, 12)
		expect(G.valveZOffset + seatToCam * Math.sin(G.valveInclination)).toBeCloseTo(G.camZ, 12)
		expect(2 * G.camZ).toBeGreaterThan(2 * G.camSprocketRadius)
	})

	it('places the actual cam surface at the modelled follower displacement for each phase', () => {
		const material = new MeshBasicMaterial({side: DoubleSide})
		for (const cylinder of [1, 2, 3, 4] as const)
			for (const valve of ['intake', 'exhaust'] as const) {
				const geometry = createCamLobe(cylinder, valve)
				const mesh = new Mesh(geometry, material)
				const side = valve === 'intake' ? -1 : 1
				const contact = Math.PI + side * G.valveInclination
				const direction = new Vector3(0, Math.cos(contact), Math.sin(contact))
				for (let crank = 0; crank < 720; crank += 31) {
					mesh.rotation.x = (crank * Math.PI) / 360
					mesh.updateMatrixWorld()
					const ray = new Raycaster(
						direction.clone().multiplyScalar(0.1),
						direction.clone().negate(),
					)
					const hit = ray.intersectObject(mesh)[0]
					expect(hit).toBeDefined()
					const actualRadius = hit.point.length()
					const expectedRadius =
						E.timing.camBaseRadius + valveLift(cycleAngle(crank, cylinder), valve)
					// Sampled flank plus the 0.313 mm edge bevel permit sub-mm mesh error.
					expect(Math.abs(actualRadius - expectedRadius)).toBeLessThan(0.0005)
				}
				geometry.dispose()
			}
		material.dispose()
	})

	it('sets the rendered TDC gas depth from the same compression ratio as the volume model', () => {
		const tdcCrown = E.crankY + E.crankRadius + E.rodLength + G.pinToCrown
		expect(G.deckY - tdcCrown).toBeCloseTo(E.stroke / (E.compressionRatio - 1), 12)
	})
})

describe('round-two casting cavities and disassembly', () => {
	it('keeps the four actual casting bores open, with real liner walls and water-jacket cavities', () => {
		const geometry = createEngineBlock()
		const material = new MeshBasicMaterial({side: DoubleSide})
		const mesh = new Mesh(geometry, material)
		mesh.updateMatrixWorld()
		for (const cylinder of [1, 2, 3, 4] as const) {
			const x = cylinderX(cylinder)
			expect(
				new Raycaster(new Vector3(x, G.deckY + 0.1, 0), new Vector3(0, -1, 0)).intersectObject(
					mesh,
				),
			).toHaveLength(0)
			expect(
				new Raycaster(
					new Vector3(x, G.deckY + 0.1, E.bore / 2 + C.linerWall / 2),
					new Vector3(0, -1, 0),
				).intersectObject(mesh).length,
			).toBeGreaterThanOrEqual(2)
			const jacketZ = (E.bore / 2 + C.linerWall + C.jacketInnerWidth / 2) / 2
			expect(
				new Raycaster(
					new Vector3(x, G.deckY - C.deckThickness - 0.001, jacketZ),
					new Vector3(0, -1, 0),
				).intersectObject(mesh),
			).toHaveLength(0)
		}
		expect(
			new Raycaster(
				new Vector3(E.cylinder1X + 0.2, E.crankY, 0),
				new Vector3(-1, 0, 0),
			).intersectObject(mesh),
		).toHaveLength(0)
		geometry.dispose()
		material.dispose()
	})

	it('has open side ports through the cylinder-head walls', () => {
		const geometry = createCylinderHead()
		const material = new MeshBasicMaterial({side: DoubleSide})
		const mesh = new Mesh(geometry, material)
		mesh.updateMatrixWorld()
		for (const cylinder of [1, 2, 3, 4] as const)
			for (const side of [-1, 1]) {
				const from = new Vector3(cylinderX(cylinder), C.headPortY, side * (G.headWidth / 2 + 0.03))
				const hit = new Raycaster(from, new Vector3(0, 0, -side)).intersectObject(mesh)[0]
				expect(hit).toBeDefined()
				expect(hit.distance).toBeGreaterThan(0.03 + C.wall)
			}
		geometry.dispose()
		material.dispose()
	})

	it('curves the cover over both cams while retaining four real open plug wells', () => {
		const geometry = createCamCover()
		const material = new MeshBasicMaterial({side: DoubleSide})
		const mesh = new Mesh(geometry, material)
		mesh.updateMatrixWorld()
		for (const cylinder of [1, 2, 3, 4] as const) {
			expect(
				new Raycaster(
					new Vector3(cylinderX(cylinder), 1, 0),
					new Vector3(0, -1, 0),
				).intersectObject(mesh),
			).toHaveLength(0)
			const roof = new Raycaster(
				new Vector3(cylinderX(cylinder), 1, G.camZ),
				new Vector3(0, -1, 0),
			).intersectObject(mesh)[0]
			expect(roof).toBeDefined()
			expect(Math.abs(roof.point.y - camCoverRoofY(G.camZ) - C.wall)).toBeLessThan(0.001)
		}
		geometry.dispose()
		material.dispose()
	})

	it('leaves the oil pan open above its deep collecting sump', () => {
		const geometry = createOilPan()
		const material = new MeshBasicMaterial({side: DoubleSide})
		const mesh = new Mesh(geometry, material)
		mesh.updateMatrixWorld()
		const first = new Raycaster(
			new Vector3(ENGINE_CENTER_X + C.sumpOffsetX, C.skirtBottomY + 0.1, 0),
			new Vector3(0, -1, 0),
		).intersectObject(mesh)[0]
		expect(first).toBeDefined()
		expect(first.point.y).toBeCloseTo(C.skirtBottomY - C.sumpDepth + C.wall, 6)
		geometry.dispose()
		material.dispose()
	})

	it('exposes eighteen complete groups with reversible anchors and independent hardware offsets', () => {
		expect(ENGINE_PARTS).toHaveLength(18)
		expect(new Set(ENGINE_PARTS.map((part) => part.id)).size).toBe(18)
		const ids = ENGINE_PARTS.flatMap((part) => part.partIds)
		expect(new Set(ids).size).toBe(ids.length)
		for (const part of ENGINE_PARTS) {
			expect(enginePartAnchor(part.id, 0)).toEqual(part.anchor)
			expect(enginePartAnchor(part.id, 1)).toEqual(
				part.anchor.map((value, index) => value + part.offset[index]),
			)
			expect(part.name.zh.length).toBeGreaterThan(0)
			expect(part.name.en.length).toBeGreaterThan(0)
		}
		expect(enginePartOffset('crankshaft', 1)).toEqual([0, -0.3, 0])
		expect(enginePartOffset('piston-assemblies', 1)).toEqual([0, 0.3, 0])
		// Even at bottom dead centre, the rod big end clears the block deck.
		expect(
			E.crankY - E.crankRadius - G.rodBigRadius + enginePartOffset('piston-assemblies', 1)[1],
		).toBeGreaterThan(G.deckY)
		expect(enginePartOffset('flywheel', 1)).toEqual([-0.3, 0, 0])
	})
})
