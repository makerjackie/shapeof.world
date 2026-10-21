/** Two-flavour vacuum approximation, L in km, E in GeV, Δm² in eV².
 * PDG 2025 Neutrino Masses, Mixing, and Oscillations, vacuum oscillations.
 * This is a teaching model, not a three-flavour fit or matter propagation.
 */
export function conversionProbability(distance: number, energy: number, mixingDegrees = 33, deltaMassSquared = 0.0025) {
 if (![distance,energy,mixingDegrees,deltaMassSquared].every(Number.isFinite)||energy<=0||distance<0) return 0
 return Math.sin(2*mixingDegrees*Math.PI/180)**2 * Math.sin(1.267*deltaMassSquared*distance/energy)**2
}
/** Normalized radial density for hydrogen 1s, in units of a₀. */
export function hydrogenRadialDensity(r: number) { return r<0?0:4*r*r*Math.exp(-2*r) }
