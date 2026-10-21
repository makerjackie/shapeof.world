/** Hydrogen 1s position in Bohr radii: radial density 4 r² exp(-2r), isotropic angles. */
export function sampleHydrogenPosition(random: () => number = Math.random) {
	const uniform = () => Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, random()))
	const r = -(Math.log(uniform()) + Math.log(uniform()) + Math.log(uniform())) / 2
	const z = 2 * uniform() - 1
	const phi = 2 * Math.PI * uniform()
	const planar = r * Math.sqrt(1 - z * z)
	return { x: planar * Math.cos(phi), y: planar * Math.sin(phi), z: r * z, r }
}
