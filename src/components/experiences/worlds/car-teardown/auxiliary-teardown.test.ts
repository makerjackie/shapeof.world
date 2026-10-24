import { describe, expect, it } from 'vitest'
import { createGearboxCase } from './transmission-geometry'
import { DRIVETRAIN_TEARDOWN } from './drivetrain-teardown'
import { ELECTRICAL_TEARDOWN } from './electrical-teardown'
import { TRANSMISSION_GEOMETRY as G, VEHICLE_SPEC as S } from './vehicle-spec'

function xBounds(section?: 'front' | 'rear') {
	const geometry = createGearboxCase(section)
	geometry.computeBoundingBox()
	const bounds = [geometry.boundingBox!.min.x, geometry.boundingBox!.max.x]
	geometry.dispose()
	return bounds
}
describe('auxiliary system dismantling', () => {
	it('splits the hollow gearbox along a shared axial seam without changing its assembly envelope', () => {
		const whole = xBounds(),
			front = xBounds('front'),
			rear = xBounds('rear')
		expect(front[0]).toBeCloseTo(rear[1], 6)
		expect(front[1]).toBeCloseTo(whole[1], 6)
		expect(rear[0]).toBeCloseTo(whole[0], 6)
		expect(front[0]).toBeCloseTo((G.caseFrontX + G.caseRearX) / 2, 6)
	})
	it('leaves a visible gap between successive clutch layers and the forward casing', () => {
		const offset = (id: string) => DRIVETRAIN_TEARDOWN.find((part) => part.id === id)!.offset[0]
		const frontCaseEnd = G.inputFrontX + offset('drive-case-front')
		const pressureRear =
			G.clutchDiscX - G.clutchThickness / 2 - G.pressurePlateThickness + offset('drive-pressure')
		const pressureFront = pressureRear + G.pressurePlateThickness
		const discRear = G.clutchDiscX - G.clutchThickness / 2 + offset('drive-disc')
		const flywheelRear = G.inputFrontX + offset('drive-flywheel')
		expect(pressureRear - frontCaseEnd).toBeGreaterThan(0.1)
		expect(discRear - pressureFront).toBeGreaterThan(0.1)
		expect(flywheelRear - (discRear + G.clutchThickness)).toBeGreaterThan(0.1)
	})
	it('extracts the gear rows beyond the maximum tooth envelopes', () => {
		const input = DRIVETRAIN_TEARDOWN.find((part) => part.id === 'drive-input')!,
			lay = DRIVETRAIN_TEARDOWN.find((part) => part.id === 'drive-layshaft')!
		const maxRadius =
			(S.transmission.gearModule * 39) /
				(2 * Math.cos((S.transmission.helixAngle * Math.PI) / 180)) +
			S.transmission.gearModule
		expect(input.offset[1]).toBeGreaterThan(maxRadius * 2)
		expect(Math.abs(lay.offset[1])).toBeGreaterThan(maxRadius * 2)
	})
	it('keeps the electrical harness fixed while removable units are extracted', () => {
		expect(ELECTRICAL_TEARDOWN.find((part) => part.id === 'electrical-harness')!.offset).toEqual([
			0, 0, 0,
		])
		for (const part of ELECTRICAL_TEARDOWN.filter((part) => part.id !== 'electrical-harness'))
			expect(Math.hypot(...part.offset)).toBeGreaterThan(0.25)
	})
	it('provides bilingual metadata and unique grouped identities for both systems', () => {
		const definitions = [...DRIVETRAIN_TEARDOWN, ...ELECTRICAL_TEARDOWN]
		expect(new Set(definitions.map((part) => part.id)).size).toBe(definitions.length)
		for (const part of definitions) {
			for (const copy of [part.name, part.description, part.material]) {
				expect(copy.zh.length).toBeGreaterThan(0)
				expect(copy.en.length).toBeGreaterThan(0)
			}
			expect(part.data.length).toBeGreaterThan(0)
			expect(part.partIds.length).toBeGreaterThan(0)
			expect(part.count).toBeGreaterThan(0)
			expect([...part.offset, ...part.anchor].every(Number.isFinite)).toBe(true)
		}
	})
})
