import {VEHICLE_SPEC, type CylinderNumber, type Gear, type Stroke, type ValveType} from './vehicle-spec'

const E = VEHICLE_SPEC.engine
const DEG = Math.PI / 180

/** Positive modulo also keeps reverse scrubbing continuous. */
export function wrapDegrees(angle: number, period = 720): number {
	return ((angle % period) + period) % period
}

export function cycleAngle(crankDegrees: number, cylinder: CylinderNumber): number {
	return wrapDegrees(crankDegrees - E.firingOffsets[cylinder])
}

/** Piston-pin distance from the crank centre, in metres. 0° = TDC. */
export function pistonPosition(crankDegrees: number): number {
	const theta = crankDegrees * DEG
	return (
		E.crankRadius * Math.cos(theta) + Math.sqrt(E.rodLength ** 2 - (E.crankRadius * Math.sin(theta)) ** 2)
	)
}

export function displacementCc(): number {
	return (Math.PI / 4) * E.bore ** 2 * E.stroke * E.cylinders * 1e6
}

export function strokeAt(cycleDegrees: number): Stroke {
	const phi = wrapDegrees(cycleDegrees)
	if (phi < 180) return 'power'
	if (phi < 360) return 'exhaust'
	if (phi < 540) return 'intake'
	return 'compression'
}

/** Fixed timing, with a smooth zero-velocity opening/closing ramp. */
export function valveLift(cycleDegrees: number, valve: ValveType): number {
	const {open, close, maxLift} = E.timing[valve]
	const elapsed = wrapDegrees(cycleDegrees - open)
	if (elapsed <= 0 || elapsed >= close - open) return 0
	return maxLift * Math.sin((Math.PI * elapsed) / (close - open)) ** 2
}

/** Unwrapped cam angle: keeping full turns avoids animation discontinuities. */
export function camAngle(crankDegrees: number): number {
	return crankDegrees / 2
}

/** A radial cam generated from exactly the same lift law as its follower.
 * The positive-Y follower direction is local polar angle 0; the shaft rotates
 * by crankDegrees / 2. The cylinder phase is incorporated into the profile.
 * This is an ideal radial follower, not a production roller-contact design.
 */
export function camLobeRadius(localPolarDegrees: number, cylinder: CylinderNumber, valve: ValveType): number {
	return E.timing.camBaseRadius + valveLift(-2 * localPolarDegrees - E.firingOffsets[cylinder], valve)
}

/** Illustrative RPM-only curve. Actual engines use load-dependent ECU maps. */
export function ignitionAdvance(rpm: number): number {
	const fraction = Math.max(0, Math.min(1, (rpm - E.idleRpm) / (E.ignition.plateauRpm - E.idleRpm)))
	return E.ignition.idleAdvance + fraction * (E.ignition.plateauAdvance - E.ignition.idleAdvance)
}

export function sparkIntensity(cycleDegrees: number, rpm: number): number {
	const sinceSpark = wrapDegrees(cycleDegrees - (720 - ignitionAdvance(rpm)))
	if (sinceSpark >= E.ignition.duration) return 0
	// A flash, rather than a persistent glow throughout the power stroke.
	return Math.sin((Math.PI * sinceSpark) / E.ignition.duration) ** 2
}

export function cylinderState(crankDegrees: number, cylinder: CylinderNumber, rpm: number) {
	const phi = cycleAngle(crankDegrees, cylinder)
	const crank = wrapDegrees(phi, 360)
	const position = pistonPosition(crank)
	const travel = E.rodLength + E.crankRadius - position
	const boreArea = (Math.PI * E.bore ** 2) / 4
	const flash = sparkIntensity(phi, rpm)
	return {
		cylinder,
		cycleAngle: phi,
		crankAngle: crank,
		pistonPosition: position,
		pistonTravel: travel,
		// radians: the rod leans away from +Y toward the displaced crank pin.
		rodAngle: Math.asin((E.crankRadius * Math.sin(crank * DEG)) / E.rodLength),
		intakeLift: valveLift(phi, 'intake'),
		exhaustLift: valveLift(phi, 'exhaust'),
		stroke: strokeAt(phi),
		sparkIntensity: flash,
		spark: flash,
		gasVolume: boreArea * (travel + E.stroke / (E.compressionRatio - 1)),
	}
}

export function displayedRpm(rpm: number, slowdown: number): number {
	return rpm / slowdown
}

export function suggestedSlowdown(rpm: number): (typeof E.slowdownOptions)[number] {
	// Prefer the available setting closest to half a displayed revolution/sec.
	return E.slowdownOptions.reduce((best, value) =>
		Math.abs(Math.log(rpm / value / 30)) < Math.abs(Math.log(rpm / best / 30)) ? value : best,
	)
}

export function advanceCrankAngle(
	crankDegrees: number,
	elapsedSeconds: number,
	rpm: number,
	slowdown: number,
): number {
	return wrapDegrees(crankDegrees + elapsedSeconds * displayedRpm(rpm, slowdown) * 6)
}

/** Signed input/output ratio. Neutral has no kinematic engine-wheel link. */
export function gearRatio(gear: Gear): number | null {
	if (gear === 'N') return null
	if (gear === 4) return 1
	const pair = VEHICLE_SPEC.transmission.gears[gear]
	const primary = VEHICLE_SPEC.transmission.constantMesh
	return ((((gear === 'R' ? -1 : 1) * primary.driven) / primary.driver) * pair.driven) / pair.driver
}

export function finalDriveRatio(): number {
	const {driver, driven} = VEHICLE_SPEC.transmission.finalDrive
	return driven / driver
}

/** Signed speed; neutral returns null because RPM does not determine speed. */
export function vehicleSpeedKmh(rpm: number, gear: Gear): number | null {
	const ratio = gearRatio(gear)
	if (ratio === null) return null
	return (((rpm / ratio / finalDriveRatio()) * 2 * Math.PI * VEHICLE_SPEC.wheels.radius) / 60) * 3.6
}

export function differentialSpeeds(leftRpm: number, rightRpm: number) {
	const differential = VEHICLE_SPEC.transmission.differential
	return {
		carrierRpm: (leftRpm + rightRpm) / 2,
		planetSpinRpm: (((rightRpm - leftRpm) / 2) * differential.sideTeeth) / differential.planetTeeth,
	}
}
