/** Distances are micrometres throughout the scene, including the leaf. */
export const DIMENSIONS = {
  leaf: { length: 120_000, width: 80_000, thickness: 500 },
  cell: { width: 30, height: 70, depth: 30, wallThickness: 0.2 },
  chloroplast: { length: 6, width: 3.8, thickness: 2.3, count: 200 },
  nucleus: { diameter: 8, poreDiameter: 0.1 },
  mitochondrion: { minLength: 0.5, maxLength: 1.5 },
  peroxisome: { diameter: 1 },
  granum: { minDiameter: 0.3, maxDiameter: 0.55, minDiscs: 5, maxDiscs: 25 },
  stream: { minSpeed: 1, maxSpeed: 5 },
} as const

export type WaterState = 'normal' | 'drought' | 'saltwater'

/** Round 1 advances time and visual illumination only; no physiological outputs yet. */
export interface PlantEnvironment {
  /** Incident photon flux, µmol photons m⁻² s⁻¹. */
  I: number
  water: WaterState
  simulationSeconds: number
  timeScale: number
}

export const DEFAULT_ENVIRONMENT: Readonly<PlantEnvironment> = {
  I: 1800,
  water: 'normal',
  simulationSeconds: 0,
  timeScale: 1,
}

export function clampLight(I: number): number {
  return Number.isFinite(I) ? Math.max(0, Math.min(2000, I)) : DEFAULT_ENVIRONMENT.I
}

export function advanceSimulation(state: PlantEnvironment, elapsedSeconds: number): PlantEnvironment {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  const rate = Number.isFinite(state.timeScale) ? Math.max(0, state.timeScale) : 1
  return { ...state, simulationSeconds: state.simulationSeconds + elapsed * rate }
}

/** A display transfer function, deliberately not a photosynthesis model. */
export function getLightAppearance(I: number) {
  const fraction = clampLight(I) / 2000
  return {
    fraction,
    keyIntensity: 0.08 + 4.4 * Math.sqrt(fraction),
    fillIntensity: 0.11 + 0.24 * fraction,
    beamOpacity: 0.006 + 0.065 * fraction,
    chloroplastBrightness: 0.28 + 0.72 * Math.sqrt(fraction),
  }
}

/** Fixed seed makes the same reference cell survive zooms and remounts. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
