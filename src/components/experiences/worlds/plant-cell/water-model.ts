import type { WaterState } from './model'

/** Pressure-volume reference, not a cultivar fit. See SOURCES.md. MPa, seconds. */
export const WATER = {
  osmoticAtFullTurgor: -1.2, elasticity: 10, normalPsi: -.4, droughtPsi: -1.8,
  saltMolarity: .5, temperatureK: 293.15, gasConstant: .008314462618, vanTHoffFactor: 2,
  droughtSeconds: 3 * 3600, recoverySeconds: 30 * 60, saltSeconds: 5 * 60,
} as const
export const SALT_PSI = -WATER.vanTHoffFactor * WATER.saltMolarity * WATER.gasConstant * WATER.temperatureK
export const TLP_VOLUME = 1 + WATER.osmoticAtFullTurgor / WATER.elasticity
export const TLP_PSI = WATER.osmoticAtFullTurgor / TLP_VOLUME
const clamp01 = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0))
const ease = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t) }

/** Boyle–van't Hoff: pi*v = pi0; linear elastic wall, P>=0. v=1 at Psi=0. */
export function pressureVolume(psi: number) {
  const potential = Math.max(-10, Math.min(0, Number.isFinite(psi) ? psi : WATER.normalPsi))
  const b = WATER.elasticity + WATER.osmoticAtFullTurgor + potential
  const volume = potential <= TLP_PSI ? WATER.osmoticAtFullTurgor / potential
    : (b + Math.sqrt(b * b - 4 * WATER.elasticity * WATER.osmoticAtFullTurgor)) / (2 * WATER.elasticity)
  const osmotic = WATER.osmoticAtFullTurgor / volume
  return { psi: potential, osmotic, pressure: Math.max(0, potential - osmotic), volume }
}
export const NORMAL_VOLUME = pressureVolume(WATER.normalPsi).volume
export function waterStomatalFactor(psi: number) { return 1 - ease((-1 - psi) / (-1 - TLP_PSI)) }
export interface WaterModel {
  mode: WaterState; psi: number; immersion: number; fromPsi: number; fromImmersion: number;
  elapsed: number; duration: number; progress: number
}
const targetPsi = (mode: WaterState) => mode === 'normal' ? WATER.normalPsi : mode === 'drought' ? WATER.droughtPsi : SALT_PSI
/** URL state explicitly initializes progress; ordinary UI changes begin at the current state. */
export function createWater(mode: WaterState = 'normal', progress = mode === 'normal' ? 0 : 1): WaterModel {
  const duration = mode === 'drought' ? WATER.droughtSeconds : WATER.saltSeconds
  const p = mode === 'normal' ? 1 : clamp01(progress), blend = ease(p)
  return { mode, psi: WATER.normalPsi + (targetPsi(mode) - WATER.normalPsi) * blend,
    immersion: mode === 'saltwater' ? blend : 0, fromPsi: WATER.normalPsi, fromImmersion: 0,
    elapsed: p * duration, duration, progress: p }
}
/** Pure, continuous on reversal, and independent of timestep partition. */
export function advanceWater(previous: WaterModel, mode: WaterState, seconds: number): WaterModel {
  let state = previous
  if (mode !== state.mode) state = { ...state, mode, fromPsi: state.psi, fromImmersion: state.immersion,
    elapsed: 0, progress: 0, duration: mode === 'drought' ? WATER.droughtSeconds
      : mode === 'saltwater' || state.immersion > .01 ? WATER.saltSeconds : WATER.recoverySeconds }
  const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const elapsed = Math.min(state.duration, state.elapsed + dt), progress = elapsed / state.duration, blend = ease(progress)
  return { ...state, elapsed, progress, psi: state.fromPsi + (targetPsi(mode) - state.fromPsi) * blend,
    immersion: state.fromImmersion + ((mode === 'saltwater' ? 1 : 0) - state.fromImmersion) * blend }
}
export function getWaterReadings(water: WaterModel) {
  const pv = pressureVolume(water.psi), relativeVolume = pv.volume / NORMAL_VOLUME
  const collapse = clamp01((TLP_VOLUME - pv.volume) / (TLP_VOLUME - .48))
  // Anisotropic shape with exactly sx*sy*sz=relativeVolume before small folds.
  const radial = relativeVolume ** .41, axial = relativeVolume ** .18
  return { ...pv, relativeVolume, immersion: water.immersion, progress: water.progress,
    radial, axial, wallRadial: radial + (1 - radial) * water.immersion,
    wallAxial: axial + (1 - axial) * water.immersion,
    wrinkles: collapse * (1 - water.immersion), wilt: collapse,
    concavity: water.immersion * Math.sin(Math.PI * clamp01((1 - relativeVolume) / .49)) * .045,
    stomatalFactor: waterStomatalFactor(water.psi) }
}
export type WaterReadings = ReturnType<typeof getWaterReadings>
