import {describe, expect, it} from 'vitest'
import {advanceBrake, brakeForces, caliperTravel, createBrakeState} from './brake-model'
import {BRAKE_GEOMETRY as B, VEHICLE_SPEC as S} from './vehicle-spec'

const step = {dt: 0.1, slowdown: 1, paused: false, pedalForceN: 0, speedKmh: 40, restartToken: 0}

describe('floating-caliper hydraulic chain', () => {
	it('converts 300 N through the pedal and booster to about 94 bar', () => {
		const result = brakeForces(300)
		expect(result.pressureBar).toBeCloseTo(94.4, 0)
		expect(result.pressureBar * 100000).toBeCloseTo(
			(300 * 3.5 * 4) / ((Math.PI * 0.0238 ** 2) / 4),
			6,
		)
	})
	it('uses the specified piston areas at both axles and includes both pads in torque', () => {
		const result = brakeForces(300),
			pressure = result.pressureBar * 100000
		expect(result.frontClampN).toBeCloseTo((pressure * Math.PI * 0.057 ** 2) / 4, 6)
		expect(result.rearClampN).toBeCloseTo((pressure * Math.PI * 0.038 ** 2) / 4, 6)
		expect(result.frontTorqueNm).toBeCloseTo(2 * 0.4 * result.frontClampN * 0.13, 6)
		expect(result.rearTorqueNm).toBeCloseTo(2 * 0.4 * result.rearClampN * 0.12, 6)
		expect(result.totalTorqueNm).toBeCloseTo(2 * (result.frontTorqueNm + result.rearTorqueNm), 6)
	})
	it('caps road deceleration at 1 g and shows the adhesion limit as ABS', () => {
		const result = brakeForces(300)
		expect(result.uncappedDecelerationMps2).toBeGreaterThan(B.gravity)
		expect(result.decelerationMps2).toBe(B.gravity)
		expect(result.absActive).toBe(true)
		expect(brakeForces(20).absActive).toBe(false)
	})
	it('integrates stopping distance up to zero without reversing the wheel', () => {
		const initial = createBrakeState(40)
		const result = advanceBrake(initial, {...step, dt: 10, pedalForceN: 300})
		expect(result.speedMps).toBe(0)
		expect(result.decelerationMps2).toBe(0)
		const distance = (40 / 3.6) ** 2 / (2 * B.gravity)
		expect(result.wheelAngle).toBeCloseTo((distance / S.wheels.radius) % (2 * Math.PI), 8)
		expect(advanceBrake(result, {...step, dt: 10, pedalForceN: 300}).wheelAngle).toBe(
			result.wheelAngle,
		)
	})
	it('scales wheel deceleration with physical time and never reaccelerates on release', () => {
		const slow = advanceBrake(createBrakeState(), {...step, dt: 1, slowdown: 10, pedalForceN: 100})
		const real = advanceBrake(createBrakeState(), {...step, dt: 0.1, pedalForceN: 100})
		expect(slow.speedMps).toBeCloseTo(real.speedMps, 10)
		expect(slow.wheelAngle).toBeCloseTo(real.wheelAngle, 10)
		const released = advanceBrake(slow, {...step, dt: 1})
		expect(released.speedMps).toBe(slow.speedMps)
		expect(released.pressureBar).toBe(0)
	})
	it('keeps pressure highlighting on its 0.3-screen-second illustrative clock', () => {
		const initial = createBrakeState()
		const first = advanceBrake(initial, {...step, dt: 0.15, slowdown: 100, pedalForceN: 300})
		expect(first.pressureFrontProgress).toBeCloseTo(0.5, 8)
		const second = advanceBrake(first, {...step, dt: 0.15, slowdown: 100, pedalForceN: 300})
		expect(second.pressureFrontProgress).toBe(1)
		const released = advanceBrake(second, {...step})
		expect(released.pressureFrontProgress).toBe(0)
		expect(
			advanceBrake(released, {...step, dt: 0.075, pedalForceN: 300}).pressureFrontProgress,
		).toBeCloseTo(0.25, 8)
	})
	it('pauses both clocks and restarts only from an explicit speed or restart change', () => {
		const moving = advanceBrake(createBrakeState(), {...step, pedalForceN: 300})
		const paused = advanceBrake(moving, {...step, dt: 1, pedalForceN: 300, paused: true})
		expect(paused.speedMps).toBe(moving.speedMps)
		expect(paused.wheelAngle).toBe(moving.wheelAngle)
		expect(paused.pressureFrontProgress).toBe(moving.pressureFrontProgress)
		const restarted = advanceBrake(paused, {...step, paused: true, restartToken: 1})
		expect(restarted.speedKmh).toBe(40)
		expect(restarted.wheelAngle).toBe(0)
		expect(advanceBrake(paused, {...step, paused: true, speedKmh: 60}).speedKmh).toBeCloseTo(60, 8)
	})
	it('moves the piston outward and floating body oppositely, closing both 20× gaps', () => {
		const pressed = advanceBrake(createBrakeState(), {...step, dt: 0.3, pedalForceN: 300})
		const travel = caliperTravel(pressed),
			gap = B.padGap * B.gapMagnification
		expect(travel.body).toBe(-gap)
		expect(travel.piston + travel.body).toBe(gap)
		expect(travel.innerPad).toBe(gap)
	})
})
