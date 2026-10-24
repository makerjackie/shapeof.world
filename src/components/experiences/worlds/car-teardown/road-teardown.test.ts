import { describe, expect, it } from 'vitest'
import { BRAKE_TEARDOWN, STEERING_TEARDOWN, SUSPENSION_TEARDOWN } from './road-teardown'
import { ROAD_TEARDOWN_SPEC as R, outwardOffset } from './road-teardown-spec'
import {
	BRAKE_GEOMETRY as B,
	SUSPENSION_GEOMETRY as G,
	STEERING_GEOMETRY as T,
	VEHICLE_SPEC as S,
} from './vehicle-spec'

describe('road mechanism disassembly', () => {
	for (const [system, parts] of Object.entries({
		brakes: BRAKE_TEARDOWN,
		steering: STEERING_TEARDOWN,
		chassis: SUSPENSION_TEARDOWN,
	})) {
		it(`${system} has unique bilingual groups, complete cards and finite assembly offsets`, () => {
			expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length)
			const registryIds = parts.flatMap((p) => p.partIds)
			expect(new Set(registryIds).size).toBe(registryIds.length)
			for (const part of parts) {
				for (const field of [part.name, part.description, part.material]) {
					expect(field.zh.length).toBeGreaterThan(0)
					expect(field.en.length).toBeGreaterThan(1)
				}
				expect(part.count).toBeGreaterThan(0)
				expect(part.partIds.length).toBeGreaterThan(0)
				expect(part.data.length).toBeGreaterThan(0)
				expect(part.offset.every(Number.isFinite)).toBe(true)
				expect(part.anchor.every(Number.isFinite)).toBe(true)
			}
		})
	}
	it('mirrors wheel-end extraction so both sides move outward', () => {
		for (const side of [-1, 1]) {
			expect(outwardOffset(R.suspension.tyres, side)[2] * side).toBeGreaterThan(0)
			expect(outwardOffset(R.steering.knuckles, side)[2] * side).toBeGreaterThan(0)
		}
	})
	it('leaves axial clearance between the hub, rim and tyre at full extraction', () => {
		const hubEnd = R.suspension.hubs[2] + G.hubWidth / 2
		const rimStart = R.suspension.rims[2] - S.wheels.width / 2
		const rimEnd = R.suspension.rims[2] + S.wheels.width / 2
		const tyreStart = R.suspension.tyres[2] - S.wheels.width / 2
		expect(rimStart - hubEnd).toBeGreaterThan(0.02)
		expect(tyreStart - rimEnd).toBeGreaterThan(0.02)
	})
	it('separates the four caliper axial layers without crossing the rotating disc', () => {
		for (const spec of [S.brakes.front, S.brakes.rear]) {
			const gap = B.padGap * B.gapMagnification
			const innerCentre = -spec.thickness / 2 - gap - B.padThickness / 2
			const pistonCentre = innerCentre - B.padThickness / 2 - B.pistonLength / 2
			const pistonEnd = pistonCentre + R.brakes.piston[2] + B.pistonLength / 2
			const sealStart = pistonCentre + B.pistonLength * 0.34 + R.brakes.seal[2] - B.sealWire
			const innerEnd = innerCentre + R.brakes.innerPad[2] + B.padThickness / 2
			const rotorStart = R.brakes.disc[2] - B.rotorHatDepth
			const rotorEnd = R.brakes.disc[2] + spec.thickness / 2
			const outerStart = -innerCentre + R.brakes.outerPad[2] - B.padThickness / 2
			expect(sealStart - pistonEnd).toBeGreaterThan(0.02)
			expect(rotorStart - innerEnd).toBeGreaterThan(0.02)
			expect(outerStart - rotorEnd).toBeGreaterThan(0.02)
		}
	})
	it('keeps the subframes at the assembly reference and separates spring and damper lanes', () => {
		expect(SUSPENSION_TEARDOWN.find((p) => p.id === 'susp-subframes')?.offset).toEqual([0, 0, 0])
		expect(R.suspension.springs[1]).toBeGreaterThan(R.suspension.dampers[1])
		expect(R.suspension.dampers[2] - R.suspension.springs[2]).toBeGreaterThan(0.12)
	})
	it('extracts the steering rack clear of its housing at every steering angle', () => {
		// Rack travel is along Z. Its X/Y separation from the housing therefore
		// remains clear even at full lock; use the complete tooth-tip envelope.
		const rackTipRadius = T.rackRadius + T.rackModule * 2.25
		const transverseDistance = Math.hypot(
			R.steering.rack[0] - R.steering.housing[0],
			R.steering.rack[1] - R.steering.housing[1],
		)
		expect(transverseDistance - T.rackHousingRadius - rackTipRadius).toBeGreaterThan(0.02)
		const pinion = STEERING_TEARDOWN.find(({ id }) => id === 'steer-pinion')!
		const housing = STEERING_TEARDOWN.find(({ id }) => id === 'steer-housing')!
		const pinionClearance =
			Math.hypot(
				pinion.anchor[0] + pinion.offset[0] - housing.anchor[0] - housing.offset[0],
				pinion.anchor[1] + pinion.offset[1] - housing.anchor[1] - housing.offset[1],
			) -
			T.rackHousingRadius -
			T.rackModule * (T.pinionTeeth / 2 + 1)
		expect(pinionClearance).toBeGreaterThan(0.02)
	})
})
