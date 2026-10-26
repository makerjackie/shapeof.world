import {describe, expect, it} from 'vitest'
import {finalDriveRatio, gearRatio, vehicleSpeedKmh} from './model'
import {
	advanceTransmission,
	createTransmissionState,
	freeGearAngle,
	freeGearRpm,
	FREE_GEARS,
	shiftState,
	sleevePositions,
	transmissionPowerPath,
} from './transmission-model'
import {TRANSMISSION_GEOMETRY as G, VEHICLE_SPEC as S, type Gear} from './vehicle-spec'

const run = (gear: Gear, seconds = 1) =>
	advanceTransmission(createTransmissionState(gear), {
		dt: seconds,
		rpm: 3000,
		slowdown: 100,
		requestedGear: gear,
	})

describe('three-shaft constant-mesh transmission', () => {
	it('spins every loose gear in neutral while holding the unloaded output stationary', () => {
		const state = run('N')
		expect(state.inputAngle).toBeCloseTo(Math.PI, 12)
		expect(state.layshaftAngle).toBeCloseTo((-Math.PI * 22) / 32, 12)
		expect(state.outputAngle).toBe(0)
		expect(state.wheelAngle).toBe(0)
		expect(state.outputRpm).toBe(0)
		for (const gear of FREE_GEARS) {
			expect(Math.abs(freeGearAngle(state.inputAngle, gear))).toBeGreaterThan(0)
			expect(freeGearRpm(3000, gear)).toBeCloseTo(3000 / gearRatio(gear)!, 10)
		}
		expect(freeGearAngle(state.inputAngle, 'R')).toBeLessThan(0)
	})
	it('locks each selected ratio to the output and synchronizes the rear wheels', () => {
		for (const gear of [1, 2, 3, 4, 5, 'R'] as const) {
			const state = run(gear)
			expect(state.outputAngle).toBeCloseTo(state.inputAngle / gearRatio(gear)!, 12)
			expect(state.outputRpm).toBeCloseTo(3000 / gearRatio(gear)!, 10)
			expect(state.wheelAngle).toBeCloseTo(state.outputAngle / finalDriveRatio(), 12)
			expect(state.speedKmh).toBeCloseTo(vehicleSpeedKmh(3000, gear)!, 10)
		}
		expect(run(4).outputAngle).toBeCloseTo(run(4).inputAngle, 12)
		expect(run('R').wheelAngle).toBeLessThan(0)
		expect(run(4).speedKmh).toBeCloseTo(116.444713, 4)
	})
	it('distinguishes real RPM and speed readings from the slowed animation', () => {
		const a = run(2)
		const b = advanceTransmission(createTransmissionState(2), {
			dt: 1,
			rpm: 3000,
			slowdown: 400,
			requestedGear: 2,
		})
		expect(b.outputAngle).toBeCloseTo(a.outputAngle / 4, 12)
		expect(b.outputRpm).toBe(a.outputRpm)
		expect(b.speedKmh).toBe(a.speedKmh)
	})
	it('has no overlapping sleeve engagement and opens the clutch before shifting', () => {
		const gears: Gear[] = ['N', 1, 2, 3, 4, 5, 'R']
		for (const from of gears)
			for (const to of gears) {
				for (let i = 0; i <= 100; i++) {
					const p = i / 100,
						state = shiftState(from, to, p * G.shiftDuration)
					expect(Object.values(state.sleevePositions).filter((x) => Math.abs(x) > 1e-10).length).toBeLessThanOrEqual(1)
					if (p >= G.shiftStages.neutral && p <= G.shiftStages.select) {
						expect(Object.values(state.sleevePositions).every((x) => x === 0)).toBe(true)
						expect(state.gear).toBe('N')
					}
					if (p >= G.shiftStages.clutchOpen && p <= G.shiftStages.engaged) expect(state.clutchEngagement).toBe(0)
				}
				expect(shiftState(from, to, G.shiftDuration).sleevePositions).toEqual(sleevePositions(to))
			}
	})
	it('finishes the compound motion in 0.5 screen seconds at every slowdown', () => {
		for (const slowdown of S.engine.slowdownOptions) {
			const a = advanceTransmission(createTransmissionState(1), {
				dt: 0.25,
				rpm: 2500,
				slowdown,
				requestedGear: 5,
			})
			expect(a.shiftProgress).toBe(0.5)
			expect(a.gear).toBe('N')
			const b = advanceTransmission(a, {dt: 0.25, rpm: 2500, slowdown, requestedGear: 5})
			expect(b.gear).toBe(5)
			expect(b.shiftPhase).toBe('steady')
			expect(b.clutchEngagement).toBe(1)
		}
	})
	it('integrates transitions without frame-rate-dependent rotation or angle jumps', () => {
		const input = {rpm: 3000, slowdown: 100, requestedGear: 3 as Gear}
		const one = advanceTransmission(createTransmissionState(1), {...input, dt: 1})
		let many = createTransmissionState(1)
		for (let i = 0; i < 240; i++) many = advanceTransmission(many, {...input, dt: 1 / 240})
		expect(many.outputAngle).toBeCloseTo(one.outputAngle, 10)
		expect(many.inputAngle).toBeCloseTo(one.inputAngle, 10)
		let previous = createTransmissionState(5)
		for (let i = 0; i < 100; i++) {
			const next = advanceTransmission(previous, {
				dt: 0.01,
				rpm: 3000,
				slowdown: 100,
				requestedGear: 'R',
			})
			expect(Math.abs(next.outputAngle - previous.outputAngle)).toBeLessThan(0.041)
			previous = next
		}
	})
	it('queues a new request until the current sleeve has finished, and freezes on pause', () => {
		let state = advanceTransmission(createTransmissionState(1), {
			dt: 0.2,
			rpm: 3000,
			slowdown: 100,
			requestedGear: 2,
		})
		state = advanceTransmission(state, {dt: 0.2, rpm: 3000, slowdown: 100, requestedGear: 5})
		expect(state.targetGear).toBe(2)
		expect(state.requestedGear).toBe(5)
		const frozen = advanceTransmission(state, {
			dt: 2,
			rpm: 3000,
			slowdown: 100,
			requestedGear: 5,
			paused: true,
		})
		expect(frozen.inputAngle).toBe(state.inputAngle)
		expect(frozen.outputAngle).toBe(state.outputAngle)
		expect(frozen.shiftElapsed).toBe(state.shiftElapsed)
		state = advanceTransmission(frozen, {dt: 0.6, rpm: 3000, slowdown: 100, requestedGear: 5})
		expect(state.gear).toBe(5)
		expect(state.shiftProgress).toBe(1)
	})
	it('highlights only the engaged route, including direct fourth and the reversing idler', () => {
		expect(transmissionPowerPath(run('N')).size).toBe(0)
		const direct = transmissionPowerPath(run(4))
		expect(direct.has('gearbox-output-shaft')).toBe(true)
		expect(direct.has('gearbox-layshaft')).toBe(false)
		const reverse = transmissionPowerPath(run('R'))
		expect(reverse.has('gearbox-reverse-idler')).toBe(true)
		expect(reverse.has('gearbox-free-R')).toBe(true)
		expect(reverse.has('gearbox-free-1')).toBe(false)
	})
})
