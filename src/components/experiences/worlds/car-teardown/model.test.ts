import {describe, expect, it} from 'vitest'
import {VEHICLE_SPEC as S, type CylinderNumber} from './vehicle-spec'
import {
	advanceCrankAngle,
	camAngle,
	camLobeRadius,
	cycleAngle,
	cylinderState,
	differentialSpeeds,
	displacementCc,
	displayedRpm,
	finalDriveRatio,
	gearRatio,
	ignitionAdvance,
	pistonPosition,
	sparkIntensity,
	strokeAt,
	suggestedSlowdown,
	valveLift,
	vehicleSpeedKmh,
	wrapDegrees,
} from './model'

describe('the specified 2.0-litre inline four', () => {
	it('reaches both exact slider-crank dead centres and the specified stroke', () => {
		const e = S.engine
		expect(pistonPosition(0)).toBeCloseTo(e.crankRadius + e.rodLength, 12)
		expect(pistonPosition(180)).toBeCloseTo(e.rodLength - e.crankRadius, 12)
		expect(pistonPosition(0) - pistonPosition(180)).toBeCloseTo(e.stroke, 12)
		// Finite rod length puts the piston below the sinusoidal approximation.
		expect(pistonPosition(90)).toBeCloseTo(Math.sqrt(e.rodLength ** 2 - e.crankRadius ** 2), 12)
		expect(pistonPosition(90)).toBeLessThan(e.rodLength)
		expect(displacementCc()).toBeCloseTo(1998.229, 3)
	})

	it('satisfies the rod-length constraint throughout both revolutions', () => {
		for (let theta = 0; theta < 720; theta += 7.3) {
			const s = pistonPosition(theta)
			const pinY = S.engine.crankRadius * Math.cos((theta * Math.PI) / 180)
			const pinZ = S.engine.crankRadius * Math.sin((theta * Math.PI) / 180)
			expect(Math.hypot(s - pinY, pinZ)).toBeCloseTo(S.engine.rodLength, 12)
		}
	})

	it('keeps cylinders 1/4 and 2/3 at equal heights at arbitrary angles', () => {
		for (let theta = -720; theta < 1440; theta += 11.7) {
			const cylinders = ([1, 2, 3, 4] as CylinderNumber[]).map((n) => cylinderState(theta, n, 800))
			expect(cylinders[0].pistonPosition).toBeCloseTo(cylinders[3].pistonPosition, 12)
			expect(cylinders[1].pistonPosition).toBeCloseTo(cylinders[2].pistonPosition, 12)
		}
	})

	it('has the firing TDC order 1-3-4-2 with 180° between events', () => {
		const tdcSequence = [0, 180, 360, 540].map((angle) =>
			([1, 2, 3, 4] as CylinderNumber[]).find((cylinder) => cycleAngle(angle, cylinder) === 0),
		)
		expect(tdcSequence).toEqual([1, 3, 4, 2])
		const advance = ignitionAdvance(3000)
		for (const [index, cylinder] of S.engine.firingOrder.entries()) {
			// Check actual flashes, which occur before the corresponding firing TDC.
			const angle = index * 180 - advance + S.engine.ignition.duration / 2
			expect(cylinderState(angle, cylinder, 3000).sparkIntensity).toBeCloseTo(1, 12)
			expect(
				([1, 2, 3, 4] as CylinderNumber[]).filter((c) => cylinderState(angle, c, 3000).spark > 0.01),
			).toEqual([cylinder])
		}
	})

	it('assigns all four strokes with half-open intervals and wraps backward scrubbing', () => {
		expect([0, 179.9, 180, 359.9, 360, 539.9, 540, 719.9, 720, -1].map(strokeAt)).toEqual([
			'power',
			'power',
			'exhaust',
			'exhaust',
			'intake',
			'intake',
			'compression',
			'compression',
			'power',
			'compression',
		])
		expect(wrapDegrees(-20)).toBe(700)
	})

	it('changes gas volume with piston travel and preserves the compression ratio', () => {
		const tdc = cylinderState(0, 1, 800).gasVolume
		const bdc = cylinderState(180, 1, 800).gasVolume
		expect(bdc / tdc).toBeCloseTo(10.5, 12)
		expect((bdc - tdc) * 4 * 1e6).toBeCloseTo(displacementCc(), 8)
	})
})

describe('valves, camshafts and ignition share the same cycle', () => {
	it('opens and closes at the specified angles, with exact peak lifts', () => {
		expect(valveLift(129, 'exhaust')).toBe(0)
		expect(valveLift(130, 'exhaust')).toBe(0)
		expect(valveLift(131, 'exhaust')).toBeGreaterThan(0)
		expect(valveLift(250, 'exhaust')).toBeCloseTo(0.009, 12)
		expect(valveLift(369, 'exhaust')).toBeGreaterThan(0)
		expect(valveLift(370, 'exhaust')).toBe(0)
		expect(valveLift(349, 'intake')).toBe(0)
		expect(valveLift(350, 'intake')).toBe(0)
		expect(valveLift(351, 'intake')).toBeGreaterThan(0)
		expect(valveLift(470, 'intake')).toBeCloseTo(0.0095, 12)
		expect(valveLift(589, 'intake')).toBeGreaterThan(0)
		expect(valveLift(590, 'intake')).toBe(0)
	})

	it('has exactly 20° of nominal valve overlap at the exhaust/intake TDC', () => {
		const {intake, exhaust} = S.engine.timing
		expect(exhaust.close - intake.open).toBe(20)
		for (const angle of [350.1, 360, 369.9]) {
			expect(valveLift(angle, 'intake')).toBeGreaterThan(0)
			expect(valveLift(angle, 'exhaust')).toBeGreaterThan(0)
		}
		expect(valveLift(349.9, 'intake')).toBe(0)
		expect(valveLift(370.1, 'exhaust')).toBe(0)
	})

	it('uses a half-speed cam and a profile that yields the same follower lift', () => {
		expect(camAngle(720) - camAngle(0)).toBe(360)
		expect(S.engine.timing.camSprocketTeeth / S.engine.timing.crankSprocketTeeth).toBe(2)
		for (const cylinder of [1, 2, 3, 4] as const) {
			for (let theta = 0; theta < 720; theta += 13.1) {
				for (const valve of ['intake', 'exhaust'] as const) {
					const contactRadius = camLobeRadius(-camAngle(theta), cylinder, valve)
					expect(contactRadius - S.engine.timing.camBaseRadius).toBeCloseTo(
						valveLift(cycleAngle(theta, cylinder), valve),
						12,
					)
				}
			}
		}
	})

	it('caps the illustrative advance curve and flashes for only 20 crank degrees', () => {
		expect(ignitionAdvance(800)).toBe(10)
		expect(ignitionAdvance(2400)).toBe(21)
		expect(ignitionAdvance(4000)).toBe(32)
		expect(ignitionAdvance(6500)).toBe(32)
		expect(sparkIntensity(699.9, 800)).toBe(0)
		expect(sparkIntensity(710.1, 800)).toBeGreaterThan(0)
		expect(sparkIntensity(0, 800)).toBeCloseTo(1, 12)
		expect(sparkIntensity(10, 800)).toBe(0)
	})

	it('separates physical RPM from slowed screen motion', () => {
		expect(displayedRpm(3000, 100)).toBe(30)
		expect(suggestedSlowdown(3000)).toBe(100)
		expect(advanceCrankAngle(0, 1, 3000, 100)).toBe(180)
		expect(advanceCrankAngle(710, 1 / 18, 3000, 100)).toBe(0)
	})
})

describe('the five-speed transmission prepared for round two', () => {
	it('keeps every forward constant-mesh pair at 54 teeth', () => {
		const t = S.transmission
		for (const pair of [t.constantMesh, t.gears[1], t.gears[2], t.gears[3], t.gears[5]]) {
			expect(pair.driver + pair.driven).toBe(54)
		}
		// Reverse is an idler train, not a direct mesh across that fixed centre distance.
		expect(t.gears.R.driver + t.gears.R.driven).toBe(49)
	})

	it('combines the primary ratio with each gear, but locks fourth directly', () => {
		expect(gearRatio(1)).toBeCloseTo(3.781818, 6)
		expect(gearRatio(2)).toBeCloseTo(2.285714, 6)
		expect(gearRatio(3)).toBeCloseTo(1.566434, 6)
		expect(gearRatio(4)).toBe(1)
		expect(gearRatio(5)).toBeCloseTo(0.78961, 6)
		expect(gearRatio('R')).toBeCloseTo(-4.027972, 6)
		expect(gearRatio('N')).toBeNull()
	})

	it('predicts about 96 km/h in fourth at 3000 RPM using rolling radius', () => {
		expect(finalDriveRatio()).toBeCloseTo(3.7272727, 7)
		expect(vehicleSpeedKmh(3000, 4)).toBeCloseTo(96.19, 1)
		expect(vehicleSpeedKmh(3000, 'R')).toBeLessThan(0)
		expect(vehicleSpeedKmh(3000, 'N')).toBeNull()
		expect(S.wheels.nominalDiameter).toBeCloseTo(0.6343, 10)
	})

	it('keeps an open differential carrier at the average wheel speed', () => {
		expect(differentialSpeeds(100, 100)).toEqual({carrierRpm: 100, planetSpinRpm: 0})
		expect(differentialSpeeds(80, 120)).toEqual({carrierRpm: 100, planetSpinRpm: 32})
	})
})
