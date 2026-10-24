import { advanceChloroplastMotion, createChloroplastMotion, getChloroplastTargetWeights, type ChloroplastMotionState } from './chloroplast-motion'

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

/** Legacy clock shape retained for existing callers and zoom-model tests. */
export interface PlantEnvironment {
  /** Incident photon flux, µmol photons m⁻² s⁻¹. */
  I: number
  water: WaterState
  simulationSeconds: number
  timeScale: number
}

export const DEFAULT_ENVIRONMENT: Readonly<PlantEnvironment> = {
  I: 400,
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
  const brightness = Math.log1p(clampLight(I) / 80) / Math.log1p(2000 / 80)
  return {
    fraction,
    brightness,
    keyIntensity: brightness * 6.2,
    fillIntensity: brightness * 0.45,
    beamOpacity: 0.065 * brightness,
    chloroplastBrightness: 0.28 + 0.72 * Math.sqrt(fraction),
  }
}

export interface PlantInputs {
  /** Manual lamp PPFD, or noon PPFD when the explicit day cycle is enabled. */
  I: number
  water: WaterState
  playing: boolean
  timeScale: 0.001 | 1 | 60 | 3600
  dayCycle: boolean
}
export const DEFAULT_INPUTS: Readonly<PlantInputs> = { I: 400, water: 'normal', playing: true, timeScale: 1, dayCycle: false }

export const PHYSIOLOGY_PARAMETERS = {
  grossCapacity: 25, quantumYield: 0.05, curvature: 0.7, darkRespiration: 1,
  stomatalTimeConstantSeconds: 900, starchAllocation: 0.25,
  starchReferenceCapacity: 100_000, nightDurationSeconds: 43_200, nightUtilizationFraction: 0.95,
} as const

export interface PhysiologyState {
  simulationSeconds: number
  daySeconds: number
  actualPPFD: number
  grossAssimilation: number
  netAssimilation: number
  approximateNetOxygen: number
  stomatalOpening: number
  starchCarbonUmolPerM2: number
  starchFraction: number
  nightStartStarchCarbon: number
  nightDegradationRate: number
  nightActive: boolean
  /** Which light schedule supplied the current darkness-consumption horizon. */
  nightPlanDayCycle: boolean
  chloroplasts: ChloroplastMotionState
}
export interface PhysiologySnapshot {
  simulationSeconds: number
  daySeconds: number
  actualPPFD: number
  netAssimilation: number
  approximateNetOxygen: number
  stomatalOpening: number
  starchFraction: number
  starchCarbonUmolPerM2: number
  timeScale: number
  playing: boolean
  /** Centres on the upper rounded cap, y >= 23 µm in the reference cell. */
  topChloroplastCount: number
}

/**
 * Reference NRH, not a cultivar fit. Capacity is GROSS: net asymptote is 24.
 * Spinach A=21.87 at PPFD 2500: doi:10.1093/aobpla/plaa067.
 * Other growth conditions give lower capacities: doi:10.3390/plants12051149.
 * All carbon/oxygen fluxes are µmol m⁻² s⁻¹ of leaf area. The 1:1 net O₂
 * estimate omits separate photorespiration and alternative electron pathways.
 */
export function evaluatePhotosynthesis(ppfd: number) {
  const { quantumYield, grossCapacity, curvature, darkRespiration } = PHYSIOLOGY_PARAMETERS
  const photons = quantumYield * clampLight(ppfd), sum = photons + grossCapacity
  const discriminant = Math.max(0, sum * sum - 4 * curvature * photons * grossCapacity)
  const grossAssimilation = 2 * photons * grossCapacity / (sum + Math.sqrt(discriminant))
  const netAssimilation = grossAssimilation - darkRespiration
  return { grossAssimilation, netAssimilation, approximateNetOxygen: netAssimilation }
}

const DAY = 86_400, DAWN = 21_600, DUSK = 64_800
export function getActualPPFD(inputs: PlantInputs, daySeconds: number): number {
  const lamp = clampLight(inputs.I)
  if (!inputs.dayCycle) return lamp
  const phase = ((daySeconds % DAY) + DAY) % DAY
  if (phase <= DAWN || phase >= DUSK) return 0
  return lamp * Math.sin(Math.PI * (phase - DAWN) / (DUSK - DAWN))
}
export function getStomatalTarget(ppfd: number): number {
  const light = clampLight(ppfd)
  return light / (light + 80)
}
export function advanceStomatalOpening(opening: number, ppfd: number, dtSimSeconds: number): number {
  const target = getStomatalTarget(ppfd)
  const dt = Number.isFinite(dtSimSeconds) ? Math.max(0, dtSimSeconds) : 0
  return target + (Math.max(0, Math.min(1, opening)) - target) * Math.exp(-dt / PHYSIOLOGY_PARAMETERS.stomatalTimeConstantSeconds)
}

function refreshReadings(state: PhysiologyState, inputs: PlantInputs): void {
  state.actualPPFD = getActualPPFD(inputs, state.daySeconds)
  Object.assign(state, evaluatePhotosynthesis(state.actualPPFD))
  state.starchFraction = Math.max(0, Math.min(1, state.starchCarbonUmolPerM2 / PHYSIOLOGY_PARAMETERS.starchReferenceCapacity))
  Object.assign(state.chloroplasts.modeWeights, getChloroplastTargetWeights(state.actualPPFD))
}

export function createPhysiology(inputs: PlantInputs = { ...DEFAULT_INPUTS }): PhysiologyState {
  const state: PhysiologyState = {
    simulationSeconds: 0, daySeconds: 8 * 3600, actualPPFD: 0,
    grossAssimilation: 0, netAssimilation: 0, approximateNetOxygen: 0,
    stomatalOpening: getStomatalTarget(getActualPPFD(inputs, 8 * 3600)),
    starchCarbonUmolPerM2: PHYSIOLOGY_PARAMETERS.starchReferenceCapacity * 0.35, starchFraction: 0.35,
    nightStartStarchCarbon: 0, nightDegradationRate: 0, nightActive: false, nightPlanDayCycle: inputs.dayCycle,
    chloroplasts: createChloroplastMotion(),
  }
  refreshReadings(state, inputs)
  return state
}

/**
 * Caller-owned state, deterministic and independent of rendering. Pass raw
 * elapsed seconds; timeScale is applied exactly once and elapsed is not capped.
 * Starch allocation .25 is illustrative: spinach table 3/4 implies .186–.286
 * (doi:10.3390/plants12040804). Near-linear night use is inspired by Arabidopsis
 * (doi:10.7554/eLife.00669), not a spinach circadian-chemistry fit.
 */
export function advancePhysiology(state: PhysiologyState, inputs: PlantInputs, realElapsedSeconds: number): void {
  const elapsed = Number.isFinite(realElapsedSeconds) ? Math.max(0, realElapsedSeconds) : 0
  let remaining = inputs.playing ? elapsed * inputs.timeScale : 0
  if (!Number.isFinite(remaining) || remaining < 0) remaining = 0
  while (remaining > 1e-9) {
    let dt = Math.min(15, remaining)
    if (inputs.dayCycle) {
      const nextBoundary = state.daySeconds < DAWN ? DAWN : state.daySeconds < DUSK ? DUSK : DAY
      dt = Math.min(dt, nextBoundary - state.daySeconds || dt)
    }
    const irradiance = getActualPPFD(inputs, state.daySeconds + dt / 2)
    const dark = irradiance === 0
    if (dark && (!state.nightActive || state.nightPlanDayCycle !== inputs.dayCycle)) {
      state.nightStartStarchCarbon = state.starchCarbonUmolPerM2
      const untilDawn = inputs.dayCycle ? (DAWN - state.daySeconds + DAY) % DAY || DAY : PHYSIOLOGY_PARAMETERS.nightDurationSeconds
      state.nightDegradationRate = state.nightStartStarchCarbon * PHYSIOLOGY_PARAMETERS.nightUtilizationFraction / untilDawn
      state.nightPlanDayCycle = inputs.dayCycle
    }
    state.nightActive = dark
    const carbonRate = dark ? -state.nightDegradationRate : PHYSIOLOGY_PARAMETERS.starchAllocation * Math.max(0, evaluatePhotosynthesis(irradiance).netAssimilation)
    state.starchCarbonUmolPerM2 = Math.max(0, Math.min(PHYSIOLOGY_PARAMETERS.starchReferenceCapacity, state.starchCarbonUmolPerM2 + carbonRate * dt))
    state.stomatalOpening = advanceStomatalOpening(state.stomatalOpening, irradiance, dt)
    advanceChloroplastMotion(state.chloroplasts, irradiance, dt)
    state.simulationSeconds += dt
    state.daySeconds = (state.daySeconds + dt) % DAY
    remaining -= dt
  }
  refreshReadings(state, inputs)
}

/** Small copy for a 5 Hz UI callback; the persistent poses stay in the ref. */
export function getPhysiologySnapshot(state: PhysiologyState, inputs: PlantInputs): PhysiologySnapshot {
  return {
    simulationSeconds: state.simulationSeconds, daySeconds: state.daySeconds,
    actualPPFD: state.actualPPFD, netAssimilation: state.netAssimilation,
    approximateNetOxygen: state.approximateNetOxygen, stomatalOpening: state.stomatalOpening,
    starchFraction: state.starchFraction, starchCarbonUmolPerM2: state.starchCarbonUmolPerM2,
    timeScale: inputs.timeScale, playing: inputs.playing,
    topChloroplastCount: state.chloroplasts.poses.filter(pose => pose.positionUm[1] >= 23).length,
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
