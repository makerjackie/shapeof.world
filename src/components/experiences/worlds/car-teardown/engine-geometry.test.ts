import {describe, expect, it} from 'vitest'
import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three'
import {createBoredCasting, createCamLobe, cylinderX, ENGINE_CENTER_X} from './engine-geometry'
import {cycleAngle, valveLift} from './model'
import {VEHICLE_SPEC as S} from './vehicle-spec'

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
			new Raycaster(new Vector3(wall, height + 1, 0), new Vector3(0, -1, 0)).intersectObject(mesh).length,
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
					const ray = new Raycaster(direction.clone().multiplyScalar(0.1), direction.clone().negate())
					const hit = ray.intersectObject(mesh)[0]
					expect(hit).toBeDefined()
					const actualRadius = hit.point.length()
					const expectedRadius = E.timing.camBaseRadius + valveLift(cycleAngle(crank, cylinder), valve)
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
