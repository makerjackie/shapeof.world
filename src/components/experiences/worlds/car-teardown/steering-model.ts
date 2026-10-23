import {STEERING_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'
import {differentialSpeeds, finalDriveRatio} from './model'

export const STEERING_WHEELS = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'] as const
export type SteeringWheelId = (typeof STEERING_WHEELS)[number]
export type WheelValues = Record<SteeringWheelId, number>
export type SteeringPoint = [number, number, number]
const DEG = Math.PI / 180
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))
export const RACK_PINION_RADIUS = (G.pinionTeeth * G.rackModule) / 2
export const COLUMN_AXIS: SteeringPoint = [
	Math.cos(G.columnInclination),
	-Math.sin(G.columnInclination),
	0,
]
export const RACK_NORMAL: SteeringPoint = [COLUMN_AXIS[1], -COLUMN_AXIS[0], 0]
export const PINION_POSITION: SteeringPoint = [
	S.steering.rackPosition[0] + RACK_NORMAL[0] * (G.rackRadius + RACK_PINION_RADIUS),
	S.steering.rackPosition[1] + RACK_NORMAL[1] * (G.rackRadius + RACK_PINION_RADIUS),
	G.pinionZ,
]
export const UPPER_JOINT: SteeringPoint = S.steering.wheelPosition.map(
	(v, i) => v + COLUMN_AXIS[i] * G.upperShaftLength,
) as SteeringPoint
export const LOWER_JOINT: SteeringPoint = PINION_POSITION.map(
	(v, i) => v - COLUMN_AXIS[i] * G.lowerShaftLength,
) as SteeringPoint
const middleVector = LOWER_JOINT.map((v, i) => v - UPPER_JOINT[i])
const middleLength = Math.hypot(...middleVector)
export const MIDDLE_AXIS = middleVector.map((v) => v / middleLength) as SteeringPoint
export const CARDAN_BEND = Math.acos(
	clamp(
		COLUMN_AXIS.reduce((sum, v, i) => sum + v * MIDDLE_AXIS[i], 0),
		-1,
		1,
	),
)

/** One Cardan joint; retaining whole turns avoids a branch cut at ±180°. */
export function cardanAngle(input: number, bend: number, inverse = false): number {
	const c = Math.cos(bend)
	const wrapped = inverse
		? Math.atan2(Math.sin(input), c * Math.cos(input))
		: Math.atan2(c * Math.sin(input), Math.cos(input))
	return wrapped + Math.round((input - wrapped) / (Math.PI * 2)) * Math.PI * 2
}
export function wheelPosition(id: SteeringWheelId): SteeringPoint {
	const front = id.startsWith('front'),
		left = id.endsWith('Left')
	return [
		front ? S.dimensions.frontAxleX : S.dimensions.rearAxleX,
		S.wheels.radius,
		((left ? -1 : 1) * (front ? S.wheels.frontTrack : S.wheels.rearTrack)) / 2,
	]
}

/** Ideal Ackermann: the inner angle is steering-wheel angle / 15. Positive is left (−Z). */
export function steeringGeometry(angleDegrees: number) {
	if (!Number.isFinite(angleDegrees)) throw new RangeError('Steering angle must be finite')
	const wheelAngle = clamp(
		angleDegrees,
		-S.steering.maxSteeringWheelAngle,
		S.steering.maxSteeringWheelAngle,
	)
	const sign = Math.sign(wheelAngle),
		innerAngle = (Math.abs(wheelAngle) / S.steering.ratio) * DEG
	const radius = sign
		? S.dimensions.wheelbase / Math.tan(innerAngle) + S.wheels.frontTrack / 2
		: Infinity
	const outerAngle = sign
		? Math.atan(S.dimensions.wheelbase / (radius + S.wheels.frontTrack / 2))
		: 0
	const leftAngle = sign > 0 ? innerAngle : sign < 0 ? -outerAngle : 0
	const rightAngle = sign > 0 ? outerAngle : sign < 0 ? -innerAngle : 0
	const wheelRadii: WheelValues = sign
		? {
				frontLeft: Math.hypot(S.dimensions.wheelbase, radius - (sign * S.wheels.frontTrack) / 2),
				frontRight: Math.hypot(S.dimensions.wheelbase, radius + (sign * S.wheels.frontTrack) / 2),
				rearLeft: radius - (sign * S.wheels.rearTrack) / 2,
				rearRight: radius + (sign * S.wheels.rearTrack) / 2,
			}
		: {frontLeft: Infinity, frontRight: Infinity, rearLeft: Infinity, rearRight: Infinity}
	const columnMiddleAngle = cardanAngle(wheelAngle * DEG, CARDAN_BEND)
	const pinionAngle = cardanAngle(columnMiddleAngle, CARDAN_BEND, true)
	return {
		wheelAngle,
		sign,
		innerAngle,
		outerAngle,
		leftAngle,
		rightAngle,
		radius,
		wheelRadii,
		turnCenter: sign
			? ([S.dimensions.rearAxleX, G.constructionY, -sign * radius] as SteeringPoint)
			: null,
		turningDiameter: sign ? 2 * Math.max(wheelRadii.frontLeft, wheelRadii.frontRight) : Infinity,
		columnMiddleAngle,
		pinionAngle,
		rackTravel: RACK_PINION_RADIUS * pinionAngle,
	}
}
export type SteeringGeometry = ReturnType<typeof steeringGeometry>
export type SteeringState = SteeringGeometry & {
	speedKmh: number
	wheelRpm: WheelValues
	wheelAngles: WheelValues
	carrierRpm: number
	carrierAngle: number
	planetSpinRpm: number
	planetSpinAngle: number
	/** Rear final-drive input pinion, separate from the steering rack pinion. */
	drivePinionRpm: number
	drivePinionAngle: number
	yawRate: number
}
export type SteeringInput = {
	dt: number
	slowdown: number
	paused: boolean
	wheelAngle: number
	speedKmh: number
}
const zeros = (): WheelValues => ({frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0})
export function createSteeringState(): SteeringState {
	return {
		...steeringGeometry(0),
		speedKmh: 0,
		wheelRpm: zeros(),
		wheelAngles: zeros(),
		carrierRpm: 0,
		carrierAngle: 0,
		planetSpinRpm: 0,
		planetSpinAngle: 0,
		drivePinionRpm: 0,
		drivePinionAngle: 0,
		yawRate: 0,
	}
}

/** Reads geometric controls immediately, including while paused. Only rotation uses slowed time. */
export function advanceSteering(previous: SteeringState, input: SteeringInput): SteeringState {
	if (
		!Number.isFinite(input.dt) ||
		input.dt < 0 ||
		!Number.isFinite(input.slowdown) ||
		input.slowdown <= 0 ||
		!Number.isFinite(input.speedKmh)
	)
		throw new RangeError(
			'Steering time, speed and slowdown must be finite; slowdown must be positive',
		)
	const geometry = steeringGeometry(input.wheelAngle),
		speedKmh = clamp(input.speedKmh, 0, G.maxSpeedKmh)
	const centreRpm = (speedKmh / 3.6 / (2 * Math.PI * S.wheels.radius)) * 60
	const wheelRpm = Object.fromEntries(
		STEERING_WHEELS.map((id) => [
			id,
			centreRpm * (geometry.sign ? geometry.wheelRadii[id] / geometry.radius : 1),
		]),
	) as WheelValues
	const elapsed = input.paused ? 0 : input.dt / input.slowdown
	const wheelAngles = Object.fromEntries(
		STEERING_WHEELS.map((id) => [
			id,
			previous.wheelAngles[id] + ((wheelRpm[id] * Math.PI) / 30) * elapsed,
		]),
	) as WheelValues
	const {carrierRpm, planetSpinRpm} = differentialSpeeds(wheelRpm.rearLeft, wheelRpm.rearRight)
	const carrierAngle = (wheelAngles.rearLeft + wheelAngles.rearRight) / 2
	const planetSpinAngle =
		(((wheelAngles.rearRight - wheelAngles.rearLeft) / 2) * S.transmission.differential.sideTeeth) /
		S.transmission.differential.planetTeeth
	return {
		...geometry,
		speedKmh,
		wheelRpm,
		wheelAngles,
		carrierRpm,
		carrierAngle,
		planetSpinRpm,
		planetSpinAngle,
		drivePinionRpm: carrierRpm * finalDriveRatio(),
		drivePinionAngle: carrierAngle * finalDriveRatio(),
		yawRate: geometry.sign ? (geometry.sign * speedKmh) / 3.6 / geometry.radius : 0,
	}
}

/** Ground-plane wheel normal; its infinite line passes through the one instantaneous centre. */
export function wheelNormal(
	id: SteeringWheelId,
	geometry: SteeringGeometry,
): {point: SteeringPoint; direction: SteeringPoint} {
	const angle =
		id === 'frontLeft' ? geometry.leftAngle : id === 'frontRight' ? geometry.rightAngle : 0
	const point = wheelPosition(id)
	point[1] = G.constructionY
	return {point, direction: [Math.sin(angle), 0, Math.cos(angle)]}
}
