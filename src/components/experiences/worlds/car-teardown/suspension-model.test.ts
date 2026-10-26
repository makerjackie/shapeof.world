import {describe, expect, it} from 'vitest'
import {SUSPENSION_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'
import {
	advanceSuspension,
	createSuspensionState,
	integrateQuarterCar,
	quarterCarDerivative,
	quarterCarEnergy,
	rearAxleDelay,
	staticSuspensionSag,
	suspensionBump,
	suspensionRoad,
} from './suspension-model'

const parameters = {
	slowdown: 1,
	speedKmh: G.defaultSpeedKmh,
	bumpHeight: S.suspension.bumpHeight,
	damping: S.suspension.damping,
	restartToken: 0,
}
function run(duration: number, fps = 60, damping: number = S.suspension.damping, slowdown = 1) {
	const state = createSuspensionState({damping})
	for (let i = 0; i < Math.round(duration * fps); i++) advanceSuspension(state, {...parameters, damping, slowdown, dt: 1 / fps})
	return state
}

describe('suspension at its loaded static equilibrium', () => {
	it('balances body weight in the spring and total quarter weight in the tyre', () => {
		const sag = staticSuspensionSag()
		expect(sag.spring).toBeCloseTo(0.11772, 8)
		expect(sag.tyre).toBeCloseTo(0.015696, 8)
		expect(sag.spring * S.suspension.springRate).toBeCloseTo(S.suspension.sprungMass * G.gravity, 10)
		expect(sag.tyre * S.suspension.tyreStiffness).toBeCloseTo((S.suspension.sprungMass + S.suspension.unsprungMass) * G.gravity, 10)
		expect(quarterCarDerivative([0, 0, 0, 0], 0)).toEqual([0, -0, 0, 0])
	})
	it('has a single smooth 5 cm road bump and the exact rear-wheel delay L/v', () => {
		expect(suspensionBump(-1, 0.05)).toBe(0)
		expect(suspensionBump(0, 0.05)).toBe(0)
		expect(suspensionBump(G.bumpWidth / 2, 0.05)).toBeCloseTo(0.05, 12)
		expect(suspensionBump(G.bumpWidth, 0.05)).toBe(0)
		expect(suspensionBump(G.bumpWidth + 1, 0.05)).toBe(0)
		const delay = rearAxleDelay(20)
		expect(delay).toBeCloseTo(0.50395374, 12)
		for (let t = 0; t <= 3; t += 0.013)
			expect(suspensionRoad(t + delay, 'rear', 20, 0.05)).toBeCloseTo(suspensionRoad(t, 'front', 20, 0.05), 12)
	})
	it('is not driven before the first front contact and responds at the rear later', () => {
		const before = run(G.firstContactTime)
		expect(before.front.wheel).toBe(0)
		expect(before.rear.wheel).toBe(0)
		const crossing = run(G.firstContactTime + 0.1)
		expect(crossing.front.wheel).toBeGreaterThan(0.02)
		expect(crossing.rear.wheel).toBe(0)
		expect(crossing.pitch).toBeGreaterThan(0)
	})
})

describe('fixed-step RK4 and damping', () => {
	it('matches at 24, 60 and 120 frames/s and separates physical time from slowdown', () => {
		const a = run(2, 24),
			b = run(2, 60),
			c = run(2, 120),
			slow = run(4, 60, 3000, 2)
		for (const state of [b, c, slow]) {
			expect(state.time).toBeCloseTo(a.time, 12)
			expect(state.front.body).toBeCloseTo(a.front.body, 12)
			expect(state.rear.wheel).toBeCloseTo(a.rear.wheel, 12)
			expect(state.history).toEqual(a.history)
		}
	})
	it('dissipates free-oscillation energy and increased damping reduces ring-down', () => {
		let q: [number, number, number, number] = [0.04, 0, 0, 0]
		for (let i = 0; i < 960; i++) {
			const energy = quarterCarEnergy(q)
			q = integrateQuarterCar(q, i * G.fixedStep, G.fixedStep, () => 0, 3000)
			expect(quarterCarEnergy(q)).toBeLessThanOrEqual(energy + 1e-8)
		}
		const low = run(4, 60, 2000),
			damped = run(4, 60, 4500)
		const ringdown = (state: typeof low) => Math.max(...state.history.filter((p) => p.time > 1.6).map((p) => Math.abs(p.body)))
		expect(ringdown(damped)).toBeLessThan(ringdown(low) * 0.4)
	})
	it('reduces rebound overshoot through soft, standard and firm damping presets', () => {
		// Higher damping also transmits more of the first impact. The overshoot
		// being compared is the rebound below the original static ride height.
		const rebound = G.dampingPresets.map((damping) => -Math.min(...run(4, 60, damping).history.map((p) => p.body)))
		expect(rebound[1]).toBeLessThan(rebound[0])
		expect(rebound[2]).toBeLessThan(rebound[1])
	})
	it('keeps every offered speed, bump and damper combination finite and stable', () => {
		for (const speedKmh of G.speedRange)
			for (const bumpHeight of G.bumpRange)
				for (const damping of G.dampingPresets) {
					const state = createSuspensionState({speedKmh, bumpHeight, damping})
					for (let i = 0; i < 600; i++) advanceSuspension(state, {...parameters, speedKmh, bumpHeight, damping, dt: 1 / 60})
					expect(state.settled).toBe(true)
					for (const p of state.history) {
						expect(Number.isFinite(p.body + p.wheel)).toBe(true)
						expect(Math.abs(p.body)).toBeLessThan(bumpHeight * 2)
					}
				}
	})
	it('converges against a half-step integrator during the fast tyre response', () => {
		let coarse: [number, number, number, number] = [0, 0, 0, 0],
			fine = [...coarse] as typeof coarse
		const road = (t: number) => suspensionRoad(t, 'front', 35, 0.08)
		for (let i = 0; i < 480; i++) {
			coarse = integrateQuarterCar(coarse, i * G.fixedStep, G.fixedStep, road, 1000)
			fine = integrateQuarterCar(fine, i * G.fixedStep, G.fixedStep / 2, road, 1000)
			fine = integrateQuarterCar(fine, (i + 0.5) * G.fixedStep, G.fixedStep / 2, road, 1000)
		}
		for (let i = 0; i < 4; i++) expect(coarse[i]).toBeCloseTo(fine[i], 5)
	})
	it('pauses every quantity together, settles once and can replay or reset parameters', () => {
		const state = run(1)
		const frozen = structuredClone(state)
		advanceSuspension(state, {...parameters, dt: 5, paused: true})
		expect(state).toEqual(frozen)
		for (let i = 0; i < 600; i++) advanceSuspension(state, {...parameters, dt: 1 / 60})
		expect(state.active).toBe(false)
		expect(state.settled).toBe(true)
		const stoppedAt = state.time
		advanceSuspension(state, {...parameters, dt: 5})
		expect(state.time).toBe(stoppedAt)
		advanceSuspension(state, {...parameters, restartToken: 1, dt: 0})
		expect(state.time).toBe(0)
		expect(state.active).toBe(true)
		expect(state.history).toHaveLength(1)
		advanceSuspension(state, {...parameters, speedKmh: 30, dt: 0})
		expect(state.parameters.speedKmh).toBe(30)
		expect(state.front.body).toBe(0)
	})
})
