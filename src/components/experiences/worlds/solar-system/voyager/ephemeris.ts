import { AU_KM, UNITS_PER_AU } from '../scale-model'
export type Vec3 = [number, number, number]
export type Track = {
	rows: number[][]
	maxCheckedErrorKm: number
	toleranceKm: number
	seams?: { from: number; to: number; jumpKm: number }[]
}
export type Encounter = { id: string; closest: number; centerDistanceKm: number; body: Track; moons: Record<string, Track> }
export type Ephemeris = {
	version: 1
	mission: 1 | 2
	start: number
	end: number
	craft: Track
	planets: Record<string, Track>
	encounters: Encounter[]
}
export const DAY = 86400
export const YEAR = 365.25 * DAY
export const utc = (iso: string) => Date.parse(iso) / 1000
export const covers = (track: Track, t: number) => t >= track.rows[0][0] && t <= track.rows.at(-1)![0]
/** Pure, reversible cubic Hermite interpolation; never silently extrapolate. */
export function sampleTrack(track: Track, time: number): Vec3 {
	const rows = track.rows
	if (!Number.isFinite(time) || !covers(track, time)) throw new RangeError('Outside ephemeris coverage')
	let lo = 0,
		hi = rows.length - 1
	while (hi - lo > 1) {
		const mid = (lo + hi) >>> 1
		if (rows[mid][0] <= time) lo = mid
		else hi = mid
	}
	const a = rows[lo],
		b = rows[hi],
		dt = b[0] - a[0],
		f = (time - a[0]) / dt
	// Do not invent a high-speed curved path across a discontinuous source handoff.
	if (dt < 1 && track.seams?.some((s) => s.from === a[0])) return (f < 0.5 ? a : b).slice(1, 4) as Vec3
	const h0 = 2 * f ** 3 - 3 * f * f + 1,
		h1 = f ** 3 - 2 * f * f + f,
		h2 = -2 * f ** 3 + 3 * f * f,
		h3 = f ** 3 - f * f
	return [1, 2, 3].map((i) => h0 * a[i] + h1 * dt * a[i + 3] + h2 * b[i] + h3 * dt * b[i + 3]) as Vec3
}
export function craftPosition(data: Ephemeris, t: number): Vec3 {
	if (t <= data.end) return sampleTrack(data.craft, Math.max(t, data.start))
	// Explicit future illustration: constant terminal heliocentric velocity.
	// No claimed stellar encounter geometry, galactic tides or future manoeuvres.
	const last = data.craft.rows.at(-1)!
	return [1, 2, 3].map((i) => last[i] + last[i + 3] * (t - data.end)) as Vec3
}
export function bodyTrack(data: Ephemeris, id: string, t: number): Track | undefined {
	for (const encounter of data.encounters) {
		const track = encounter.id === id ? encounter.body : encounter.moons[id]
		if (track && covers(track, t)) return track
	}
	return data.planets[id]
}
export function bodyPosition(data: Ephemeris, id: string, t: number): Vec3 {
	if (id === 'sun') return [0, 0, 0]
	const track = bodyTrack(data, id, t)
	if (!track || !covers(track, t)) throw new RangeError(`No body coverage: ${id}`)
	return sampleTrack(track, t)
}
export function worldPosition(km: Vec3): Vec3 {
	const s = UNITS_PER_AU / AU_KM
	return [km[0] * s, km[2] * s, -km[1] * s]
}
export function validateEphemeris(value: unknown, mission: 1 | 2): Ephemeris {
	const d = value as Ephemeris
	if (d?.version !== 1 || d.mission !== mission || !(d.start < d.end) || !d.planets || !Array.isArray(d.encounters))
		throw new Error('Invalid ephemeris')
	const tracks = [d.craft, ...Object.values(d.planets), ...d.encounters.flatMap((e) => [e.body, ...Object.values(e.moons)])]
	for (const track of tracks) {
		if (
			!Array.isArray(track?.rows) ||
			track.rows.length < 2 ||
			track.rows.some((r, i) => r.length !== 7 || r.some((n) => !Number.isFinite(n)) || (i > 0 && r[0] <= track.rows[i - 1][0]))
		)
			throw new Error('Invalid ephemeris track')
	}
	return d
}
