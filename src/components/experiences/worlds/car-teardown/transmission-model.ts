import {finalDriveRatio, gearRatio} from './model'
import {TRANSMISSION_GEOMETRY as G, VEHICLE_SPEC as S, type Gear} from './vehicle-spec'

export type SleeveId = keyof typeof G.sleeves
export type ShiftPhase =
	| 'steady'
	| 'disengage-clutch'
	| 'return-neutral'
	| 'neutral'
	| 'select-gear'
	| 'engage-clutch'
export type SleevePositions = Record<SleeveId, number>
export type TransmissionState = {
	/** Mechanically selected gear; N while the sleeves cross the neutral gate. */
	gear: Gear
	requestedGear: Gear
	fromGear: Gear
	targetGear: Gear
	shiftElapsed: number
	shiftProgress: number
	shiftPhase: ShiftPhase
	clutchEngagement: number
	sleevePositions: SleevePositions
	/** Unwrapped radians. Only advanceTransmission owns this clock. */
	inputAngle: number
	layshaftAngle: number
	outputAngle: number
	wheelAngle: number
	inputRpm: number
	layshaftRpm: number
	outputRpm: number
	wheelRpm: number
	speedKmh: number
}
export type TransmissionInput = {
	dt: number
	rpm: number
	slowdown: number
	requestedGear: Gear
	paused?: boolean
}
export const SLEEVE_IDS = Object.keys(G.sleeves) as SleeveId[]
export const FORWARD_GEARS = [1, 2, 3, 4, 5] as const
export const FREE_GEARS = [1, 2, 3, 5, 'R'] as const
const PRIMARY = S.transmission.constantMesh.driver / S.transmission.constantMesh.driven
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (v: number) => {
	const t = clamp(v)
	return t * t * (3 - 2 * t)
}
const ratioInverse = (gear: Gear) => {
	const ratio = gearRatio(gear)
	return ratio === null ? 0 : 1 / ratio
}

export function sleevePositions(gear: Gear): SleevePositions {
	const result: SleevePositions = {'1-2': 0, '3-4': 0, '5-R': 0}
	for (const id of SLEEVE_IDS) {
		const pair = G.sleeves[id]
		result[id] = gear === pair.negative ? -1 : gear === pair.positive ? 1 : 0
	}
	return result
}

/** One half-second action; sleeves return fully to neutral before another moves. */
export function shiftState(from: Gear, to: Gear, elapsed: number) {
	const p = clamp(elapsed / G.shiftDuration)
	const a = G.shiftStages
	const old = sleevePositions(from),
		next = sleevePositions(to)
	const sleeves = Object.fromEntries(
		SLEEVE_IDS.map((id) => [
			id,
			p < a.neutral
				? old[id] * (1 - smooth((p - a.clutchOpen) / (a.neutral - a.clutchOpen)))
				: next[id] * smooth((p - a.select) / (a.engaged - a.select)),
		]),
	) as SleevePositions
	const phase: ShiftPhase =
		p >= 1
			? 'steady'
			: p < a.clutchOpen
				? 'disengage-clutch'
				: p < a.neutral
					? 'return-neutral'
					: p < a.select
						? 'neutral'
						: p < a.engaged
							? 'select-gear'
							: 'engage-clutch'
	const gear: Gear = p < a.neutral ? from : p < a.engaged ? 'N' : to
	const clutch =
		p < a.clutchOpen ? 1 - smooth(p / a.clutchOpen) : smooth((p - a.engaged) / (1 - a.engaged))
	const outputFactor =
		p < a.neutral
			? ratioInverse(from)
			: ratioInverse(to) * smooth((p - a.select) / (a.engaged - a.select))
	return {
		gear,
		shiftProgress: p,
		shiftPhase: phase,
		clutchEngagement: clutch,
		sleevePositions: sleeves,
		outputFactor,
	}
}

/** Integral over normalized shift time, used instead of frame-dependent Euler steps. */
function integratedOutputFactor(p: number, from: Gear, to: Gear): number {
	const a = G.shiftStages
	const q = clamp(p)
	const u = clamp((q - a.select) / (a.engaged - a.select))
	return (
		ratioInverse(from) * Math.min(q, a.neutral) +
		ratioInverse(to) * ((a.engaged - a.select) * (u ** 3 - u ** 4 / 2) + Math.max(0, q - a.engaged))
	)
}

export function createTransmissionState(initialGear: Gear = 'N'): TransmissionState {
	return {
		gear: initialGear,
		requestedGear: initialGear,
		fromGear: initialGear,
		targetGear: initialGear,
		shiftElapsed: G.shiftDuration,
		shiftProgress: 1,
		shiftPhase: 'steady',
		clutchEngagement: 1,
		sleevePositions: sleevePositions(initialGear),
		inputAngle: 0,
		layshaftAngle: 0,
		outputAngle: 0,
		wheelAngle: 0,
		inputRpm: 0,
		layshaftRpm: 0,
		outputRpm: 0,
		wheelRpm: 0,
		speedKmh: 0,
	}
}

/**
 * Ideal kinematic demonstration, not a torque/inertia simulation. The input and
 * all constant-mesh gears keep spinning while the clutch is open. Synchronizer
 * speed matching is prescribed; neutral's unloaded output is held stationary.
 * Shifts take 0.5 screen seconds; rotations use the same slow-motion clock as
 * the engine. A new request during a shift queues until that action completes.
 */
export function advanceTransmission(
	previous: TransmissionState,
	input: TransmissionInput,
): TransmissionState {
	const {dt, rpm, slowdown, requestedGear, paused = false} = input
	if (
		!Number.isFinite(dt) ||
		dt < 0 ||
		!Number.isFinite(rpm) ||
		rpm < 0 ||
		!Number.isFinite(slowdown) ||
		slowdown <= 0
	)
		throw new RangeError(
			'Transmission time, RPM and slowdown must be finite and nonnegative; slowdown must be positive',
		)
	const state = {...previous, requestedGear}
	let remaining = paused ? 0 : dt
	const omega = ((rpm / slowdown) * Math.PI) / 30
	// At most one queued request can follow the currently active shift.
	for (let iteration = 0; iteration < 3; iteration++) {
		if (state.shiftElapsed >= G.shiftDuration && state.gear !== requestedGear) {
			state.fromGear = state.gear
			state.targetGear = requestedGear
			state.shiftElapsed = 0
		}
		if (remaining <= 0) break
		if (state.shiftElapsed >= G.shiftDuration) {
			state.outputAngle += omega * remaining * ratioInverse(state.gear)
			state.inputAngle += omega * remaining
			remaining = 0
			break
		}
		const step = Math.min(remaining, G.shiftDuration - state.shiftElapsed)
		const p0 = state.shiftElapsed / G.shiftDuration
		const p1 = (state.shiftElapsed + step) / G.shiftDuration
		state.outputAngle +=
			omega *
			G.shiftDuration *
			(integratedOutputFactor(p1, state.fromGear, state.targetGear) -
				integratedOutputFactor(p0, state.fromGear, state.targetGear))
		state.inputAngle += omega * step
		state.shiftElapsed = Math.min(G.shiftDuration, state.shiftElapsed + step)
		remaining = Math.max(0, remaining - step)
		if (state.shiftElapsed >= G.shiftDuration) state.gear = state.targetGear
	}
	const shift = shiftState(state.fromGear, state.targetGear, state.shiftElapsed)
	Object.assign(state, shift)
	state.layshaftAngle = -state.inputAngle * PRIMARY
	state.wheelAngle = state.outputAngle / finalDriveRatio()
	state.inputRpm = rpm
	state.layshaftRpm = -rpm * PRIMARY
	state.outputRpm = rpm * shift.outputFactor
	state.wheelRpm = state.outputRpm / finalDriveRatio()
	state.speedKmh = (state.wheelRpm * 2 * Math.PI * S.wheels.radius * 60) / 1000
	return state
}

/** Rotations of the gears themselves, independent of output-shaft selection. */
export function freeGearAngle(inputAngle: number, gear: Exclude<Gear, 'N'>): number {
	return inputAngle * ratioInverse(gear)
}

export function freeGearRpm(rpm: number, gear: Exclude<Gear, 'N'>): number {
	return rpm * ratioInverse(gear)
}

export function transmissionPowerPath(state: TransmissionState): ReadonlySet<string> {
	const ids = new Set<string>()
	if (state.gear === 'N' || state.clutchEngagement < 0.01 || state.shiftPhase === 'select-gear')
		return ids
	for (const id of [
		'clutch-disc',
		'clutch-pressure-plate',
		'gearbox-input-shaft',
		'gearbox-output-shaft',
		'driveshaft',
		'differential',
		'final-drive-pinion',
		'final-drive-ring',
		'halfshaft-1',
		'halfshaft-2',
	])
		ids.add(id)
	const sleeve = SLEEVE_IDS.find((id) => sleevePositions(state.gear)[id] !== 0)!
	ids.add(`synchronizer-${sleeve}`)
	if (state.gear === 4) {
		ids.add('gearbox-input-gear')
	} else {
		for (const id of [
			'gearbox-input-gear',
			'gearbox-primary-driven',
			'gearbox-layshaft',
			`gearbox-driver-${state.gear}`,
			`gearbox-free-${state.gear}`,
		])
			ids.add(id)
		if (state.gear === 'R') ids.add('gearbox-reverse-idler')
	}
	return ids
}
