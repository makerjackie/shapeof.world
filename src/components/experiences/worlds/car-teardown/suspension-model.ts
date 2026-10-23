import {SUSPENSION_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'

export type QuarterCarState = {
	/** Vertical displacement from the statically loaded ride height, metres. */
	body: number
	wheel: number
	bodyVelocity: number
	wheelVelocity: number
	road: number
}
export type SuspensionSample = {
	time: number
	road: number
	wheel: number
	body: number
	rearRoad: number
	rearWheel: number
	rearBody: number
}
export type SuspensionParameters = {
	speedKmh: number
	bumpHeight: number
	damping: number
	restartToken: number
}
export type SuspensionState = {
	time: number
	active: boolean
	settled: boolean
	front: QuarterCarState
	rear: QuarterCarState
	/** Mean heave and front-up pitch (radians); there is no roll in this model. */
	heave: number
	pitch: number
	distance: number
	wheelAngle: number
	accumulator: number
	stepCount: number
	settlingTime: number
	parameters: SuspensionParameters
	history: SuspensionSample[]
}
export type SuspensionInput = Omit<SuspensionParameters, 'restartToken'> & {
	dt: number
	slowdown: number
	paused?: boolean
	restartToken?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const emptyQuarter = (): QuarterCarState => ({
	body: 0,
	wheel: 0,
	bodyVelocity: 0,
	wheelVelocity: 0,
	road: 0,
})

/** Static gravity is already balanced in the dynamic coordinates. */
export function staticSuspensionSag() {
	const {sprungMass, unsprungMass, springRate, tyreStiffness} = S.suspension
	return {
		spring: (sprungMass * G.gravity) / springRate,
		tyre: ((sprungMass + unsprungMass) * G.gravity) / tyreStiffness,
	}
}

/** One raised cosine, spatially fixed; it is exactly flat outside the bump. */
export function suspensionBump(distanceFromLeadingEdge: number, height: number) {
	if (distanceFromLeadingEdge <= 0 || distanceFromLeadingEdge >= G.bumpWidth) return 0
	return (height * (1 - Math.cos((2 * Math.PI * distanceFromLeadingEdge) / G.bumpWidth))) / 2
}

export function rearAxleDelay(speedKmh: number) {
	return S.dimensions.wheelbase / (speedKmh / 3.6)
}

export function suspensionRoad(
	time: number,
	axle: 'front' | 'rear',
	speedKmh: number,
	height: number,
) {
	const distance =
		((time - G.firstContactTime) * speedKmh) / 3.6 - (axle === 'rear' ? S.dimensions.wheelbase : 0)
	return suspensionBump(distance, height)
}

/** [body position, body velocity, wheel position, wheel velocity]. */
type Vector4 = [number, number, number, number]
export function quarterCarDerivative(
	q: Vector4,
	road: number,
	damping: number = S.suspension.damping,
): Vector4 {
	const {sprungMass, unsprungMass, springRate, tyreStiffness} = S.suspension
	const suspensionForce = springRate * (q[0] - q[2]) + damping * (q[1] - q[3])
	return [
		q[1],
		-suspensionForce / sprungMass,
		q[3],
		(suspensionForce - tyreStiffness * (q[2] - road)) / unsprungMass,
	]
}

export function quarterCarEnergy(q: Vector4) {
	const {sprungMass, unsprungMass, springRate, tyreStiffness} = S.suspension
	return (
		(sprungMass * q[1] ** 2 +
			unsprungMass * q[3] ** 2 +
			springRate * (q[0] - q[2]) ** 2 +
			tyreStiffness * q[2] ** 2) /
		2
	)
}

/** RK4 samples the moving road at the same intermediate times as the masses. */
export function integrateQuarterCar(
	q: Vector4,
	time: number,
	dt: number,
	roadAt: (time: number) => number,
	damping: number,
): Vector4 {
	const add = (d: Vector4, factor: number) => q.map((v, i) => v + d[i] * factor) as Vector4
	const a = quarterCarDerivative(q, roadAt(time), damping)
	const b = quarterCarDerivative(add(a, dt / 2), roadAt(time + dt / 2), damping)
	const c = quarterCarDerivative(add(b, dt / 2), roadAt(time + dt / 2), damping)
	const d = quarterCarDerivative(add(c, dt), roadAt(time + dt), damping)
	return q.map((v, i) => v + (dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6) as Vector4
}

function sample(state: SuspensionState): SuspensionSample {
	return {
		time: state.time,
		road: state.front.road,
		wheel: state.front.wheel,
		body: state.front.body,
		rearRoad: state.rear.road,
		rearWheel: state.rear.wheel,
		rearBody: state.rear.body,
	}
}

export function createSuspensionState(
	parameters: Partial<SuspensionParameters> = {},
): SuspensionState {
	const state: SuspensionState = {
		time: 0,
		active: true,
		settled: false,
		front: emptyQuarter(),
		rear: emptyQuarter(),
		heave: 0,
		pitch: 0,
		distance: 0,
		wheelAngle: 0,
		accumulator: 0,
		stepCount: 0,
		settlingTime: 0,
		parameters: {
			speedKmh: G.defaultSpeedKmh,
			bumpHeight: S.suspension.bumpHeight,
			damping: S.suspension.damping,
			restartToken: 0,
			...parameters,
		},
		history: [],
	}
	state.history.push(sample(state))
	return state
}

/** Mutates one shared state; components consume it, and never run their own clock. */
export function advanceSuspension(state: SuspensionState, input: SuspensionInput) {
	const parameters = {
		speedKmh: clamp(input.speedKmh, ...G.speedRange),
		bumpHeight: clamp(input.bumpHeight, ...G.bumpRange),
		damping: clamp(input.damping, ...G.dampingRange),
		restartToken: input.restartToken ?? 0,
	}
	if (
		(Object.keys(parameters) as (keyof SuspensionParameters)[]).some(
			(key) => parameters[key] !== state.parameters[key],
		)
	) {
		Object.assign(state, createSuspensionState(parameters))
	}
	if (input.paused || !state.active || !Number.isFinite(input.dt) || input.dt <= 0) return state
	state.accumulator += input.dt / Math.max(1, input.slowdown)
	const road = (axle: 'front' | 'rear', time: number) =>
		suspensionRoad(time, axle, parameters.speedKmh, parameters.bumpHeight)
	const rearExitTime =
		G.firstContactTime + (S.dimensions.wheelbase + G.bumpWidth) / (parameters.speedKmh / 3.6)
	while (state.accumulator + 1e-12 >= G.fixedStep && state.active) {
		for (const axle of ['front', 'rear'] as const) {
			const p = state[axle]
			const q = integrateQuarterCar(
				[p.body, p.bodyVelocity, p.wheel, p.wheelVelocity],
				state.time,
				G.fixedStep,
				(t) => road(axle, t),
				parameters.damping,
			)
			p.body = q[0]
			p.bodyVelocity = q[1]
			p.wheel = q[2]
			p.wheelVelocity = q[3]
			p.road = road(axle, state.time + G.fixedStep)
		}
		state.stepCount++
		state.time = state.stepCount * G.fixedStep
		state.accumulator = Math.max(0, state.accumulator - G.fixedStep)
		state.heave = (state.front.body + state.rear.body) / 2
		state.pitch = Math.atan2(state.front.body - state.rear.body, S.dimensions.wheelbase)
		state.distance = (state.time * parameters.speedKmh) / 3.6
		state.wheelAngle = state.distance / S.wheels.radius
		const quiet = [state.front, state.rear].every(
			(p) =>
				Math.max(Math.abs(p.body), Math.abs(p.wheel)) < G.settlingPosition &&
				Math.max(Math.abs(p.bodyVelocity), Math.abs(p.wheelVelocity)) < G.settlingVelocity,
		)
		state.settlingTime = quiet && state.time > rearExitTime ? state.settlingTime + G.fixedStep : 0
		if (
			state.settlingTime >= G.settlingDuration ||
			state.time >= rearExitTime + G.maximumRingdownTime
		) {
			state.active = false
			state.settled = state.settlingTime >= G.settlingDuration
			state.accumulator = 0
		}
		if (state.stepCount % G.historyEverySteps === 0 || !state.active)
			state.history.push(sample(state))
	}
	return state
}
