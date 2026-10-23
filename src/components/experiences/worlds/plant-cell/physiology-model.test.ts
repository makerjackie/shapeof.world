import { describe, expect, it } from 'vitest'
import { advancePhysiology, advanceStomatalOpening, createPhysiology, DEFAULT_INPUTS, evaluatePhotosynthesis, getActualPPFD, getLightAppearance, getPhysiologySnapshot, getStomatalTarget, PHYSIOLOGY_PARAMETERS } from './model'

describe('light response in physical units', () => {
  it('has negative dark net exchange, a finite low-light slope and saturation', () => {
    expect(evaluatePhotosynthesis(0)).toEqual({ grossAssimilation: 0, netAssimilation: -1, approximateNetOxygen: -1 })
    expect(evaluatePhotosynthesis(1e-7).grossAssimilation / 1e-7).toBeCloseTo(0.05, 8)
    let previous = -Infinity
    for (let light = 0; light <= 2000; light += 5) {
      const rate = evaluatePhotosynthesis(light)
      expect(rate.netAssimilation).toBeGreaterThanOrEqual(previous)
      expect(rate.grossAssimilation).toBeLessThan(25)
      expect(rate.approximateNetOxygen).toBe(rate.netAssimilation)
      previous = rate.netAssimilation
    }
    expect(evaluatePhotosynthesis(1900).netAssimilation - evaluatePhotosynthesis(1800).netAssimilation).toBeLessThan(evaluatePhotosynthesis(200).netAssimilation - evaluatePhotosynthesis(100).netAssimilation)
    expect(Number.isFinite(evaluatePhotosynthesis(NaN).netAssimilation)).toBe(true)
    expect(getLightAppearance(400).keyIntensity).toBeCloseTo(0.08 + (0.45 + 0.55 * Math.sqrt(0.2)) * 4.3)
  })

  it('keeps a constant lamp when only time speed changes', () => {
    const fast = { ...DEFAULT_INPUTS, timeScale: 3600 as const }
    for (const hour of [0, 6, 12, 18, 24]) expect(getActualPPFD(fast, hour * 3600)).toBe(400)
    const cycle = { ...fast, dayCycle: true }
    expect(getActualPPFD(cycle, 0)).toBe(0)
    expect(getActualPPFD(cycle, 6 * 3600)).toBe(0)
    expect(getActualPPFD(cycle, 12 * 3600)).toBe(400)
    expect(getActualPPFD(cycle, 18 * 3600)).toBe(0)
    expect(getActualPPFD(cycle, 8 * 3600)).toBeCloseTo(200)
  })

  it('uses a 900-second stomatal time constant independent of frame partition', () => {
    const after = advanceStomatalOpening(0, 400, 900)
    expect(after).toBeCloseTo(getStomatalTarget(400) * (1 - Math.exp(-1)), 12)
    let split = 0
    for (let i = 0; i < 90; i++) split = advanceStomatalOpening(split, 400, 10)
    expect(split).toBeCloseTo(after, 12)
    expect(advanceStomatalOpening(1, 0, 900)).toBeCloseTo(Math.exp(-1), 12)
    expect(advanceStomatalOpening(0.6, 400, 0)).toBeCloseTo(0.6)
  })
})

describe('shared physiological state', () => {
  it('applies real elapsed time once and preserves pose and tuple identities', () => {
    const state = createPhysiology(), pose = state.chloroplasts.poses[0], position = pose.positionUm
    const inputs = { ...DEFAULT_INPUTS, timeScale: 60 as const }
    const initialCarbon = state.starchCarbonUmolPerM2
    advancePhysiology(state, inputs, 0.5)
    expect(state.simulationSeconds).toBe(30) // no camera-style 80 ms clamp
    expect(state.starchCarbonUmolPerM2 - initialCarbon).toBeCloseTo(evaluatePhotosynthesis(400).netAssimilation * 0.25 * 30, 8)
    expect(state.chloroplasts.poses[0]).toBe(pose)
    expect(pose.positionUm).toBe(position)
    const snapshot = getPhysiologySnapshot(state, inputs)
    expect(snapshot.timeScale).toBe(60)
    expect(snapshot.actualPPFD).toBe(400)
    expect('chloroplasts' in snapshot).toBe(false)
  })

  it('pauses all accumulated state while allowing current lamp readings to change', () => {
    const state = createPhysiology(), before = structuredClone(state)
    advancePhysiology(state, { ...DEFAULT_INPUTS, playing: false, I: 0, timeScale: 3600 }, 5)
    expect(state.simulationSeconds).toBe(before.simulationSeconds)
    expect(state.starchCarbonUmolPerM2).toBe(before.starchCarbonUmolPerM2)
    expect(state.stomatalOpening).toBe(before.stomatalOpening)
    expect(state.chloroplasts.poses).toEqual(before.chloroplasts.poses)
    expect(state.actualPPFD).toBe(0)
    expect(state.netAssimilation).toBe(-1)
    for (const elapsed of [-1, NaN, Infinity]) advancePhysiology(state, DEFAULT_INPUTS, elapsed)
    expect(state.simulationSeconds).toBe(0)
  })

  it('stores carbon by day and uses about 95% of the dusk reserve by dawn', () => {
    const inputs = { ...DEFAULT_INPUTS, dayCycle: true, timeScale: 3600 as const }
    const state = createPhysiology(inputs), startCarbon = state.starchCarbonUmolPerM2
    advancePhysiology(state, inputs, 10) // 08:00 -> 18:00
    const duskCarbon = state.starchCarbonUmolPerM2
    expect(duskCarbon).toBeGreaterThan(startCarbon)
    expect(duskCarbon).toBeLessThanOrEqual(PHYSIOLOGY_PARAMETERS.starchReferenceCapacity)
    advancePhysiology(state, inputs, 6)
    expect(state.starchCarbonUmolPerM2 / duskCarbon).toBeCloseTo(0.525, 8)
    advancePhysiology(state, inputs, 6)
    expect(state.starchCarbonUmolPerM2 / duskCarbon).toBeCloseTo(0.05, 8)
    const dawnCarbon = state.starchCarbonUmolPerM2
    advancePhysiology(state, inputs, 2)
    expect(state.starchCarbonUmolPerM2).toBeGreaterThan(dawnCarbon)
    expect(state.daySeconds).toBe(8 * 3600)
    expect(state.simulationSeconds).toBe(86400)
    expect(state.starchFraction).toBeGreaterThanOrEqual(0)
    expect(state.starchFraction).toBeLessThanOrEqual(1)
  }, 20_000)

  it('replans the remaining dark reserve when the light schedule changes', () => {
    const manual = { ...DEFAULT_INPUTS, timeScale: 3600 as const }
    const state = createPhysiology(manual)
    advancePhysiology(state, manual, 12) // 08:00 -> 20:00, constant lamp
    advancePhysiology(state, { ...manual, I: 0 }, 1) // Manual darkness until 21:00
    const atCycleStart = state.starchCarbonUmolPerM2
    const cycle = { ...manual, dayCycle: true }
    const untilDawn = structuredClone(state)
    advancePhysiology(untilDawn, cycle, 9)
    expect(untilDawn.daySeconds).toBe(6 * 3600)
    expect(untilDawn.starchCarbonUmolPerM2 / atCycleStart).toBeCloseTo(0.05, 8)

    // Returning to a dark manual lamp supplies a fresh 12-hour horizon,
    // rather than keeping the cycle's earlier dawn deadline.
    advancePhysiology(state, cycle, 1) // 21:00 -> 22:00
    const atManualStart = state.starchCarbonUmolPerM2
    advancePhysiology(state, { ...manual, I: 0 }, 1)
    expect(state.starchCarbonUmolPerM2 / atManualStart).toBeCloseTo(1 - 0.95 / 12, 8)
  }, 20_000)
})
