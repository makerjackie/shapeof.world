export type OrbitalElements = { a: number; e: number; i: number; L: number; lp: number; node: number }
function degToRad(deg: number) {
	return (deg * Math.PI) / 180
}

function solveKepler(M: number, e: number) {
	// Monotone bracketed solve remains stable for near-parabolic comets.
	let lo = 0,
		hi = Math.PI * 2
	let E = e < 0.8 ? M : Math.PI
	for (let iteration = 0; iteration < 64; iteration++) {
		const f = E - e * Math.sin(E) - M
		if (Math.abs(f) < 1e-13) break
		if (f > 0) hi = E
		else lo = E
		const next = E - f / (1 - e * Math.cos(E))
		E = next > lo && next < hi ? next : (lo + hi) / 2
	}
	return E
}

export function orbitalPeriodDays(elements: OrbitalElements) {
	return Math.pow(elements.a, 1.5) * 365.25
}

export function orbitalPosition(
	elements: OrbitalElements,
	simDays: number,
	periodDays = orbitalPeriodDays(elements),
): [number, number, number] {
	const { a, e, i, L, lp, node } = elements
	const inc = degToRad(i)
	const Lr = degToRad(L)
	const lpRad = degToRad(lp)
	const nodeRad = degToRad(node)
	const M = ((((Lr - lpRad) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) + ((2 * Math.PI) / periodDays) * simDays
	const E = solveKepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e)
	const x = a * (Math.cos(E) - e)
	const y = a * Math.sqrt(1 - e * e) * Math.sin(E)
	const arg = lpRad - nodeRad
	const cosArg = Math.cos(arg)
	const sinArg = Math.sin(arg)
	const cosNode = Math.cos(nodeRad)
	const sinNode = Math.sin(nodeRad)
	const cosInc = Math.cos(inc)
	const sinInc = Math.sin(inc)
	const X = (cosNode * cosArg - sinNode * sinArg * cosInc) * x + (-cosNode * sinArg - sinNode * cosArg * cosInc) * y
	const Y = sinArg * sinInc * x + cosArg * sinInc * y
	const Z = (sinNode * cosArg + cosNode * sinArg * cosInc) * x + (-sinNode * sinArg + cosNode * cosArg * cosInc) * y
	// Right-handed Y-up mapping of ecliptic (X, Y, Z): (X, Z, -Y).
	return [X, Y, -Z]
}

export function orbitPathPoints(elements: OrbitalElements, segments = 420): Float32Array {
	const pts = new Float32Array(segments * 3)
	const { a, e, i, node, lp } = elements
	const inc = degToRad(i)
	const nodeRad = degToRad(node)
	const arg = degToRad(lp - node)
	const cosArg = Math.cos(arg)
	const sinArg = Math.sin(arg)
	const cosNode = Math.cos(nodeRad)
	const sinNode = Math.sin(nodeRad)
	const cosInc = Math.cos(inc)
	const sinInc = Math.sin(inc)
	for (let s = 0; s < segments; s++) {
		const M = (s / segments) * 2 * Math.PI
		const x = a * (Math.cos(M) - e)
		const y = a * Math.sqrt(1 - e * e) * Math.sin(M)
		pts[s * 3] = (cosNode * cosArg - sinNode * sinArg * cosInc) * x + (-cosNode * sinArg - sinNode * cosArg * cosInc) * y
		pts[s * 3 + 1] = sinArg * sinInc * x + cosArg * sinInc * y
		pts[s * 3 + 2] = -((sinNode * cosArg + cosNode * sinArg * cosInc) * x + (-sinNode * sinArg + cosNode * cosArg * cosInc) * y)
	}
	return pts
}

// View-only compression, constant along each ellipse; orbital periods are unchanged.
export function orbitScale(a: number) {
	// Keep eccentric inner orbits separated; compress the empty outer reaches logarithmically.
	const innerEdge = 1.524
	const innerRadius = 95 * Math.pow(innerEdge, 0.4)
	const radius = a <= innerEdge ? 95 * Math.pow(a, 0.4) : innerRadius + 30 * Math.log(a / innerEdge)
	return radius / a
}
// ESA Gaia DR3: sin(beta) ≈ .8677 sin(l - 6.38°), for b=0.
// Local circular Galactic motion is l=90°. Azimuth here is schematic.
const vertical = 0.8677 * Math.sin(((90 - 6.38) * Math.PI) / 180)
export const GALACTIC_DIRECTION = [Math.sqrt(1 - vertical * vertical), vertical, 0] as const
export const GALACTIC_HISTORY_DAYS = 1800
export const GALACTIC_DISPLAY_SPEED = 0.65
export function historyPosition(elements: OrbitalElements, now: number, age: number, blend: number): [number, number, number] {
	const p = orbitalPosition(elements, now - age)
	const scale = orbitScale(elements.a)
	return p.map((v, i) => v * scale - GALACTIC_DIRECTION[i] * age * GALACTIC_DISPLAY_SPEED * blend) as [number, number, number]
}
