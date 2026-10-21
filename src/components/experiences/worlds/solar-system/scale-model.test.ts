import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { PLANETS, MOONS } from './solar-data'
import { orbitalPosition, orbitalPeriodDays, orbitPathPoints } from './orbital-model'
import {
	AU_KM,
	UNITS_PER_AU,
	SUN_RADIUS_KM,
	bodyRadius,
	orbitDisplayScale,
	moonOrbitRadius,
	moonRadius,
	moonPosition,
	spinAngle,
	solarDayHours,
} from './scale-model'
const earth = PLANETS.find((p) => p.id === 'earth')!
const moon = MOONS.find((p) => p.id === 'moon')!

describe('physical lengths and scientific anchors', () => {
	it('uses one km-to-scene conversion for the Sun, every planet, every moon and every orbit', () => {
		const kmScale = UNITS_PER_AU / AU_KM
		for (const km of [SUN_RADIUS_KM, ...PLANETS.map((p) => p.radiusKm)]) expect(bodyRadius(km, 'physical') / km).toBeCloseTo(kmScale, 15)
		for (const p of PLANETS) {
			expect(orbitDisplayScale(p.elements.a, 'physical')).toBe(UNITS_PER_AU)
			for (const m of p.moons) {
				expect(moonRadius(m, p, 'physical') / m.radiusKm).toBeCloseTo(kmScale, 15)
				expect(moonOrbitRadius(m, p, 'physical') / m.aKm).toBeCloseTo(kmScale, 15)
			}
		}
		expect(moonOrbitRadius(moon, earth, 'physical') / (2 * bodyRadius(earth.radiusKm, 'physical'))).toBeCloseTo(30.168, 2)
		expect(bodyRadius(SUN_RADIUS_KM, 'physical') / bodyRadius(earth.radiusKm, 'physical')).toBeCloseTo(109.198, 2)
	})
	it('does not impose a visibility floor on Phobos or Deimos at true scale', () => {
		const mars = PLANETS.find((p) => p.id === 'mars')!
		expect(moonRadius(mars.moons[1], mars, 'physical') / bodyRadius(mars.radiusKm, 'physical')).toBeCloseTo(6.2 / 3389.5, 10)
	})
	it('keeps all illustrated moons clear of the parent body and its rings', () => {
		for (const p of PLANETS)
			for (const m of p.moons) {
				expect(moonOrbitRadius(m, p, 'illustrated') * (1 - m.e) - moonRadius(m, p, 'illustrated')).toBeGreaterThan(
					bodyRadius(p.radiusKm, 'illustrated') * (p.rings?.outer ?? 1),
				)
			}
	})
	it('has 20 unique satellites with valid parents and positive physical data', () => {
		expect(MOONS).toHaveLength(20)
		expect(new Set(MOONS.map((m) => m.id)).size).toBe(20)
		for (const m of MOONS) {
			expect(PLANETS.some((p) => p.id === m.parentId)).toBe(true)
			expect(m.aKm).toBeGreaterThan(m.radiusKm)
			expect(m.periodDays).toBeGreaterThan(0)
		}
		expect(PLANETS.slice(0, 2).every((p) => p.moons.length === 0)).toBe(true)
	})
})
describe('illustrated body proportions', () => {
	it('preserves Sun, planet and moon size ratios without a minimum sphere radius', () => {
		const scale = bodyRadius(SUN_RADIUS_KM, 'illustrated') / SUN_RADIUS_KM
		for (const planet of PLANETS) {
			expect(bodyRadius(planet.radiusKm, 'illustrated') / planet.radiusKm).toBeCloseTo(scale, 14)
			for (const moon of planet.moons) expect(moonRadius(moon, planet, 'illustrated') / moon.radiusKm).toBeCloseTo(scale, 14)
		}
		const jupiter = PLANETS.find((p) => p.id === 'jupiter')!
		expect(bodyRadius(jupiter.radiusKm, 'illustrated') / bodyRadius(SUN_RADIUS_KM, 'illustrated')).toBeCloseTo(0.10049, 5)
	})
	it('keeps Mercury outside the illustrated solar surface throughout its orbit', () => {
		const mercury = PLANETS[0]
		const perihelion = mercury.elements.a * (1 - mercury.elements.e) * orbitDisplayScale(mercury.elements.a, 'illustrated')
		expect(perihelion).toBeGreaterThan(bodyRadius(SUN_RADIUS_KM, 'illustrated') + bodyRadius(mercury.radiusKm, 'illustrated'))
	})
})
describe('orbital direction and time', () => {
	it('maps the ecliptic into right-handed Y-up coordinates, with prograde motion', () => {
		const elements = { a: 1, e: 0, i: 0, L: 0, lp: 0, node: 0 }
		expect(orbitalPosition(elements, 0)).toEqual([1, 0, -0])
		const quarter = orbitalPosition(elements, 365.25 / 4)
		expect(quarter[2]).toBeCloseTo(-1, 10)
		const path = orbitPathPoints(elements, 4)
		expect(path[5]).toBeCloseTo(-1, 7)
		const j2000Earth = orbitalPosition(earth.elements, 0)
		expect(j2000Earth[0]).toBeCloseTo(-0.1772, 3)
		expect(j2000Earth[2]).toBeCloseTo(-0.9672, 3)
	})
	it('distinguishes Venus rotation from its solar day and does not double-reverse its spin', () => {
		const venus = PLANETS.find((p) => p.id === 'venus')!
		expect(solarDayHours(venus.rotationHours, orbitalPeriodDays(venus.elements)) / 24).toBeCloseTo(116.75, 1)
		expect(spinAngle(-100, 1)).toBe(spinAngle(100, 1))
		expect(Math.cos((venus.obliquity * Math.PI) / 180)).toBeLessThan(0)
	})
	it('preserves moon periods under both scale mappings, including negative time', () => {
		for (const mode of ['physical', 'illustrated'] as const)
			for (const p of PLANETS)
				for (const m of p.moons) {
					const start = moonPosition(m, p, mode, -8)
					const end = moonPosition(m, p, mode, -8 + m.periodDays)
					start.forEach((x, i) => expect(x).toBeCloseTo(end[i], 8))
					expect(Math.hypot(...start)).toBeGreaterThanOrEqual(moonOrbitRadius(m, p, mode) * (1 - m.e) - 1e-10)
					expect(Math.hypot(...start)).toBeLessThanOrEqual(moonOrbitRadius(m, p, mode) * (1 + m.e) + 1e-10)
				}
	})
	it('renders Triton retrograde relative to the parent equator', () => {
		const triton = MOONS.find((m) => m.id === 'triton')!
		const neptune = PLANETS.find((p) => p.id === 'neptune')!
		const p = moonPosition(triton, neptune, 'physical', 0)
		const q = moonPosition(triton, neptune, 'physical', 0.001)
		const angularMomentum = [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
		const tilt = (neptune.obliquity * Math.PI) / 180
		expect(-Math.sin(tilt) * angularMomentum[0] + Math.cos(tilt) * angularMomentum[1]).toBeLessThan(0)
	})
})

describe('educational overview projection', () => {
	it('keeps apparent Sun/Jupiter diameter ratio independent of orbital depth', () => {
		const camera = new THREE.OrthographicCamera(-220, 220, 115, -115, 0.01, 60000)
		camera.position.set(0, 500, 1000)
		camera.lookAt(0, 0, 0)
		camera.updateMatrixWorld()
		const projectedDiameter = (radius: number, z: number) => {
			const a = new THREE.Vector3(-radius, 0, z).project(camera)
			const b = new THREE.Vector3(radius, 0, z).project(camera)
			return b.x - a.x
		}
		const jupiter = PLANETS.find((p) => p.id === 'jupiter')!
		for (const depth of [-180, 0, 180]) {
			expect(
				projectedDiameter(bodyRadius(jupiter.radiusKm, 'illustrated'), depth) /
					projectedDiameter(bodyRadius(SUN_RADIUS_KM, 'illustrated'), 0),
			).toBeCloseTo(jupiter.radiusKm / SUN_RADIUS_KM, 12)
		}
	})
	it('compresses outer orbits while retaining ordered semi-major axes and physical distances', () => {
		const axes = PLANETS.map((p) => p.elements.a * orbitDisplayScale(p.elements.a, 'illustrated'))
		expect(axes.at(-1)! / axes[2]).toBeLessThan(2.2)
		for (let i = 1; i < axes.length; i++) {
			expect(axes[i]).toBeGreaterThan(axes[i - 1])
			expect(axes[i] * (1 - PLANETS[i].elements.e)).toBeGreaterThan(axes[i - 1] * (1 + PLANETS[i - 1].elements.e))
		}
		for (const p of PLANETS) expect(p.elements.a * orbitDisplayScale(p.elements.a, 'physical')).toBe(p.elements.a * UNITS_PER_AU)
	})
})
