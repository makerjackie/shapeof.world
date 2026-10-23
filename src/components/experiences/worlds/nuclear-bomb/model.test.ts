import { describe, expect, it } from 'vitest'
import {
  advanceTimeline,
  chainSummary,
  CHEMICAL_START,
  cumulativeFissionsAtGeneration,
  FISSION_ENERGY_J,
  GENERATION_NS,
  KILOTON_TNT_J,
  lastGenerationsEnergyFraction,
  playbackSecondsAt,
  sampleTimeline,
  secondsPerGeneration,
  slowdownFactor,
  stepTimeline,
  timelineAtPlaybackSeconds,
} from './model'

describe('idealized fission energy accounting', () => {
  it('reaches 15 kilotons in about 80 doublings and 0.8 microseconds', () => {
    const summary = chainSummary(15)
    expect(summary.energyJ).toBe(15 * KILOTON_TNT_J)
    expect(summary.fissions).toBeCloseTo(1.96125e24, -10)
    expect(summary.generations).toBeGreaterThanOrEqual(79)
    expect(summary.generations).toBeLessThanOrEqual(82)
    expect(summary.durationNs / 1_000).toBeCloseTo(0.8, 1)
    expect(summary.fissions * FISSION_ENERGY_J).toBeCloseTo(summary.energyJ, 0)
  })

  it('accounts for the first generations with a geometric sum', () => {
    expect(cumulativeFissionsAtGeneration(0)).toBe(0)
    expect(cumulativeFissionsAtGeneration(1)).toBeCloseTo(1)
    expect(cumulativeFissionsAtGeneration(4)).toBeCloseTo(15)
    expect(cumulativeFissionsAtGeneration(12)).toBeCloseTo(4_095)
  })

  it('places over 99 percent of energy in the final seven generations', () => {
    const summary = chainSummary()
    const before = sampleTimeline(summary.durationNs - 7 * GENERATION_NS)
    expect(lastGenerationsEnergyFraction(7)).toBeCloseTo(0.9921875)
    expect(lastGenerationsEnergyFraction(7)).toBeGreaterThan(0.99)
    expect(1 - before.energyFraction).toBeCloseTo(lastGenerationsEnergyFraction(7), 12)
    expect(lastGenerationsEnergyFraction(0)).toBe(0)
  })

  it('uses a linear energy fraction and reaches the requested endpoint exactly', () => {
    const summary = chainSummary()
    expect(sampleTimeline(70 * GENERATION_NS).energyFraction).toBeLessThan(0.001)
    expect(sampleTimeline(summary.durationNs).energyFraction).toBe(1)
    expect(sampleTimeline(summary.durationNs).energyKt).toBe(15)
    expect(sampleTimeline(summary.durationNs).phase).toBe('disassembly')
    expect(sampleTimeline(summary.durationNs + 1_000)).toEqual(sampleTimeline(summary.durationNs))
  })

  it('rejects invalid energy targets', () => {
    for (const target of [0, -1, NaN, Infinity]) expect(() => chainSummary(target)).toThrow(RangeError)
  })
})

describe('deterministic storyboard and playback', () => {
  it('keeps the untimed storyboard separate from the reaction clock', () => {
    const before = sampleTimeline(-1.5)
    expect(before.phase).toBe('chemical')
    expect(before.elapsedNs).toBe(0)
    expect(before.energyJ).toBe(0)
    expect(before.waveProgress).toBeGreaterThan(0)
    expect(before.compression).toBe(0)
    expect(sampleTimeline(-0.5).compression).toBeGreaterThan(0)
    expect(slowdownFactor(-0.5)).toBeNull()
  })

  it('returns exactly the same sample after arbitrary scrubbing', () => {
    for (const t of [-2.8, -1.25, -0.1, 0, 8, 80, 119, 710, 790]) {
      const expected = sampleTimeline(t)
      sampleTimeline(chainSummary().durationNs)
      sampleTimeline(CHEMICAL_START)
      expect(sampleTimeline(t)).toEqual(expected)
    }
  })

  it('inverts the changing playback speed across both timeline segments', () => {
    for (const t of [CHEMICAL_START, -1.3, -0.001, 0, 7.3, 80, 120, 700, chainSummary().durationNs]) {
      expect(timelineAtPlaybackSeconds(playbackSecondsAt(t))).toBeCloseTo(t, 8)
    }
  })

  it('gives the same time at different animation frame rates', () => {
    let manyFrames = -0.8
    for (let frame = 0; frame < 600; frame++) manyFrames = advanceTimeline(manyFrames, 1 / 60)
    expect(manyFrames).toBeCloseTo(advanceTimeline(-0.8, 10), 7)
    expect(advanceTimeline(advanceTimeline(80, 2.3), -2.3)).toBeCloseTo(80, 8)
  })

  it('reports the current physical slowdown, including the speed control', () => {
    expect(secondsPerGeneration(0)).toBe(2.5)
    expect(secondsPerGeneration(12)).toBe(0.3)
    expect(secondsPerGeneration(80)).toBe(0.3)
    expect(slowdownFactor(0)).toBeCloseTo(250_000_000)
    expect(slowdownFactor(120, 4)).toBeCloseTo(7_500_000)
    expect(advanceTimeline(0, 1, 4)).toBeCloseTo(advanceTimeline(0, 4), 9)
  })

  it('steps one generation and clamps both ends', () => {
    expect(stepTimeline(-3, -1)).toBe(-3)
    expect(stepTimeline(-1, 1)).toBe(0)
    expect(stepTimeline(0, -1)).toBe(-1)
    expect(stepTimeline(80, 1)).toBe(90)
    expect(stepTimeline(80, -1)).toBe(70)
    expect(stepTimeline(82, -1)).toBe(80)
    expect(stepTimeline(chainSummary().durationNs, 1)).toBe(chainSummary().durationNs)
  })
})
