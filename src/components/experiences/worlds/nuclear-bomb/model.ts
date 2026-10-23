/** Museum-level exponential-growth illustration; never an engineering simulation. */
export const FISSION_ENERGY_J = 3.20e-11
export const KILOTON_TNT_J = 4.184e12
export const GENERATION_NS = 10
export const DEFAULT_YIELD_KT = 15
export const DISPLAY_GENERATIONS = 12

/** Negative values are three unitless storyboard steps, not physical time. */
export const CHEMICAL_START = -3
export const CHEMICAL_PLAYBACK_SECONDS = 5.4

export type TimelinePhase = 'chemical' | 'chain' | 'disassembly'

export interface ChainSummary {
  energyJ: number
  fissions: number
  generations: number
  durationNs: number
}

export interface TimelineSample {
  phase: TimelinePhase
  chemicalProgress: number
  waveProgress: number
  /** Unitless display progress. No physical compression ratio is represented. */
  compression: number
  sourceFlash: number
  generation: number
  wholeGeneration: number
  generationFissions: number
  cumulativeFissions: number
  energyJ: number
  energyKt: number
  energyFraction: number
  elapsedNs: number
  heat: number
  whiteout: number
}

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value))
const smooth = (value: number) => {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}

function positiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`)
  return value
}

/** N(g) = 2^g - 1, smoothly interpolated between idealized generations. */
export function cumulativeFissionsAtGeneration(generation: number): number {
  return Math.expm1(Math.max(0, generation) * Math.LN2)
}

export function chainSummary(yieldKt = DEFAULT_YIELD_KT): ChainSummary {
  const energyJ = positiveFinite(yieldKt, 'yieldKt') * KILOTON_TNT_J
  const fissions = energyJ / FISSION_ENERGY_J
  positiveFinite(fissions, 'fissions')
  const generations = Math.log1p(fissions) / Math.LN2
  return { energyJ, fissions, generations, durationNs: generations * GENERATION_NS }
}

/** The large-generation limit of the last m generations' energy share. */
export function lastGenerationsEnergyFraction(generations: number): number {
  return -Math.expm1(-Math.max(0, generations) * Math.LN2)
}

/** All process appearance is sampled from time; scrubbing never integrates state. */
export function sampleTimeline(time = CHEMICAL_START, yieldKt = DEFAULT_YIELD_KT): TimelineSample {
  const summary = chainSummary(yieldKt)
  const t = Number.isFinite(time) ? clamp(time, CHEMICAL_START, summary.durationNs) : CHEMICAL_START
  const elapsedNs = Math.max(0, t)
  const generation = elapsedNs / GENERATION_NS
  const ended = t >= summary.durationNs
  const cumulativeFissions = ended ? summary.fissions : cumulativeFissionsAtGeneration(generation)
  const energyJ = cumulativeFissions * FISSION_ENERGY_J
  const energyFraction = clamp(energyJ / summary.energyJ)
  const chemicalProgress = clamp((t - CHEMICAL_START) / -CHEMICAL_START)
  return {
    phase: t < 0 ? 'chemical' : ended ? 'disassembly' : 'chain',
    chemicalProgress,
    waveProgress: smooth(t + 2),
    compression: smooth(t + 1),
    sourceFlash: t < 0 ? Math.sin(Math.PI * smooth((t + 0.4) / 0.8)) : 1 - smooth(t / 5),
    generation,
    wholeGeneration: Math.floor(generation),
    generationFissions: t < 0 ? 0 : 2 ** Math.floor(generation),
    cumulativeFissions,
    energyJ,
    energyKt: energyJ / KILOTON_TNT_J,
    energyFraction,
    elapsedNs,
    heat: generation < DISPLAY_GENERATIONS ? 0 : energyFraction,
    whiteout: smooth((energyFraction - 0.25) / 0.75),
  }
}

/** Presentation pacing: 2.5 seconds per generation, easing to 0.3 by generation 12. */
export function secondsPerGeneration(generation: number): number {
  return 0.3 + 2.2 * (1 - clamp(generation / DISPLAY_GENERATIONS)) ** 2
}

/** null means the storyboard segment has no physical clock to compare against. */
export function slowdownFactor(time: number, speed = 1): number | null {
  positiveFinite(speed, 'speed')
  return time < 0 ? null : secondsPerGeneration(time / GENERATION_NS) / (GENERATION_NS * 1e-9 * speed)
}

function reactionPlaybackSeconds(generation: number): number {
  const g = clamp(generation, 0, DISPLAY_GENERATIONS)
  const intro = 0.3 * g + 2.2 * (g - g ** 2 / 12 + g ** 3 / 432)
  return intro + Math.max(0, generation - DISPLAY_GENERATIONS) * 0.3
}

export function playbackSecondsAt(time: number, yieldKt = DEFAULT_YIELD_KT): number {
  const t = clamp(time, CHEMICAL_START, chainSummary(yieldKt).durationNs)
  if (t < 0) return (t - CHEMICAL_START) / -CHEMICAL_START * CHEMICAL_PLAYBACK_SECONDS
  return CHEMICAL_PLAYBACK_SECONDS + reactionPlaybackSeconds(t / GENERATION_NS)
}

/** Inverts the integrated pacing curve, avoiding frame-rate dependent playback. */
export function timelineAtPlaybackSeconds(seconds: number, yieldKt = DEFAULT_YIELD_KT): number {
  const summary = chainSummary(yieldKt)
  const endSeconds = CHEMICAL_PLAYBACK_SECONDS + reactionPlaybackSeconds(summary.generations)
  const s = clamp(seconds, 0, endSeconds)
  if (s <= 0) return CHEMICAL_START
  if (s >= endSeconds) return summary.durationNs
  if (s < CHEMICAL_PLAYBACK_SECONDS) return CHEMICAL_START + s / CHEMICAL_PLAYBACK_SECONDS * -CHEMICAL_START
  const reactionSeconds = s - CHEMICAL_PLAYBACK_SECONDS
  const introEnd = reactionPlaybackSeconds(DISPLAY_GENERATIONS)
  if (reactionSeconds >= introEnd) return (DISPLAY_GENERATIONS + (reactionSeconds - introEnd) / 0.3) * GENERATION_NS
  let low = 0
  let high = DISPLAY_GENERATIONS
  for (let iteration = 0; iteration < 48; iteration++) {
    const middle = (low + high) / 2
    if (reactionPlaybackSeconds(middle) < reactionSeconds) low = middle
    else high = middle
  }
  return (low + high) / 2 * GENERATION_NS
}

/** A negative delta supports reverse playback using the identical time mapping. */
export function advanceTimeline(time: number, deltaSeconds: number, speed = 1, yieldKt = DEFAULT_YIELD_KT): number {
  positiveFinite(speed, 'speed')
  return timelineAtPlaybackSeconds(playbackSecondsAt(time, yieldKt) + deltaSeconds * speed, yieldKt)
}

/** Steps through storyboard beats, then through integer reaction generations. */
export function stepTimeline(time: number, direction: -1 | 1, yieldKt = DEFAULT_YIELD_KT): number {
  if (time < 0) return clamp(Math.round(time) + direction, CHEMICAL_START, 0)
  if (time === 0 && direction === -1) return -1
  const generation = time / GENERATION_NS
  const target = direction === 1 ? Math.floor(generation + 1e-10) + 1 : Math.ceil(generation - 1e-10) - 1
  return clamp(target * GENERATION_NS, 0, chainSummary(yieldKt).durationNs)
}
