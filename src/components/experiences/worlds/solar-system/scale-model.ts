import { orbitalPosition, orbitScale } from './orbital-model'
import type { MoonData, PlanetData } from './solar-data'

export type ScaleMode = 'physical' | 'illustrated'
export const AU_KM = 149597870.7
export const SUN_RADIUS_KM = 695700
export const UNITS_PER_AU = 12
// One common body scale preserves every diameter ratio; only orbit distances compress.
export const ILLUSTRATED_UNITS_PER_KM = 32 / SUN_RADIUS_KM

/** Physical mode uses exactly ONE length scale, including the Sun and satellites. */
export function bodyRadius(km: number, mode: ScaleMode) {
	if (mode === 'physical') return (km / AU_KM) * UNITS_PER_AU
	return km * ILLUSTRATED_UNITS_PER_KM
}
export function orbitDisplayScale(a: number, mode: ScaleMode) {
	return mode === 'physical' ? UNITS_PER_AU : orbitScale(a)
}
export function moonRadius(moon: MoonData, _planet: PlanetData, mode: ScaleMode) {
	return bodyRadius(moon.radiusKm, mode)
}
export function moonOrbitRadius(moon: MoonData, planet: PlanetData, mode: ScaleMode) {
	if (mode === 'physical') return (moon.aKm / AU_KM) * UNITS_PER_AU
	if (moon.id === 'moon') return bodyRadius(planet.radiusKm, mode) * 8
	return bodyRadius(planet.radiusKm, mode) * (2 + 1.7 * Math.sqrt(moon.aKm / planet.radiusKm))
}
export function moonPosition(moon: MoonData, planet: PlanetData, mode: ScaleMode, days: number): [number, number, number] {
	const a = moonOrbitRadius(moon, planet, mode)
	const [x, y, z] = orbitalPosition(
		{ a, e: moon.e, i: moon.inclination, L: (moon.phase * 180) / Math.PI, lp: 0, node: 0 },
		days,
		moon.periodDays,
	)
	// Ecliptic Moon; other moons use an approximate parent equatorial frame.
	// Actual pole azimuths, nodes, apsidal/nodal precession are deliberately not claimed.
	const tilt = moon.frame === 'ecliptic' ? 0 : (planet.obliquity * Math.PI) / 180
	return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt), z]
}
/** Retrograde rotation is encoded ONCE, by obliquity > 90°, not again by a negative period. */
export function spinAngle(rotationHours: number, days: number) {
	return (((days * 24) / Math.abs(rotationHours)) % 1) * Math.PI * 2
}
export function solarDayHours(rotationHours: number, orbitDays: number) {
	return 1 / Math.abs(1 / rotationHours - 1 / (orbitDays * 24))
}
