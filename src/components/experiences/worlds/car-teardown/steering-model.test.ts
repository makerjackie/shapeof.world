import {describe, expect, it} from 'vitest'
import {
	advanceSteering,
	createSteeringState,
	steeringGeometry,
	wheelNormal,
	wheelPosition,
	STEERING_WHEELS,
	RACK_PINION_RADIUS,
	CARDAN_BEND,
	cardanAngle,
} from './steering-model'
import {VEHICLE_SPEC as S} from './vehicle-spec'
const drive = (angle: number, speed = 30) =>
	advanceSteering(createSteeringState(), {
		dt: 1,
		slowdown: 10,
		paused: false,
		wheelAngle: angle,
		speedKmh: speed,
	})
describe('ideal Ackermann and open differential', () => {
	it('gives about 12.9 m outer-front turning diameter at full steering lock', () => {
		const g = steeringGeometry(540)
		expect((g.innerAngle * 180) / Math.PI).toBeCloseTo(36, 12)
		expect(g.radius).toBeCloseTo(4.8296, 3)
		expect(g.turningDiameter).toBeCloseTo(12.9, 1)
		expect(g.leftAngle).toBeGreaterThan(g.rightAngle)
		expect(g.turnCenter![0]).toBe(S.dimensions.rearAxleX)
		expect(g.turnCenter![2]).toBeLessThan(0)
	})
	it('satisfies the cotangent Ackermann identity and mirrors right turns', () => {
		for (const angle of [15, 90, 270, 540]) {
			const left = steeringGeometry(angle),
				right = steeringGeometry(-angle)
			expect(1 / Math.tan(left.outerAngle) - 1 / Math.tan(left.innerAngle)).toBeCloseTo(S.wheels.frontTrack / S.dimensions.wheelbase, 10)
			expect(right.leftAngle).toBe(-left.rightAngle)
			expect(right.rightAngle).toBe(-left.leftAngle)
			expect(right.wheelRadii.frontLeft).toBe(left.wheelRadii.frontRight)
		}
	})
	it('makes all four wheel normals intersect at the rear-line instantaneous centre', () => {
		for (const angle of [-540, -250, 20, 300, 540]) {
			const geometry = steeringGeometry(angle),
				centre = geometry.turnCenter!
			for (const id of STEERING_WHEELS) {
				const {point, direction} = wheelNormal(id, geometry),
					dx = centre[0] - point[0],
					dz = centre[2] - point[2]
				expect(dx * direction[2] - dz * direction[0]).toBeCloseTo(0, 11)
				const location = wheelPosition(id)
				expect(Math.hypot(location[0] - centre[0], location[2] - centre[2])).toBeCloseTo(geometry.wheelRadii[id], 10)
			}
		}
	})
	it('drives each wheel at its own path speed and averages the rear speeds', () => {
		const state = drive(540)
		for (const id of STEERING_WHEELS) {
			expect((state.wheelRpm[id] * Math.PI * 2 * S.wheels.radius) / 60).toBeCloseTo(((30 / 3.6) * state.wheelRadii[id]) / state.radius, 12)
		}
		expect(state.wheelRpm.frontRight).toBeGreaterThan(state.wheelRpm.frontLeft)
		expect(state.wheelRpm.rearRight).toBeGreaterThan(state.wheelRpm.rearLeft)
		expect(state.carrierRpm).toBeCloseTo((state.wheelRpm.rearLeft + state.wheelRpm.rearRight) / 2, 12)
		expect(state.planetSpinRpm).toBeCloseTo((((state.wheelRpm.rearRight - state.wheelRpm.rearLeft) / 2) * 16) / 10, 12)
		expect(state.drivePinionRpm / state.carrierRpm).toBeCloseTo(41 / 11, 12)
	})
	it('has equal wheel speeds and zero planet spin when straight; all stop at zero road speed', () => {
		const straight = drive(0),
			stop = drive(540, 0)
		expect(new Set(Object.values(straight.wheelRpm)).size).toBe(1)
		expect(straight.planetSpinRpm).toBe(0)
		expect(straight.planetSpinAngle).toBe(0)
		expect(straight.turnCenter).toBeNull()
		for (const value of Object.values(stop.wheelRpm)) expect(value).toBe(0)
		expect(stop.drivePinionAngle).toBe(0)
	})
	it('preserves physical readings at every slowdown and integrates continuous relative angles', () => {
		const a = drive(400),
			b = advanceSteering(createSteeringState(), {
				dt: 1,
				slowdown: 100,
				paused: false,
				wheelAngle: 400,
				speedKmh: 30,
			})
		expect(b.wheelRpm).toEqual(a.wheelRpm)
		for (const id of STEERING_WHEELS) expect(b.wheelAngles[id]).toBeCloseTo(a.wheelAngles[id] / 10, 12)
		let state = a
		for (const angle of [-540, 540, 0, -300])
			state = advanceSteering(state, {
				dt: 0.3,
				slowdown: 10,
				paused: false,
				wheelAngle: angle,
				speedKmh: 30,
			})
		expect(state.carrierAngle).toBeCloseTo((state.wheelAngles.rearLeft + state.wheelAngles.rearRight) / 2, 12)
		expect(state.planetSpinAngle).toBeCloseTo((((state.wheelAngles.rearRight - state.wheelAngles.rearLeft) / 2) * 16) / 10, 12)
	})
	it('responds geometrically while paused and exactly couples rack travel to its pinion', () => {
		const previous = drive(0),
			state = advanceSteering(previous, {
				dt: 10,
				slowdown: 10,
				paused: true,
				wheelAngle: 540,
				speedKmh: 40,
			})
		expect(state.leftAngle).toBeCloseTo((36 * Math.PI) / 180, 12)
		expect(state.wheelAngles).toEqual(previous.wheelAngles)
		expect(state.wheelRpm.frontLeft).not.toBe(previous.wheelRpm.frontLeft)
		expect(state.rackTravel).toBeCloseTo(RACK_PINION_RADIUS * state.pinionAngle, 12)
		for (let degrees = -540; degrees <= 540; degrees += 13) {
			const input = (degrees * Math.PI) / 180
			expect(cardanAngle(cardanAngle(input, CARDAN_BEND), CARDAN_BEND, true)).toBeCloseTo(input, 12)
		}
	})
})

it('couples the exploded axle to signed driveline speed without the steering control speed limit', () => {
	for (const speedKmh of [-30, 0, 101.7, 220]) {
		const state = advanceSteering(createSteeringState(), {
			dt: 1,
			slowdown: 40,
			paused: false,
			wheelAngle: 400,
			speedKmh,
			drivetrain: true,
		})
		expect(state.speedKmh).toBe(speedKmh)
		const wheelRpm = (speedKmh / 3.6 / (2 * Math.PI * S.wheels.radius)) * 60
		expect(state.carrierRpm).toBeCloseTo(wheelRpm, 10)
		expect((state.wheelRpm.rearLeft + state.wheelRpm.rearRight) / 2).toBeCloseTo(wheelRpm, 10)
		expect(Math.sign(state.planetSpinAngle)).toBe(Math.sign(speedKmh))
	}
})
