import {BRAKE_GEOMETRY as B, VEHICLE_SPEC as S} from './vehicle-spec'

const circleArea = (diameter: number) => (Math.PI * diameter * diameter) / 4
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** Clamp force is P × piston area for one side of a floating caliper.
 * Its two pads therefore produce torque 2 × mu × clamp force × radius. */
export function brakeForces(pedalForceN: number) {
	const force = clamp(pedalForceN, 0, B.maxPedalForceN)
	const pressurePa = (force * S.brakes.pedalRatio * B.boosterRatio) / circleArea(B.masterDiameter)
	const frontClampN = pressurePa * circleArea(S.brakes.front.pistonDiameter)
	const rearClampN = pressurePa * circleArea(S.brakes.rear.pistonDiameter)
	const frontTorqueNm = 2 * B.padFriction * frontClampN * B.frontEffectiveRadius
	const rearTorqueNm = 2 * B.padFriction * rearClampN * B.rearEffectiveRadius
	const totalTorqueNm = 2 * (frontTorqueNm + rearTorqueNm)
	const uncappedDecelerationMps2 = totalTorqueNm / S.wheels.radius / S.dimensions.mass
	return {
		pedalForceN: force,
		pressureBar: pressurePa / 100000,
		frontClampN,
		rearClampN,
		frontTorqueNm,
		rearTorqueNm,
		totalTorqueNm,
		uncappedDecelerationMps2,
		decelerationMps2: Math.min(B.gravity, uncappedDecelerationMps2),
		absActive: uncappedDecelerationMps2 > B.gravity,
	}
}

export interface BrakeState extends ReturnType<typeof brakeForces> {
	speedKmh: number
	speedMps: number
	wheelAngle: number
	pressureFrontProgress: number
	initialSpeedKmh: number
	restartToken: number
}

export function createBrakeState(speedKmh: number = B.initialSpeedKmh): BrakeState {
	const speed = clamp(speedKmh, 0, B.maximumSpeedKmh)
	return {
		...brakeForces(0),
		speedKmh: speed,
		speedMps: speed / 3.6,
		wheelAngle: 0,
		pressureFrontProgress: 0,
		initialSpeedKmh: speed,
		restartToken: 0,
	}
}

export interface BrakeStep {
	dt: number
	slowdown: number
	paused: boolean
	pedalForceN: number
	speedKmh: number
	restartToken: number
}

/** Wheel speed and stopping distance use physical time dt / slowdown.
 * Only the traveling line highlight uses screen time: it is an explanatory
 * pressure sequence, not a simulation of brake-fluid propagation speed. */
export function advanceBrake(previous: BrakeState, input: BrakeStep): BrakeState {
	const requestedSpeed = clamp(input.speedKmh, 0, B.maximumSpeedKmh)
	const reset =
		requestedSpeed !== previous.initialSpeedKmh || input.restartToken !== previous.restartToken
	const base = reset
		? {...createBrakeState(requestedSpeed), restartToken: input.restartToken}
		: previous
	const forces = brakeForces(input.pedalForceN)
	const screenDt = input.paused ? 0 : Math.max(0, input.dt)
	const physicalDt = screenDt / Math.max(1, input.slowdown)
	const deceleration = forces.decelerationMps2
	const movingTime =
		deceleration > 0 ? Math.min(physicalDt, base.speedMps / deceleration) : physicalDt
	const distance = base.speedMps * movingTime - (deceleration * movingTime * movingTime) / 2
	const speedMps = Math.max(0, base.speedMps - deceleration * physicalDt)
	const pressureFrontProgress =
		forces.pedalForceN > 0
			? Math.min(1, base.pressureFrontProgress + screenDt / B.pressureIllustrationSeconds)
			: 0
	return {
		...base,
		...forces,
		speedMps,
		speedKmh: speedMps * 3.6,
		wheelAngle: (base.wheelAngle + distance / S.wheels.radius) % (Math.PI * 2),
		decelerationMps2: speedMps > 0 ? deceleration : 0,
		absActive: speedMps > 0 && forces.absActive,
		pressureFrontProgress,
	}
}

/** Positive = inner pad/piston moves outward; the floating body moves inward. */
export function caliperTravel(state: BrakeState) {
	const arrival = clamp((state.pressureFrontProgress - 0.75) / 0.25, 0, 1)
	const engagement = state.pressureBar > 0 ? arrival : 0
	const gap = B.padGap * B.gapMagnification
	return {
		innerPad: gap * engagement,
		piston: 2 * gap * engagement,
		body: -gap * engagement,
		engagement,
	}
}
