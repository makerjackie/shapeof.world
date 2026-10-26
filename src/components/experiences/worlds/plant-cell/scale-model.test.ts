import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { advanceSimulation, DEFAULT_ENVIRONMENT, getLightAppearance, seededRandom } from './model'
import { LEAF_ENTRY } from './leaf-model'
import { CHLOROPLAST_ANCHOR_UM, GRANUM_EDGE_OFFSET_UM, CHLOROPLAST_QUATERNION, MOTOR_TARGET_LOCAL_UM, clampScale, getAnchorUm, getCameraPose, getLayerWeights, getScaleBar, LAYERS, SCALE_MAX, SCALE_MIN, scaleToMicrometers } from './scale-model'

describe('physical zoom scale', () => {
  it('never loses the scene or displays more than two adjacent layers', () => {
    for (let s = SCALE_MIN; s <= SCALE_MAX; s += 0.001) {
      const weights = Object.values(getLayerWeights(s))
      expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12)
      const visible = weights.flatMap((weight, index) => weight > 0 ? [index] : [])
      expect(visible.length).toBeLessThanOrEqual(2)
      if (visible.length === 2) expect(visible[1] - visible[0]).toBe(1)
      weights.forEach((weight) => expect(weight).toBeGreaterThanOrEqual(0))
    }
  })

  it('has continuous opacity and anchor positions at each handoff', () => {
    for (const s of [-2.95, -2.8, -2.65, -3.75, -3.6, -3.45, -4.35, -5.25, -5.1, -4.95, -5.45, -6.08, -6.23, -6.38, -6.3, -6.35, -6.5, -6.65, -7.15, -7.3, -7.45, -7.7]) {
      const before = Object.values(getLayerWeights(s - 1e-6))
      const after = Object.values(getLayerWeights(s + 1e-6))
      before.forEach((weight, index) => expect(Math.abs(weight - after[index])).toBeLessThan(0.00002))
      const a = getAnchorUm(s - 1e-6)
      const b = getAnchorUm(s + 1e-6)
      expect(Math.hypot(...a.map((value, i) => value - b[i]))).toBeLessThan(0.002)
    }
    expect(getAnchorUm(-4.35)).toEqual([0, 0, 0])
    expect(getAnchorUm(-4.95)).toEqual(CHLOROPLAST_ANCHOR_UM)
    const margin=new Vector3(...MOTOR_TARGET_LOCAL_UM).applyQuaternion(CHLOROPLAST_QUATERNION).toArray()
    expect(getAnchorUm(-6.5)).toEqual(CHLOROPLAST_ANCHOR_UM.map((v, i) => v + GRANUM_EDGE_OFFSET_UM[i] + margin[i]))
  })

  it('frames the full leaf section before returning smoothly to the upper cell', () => {
    const sectionScale = LAYERS.find((layer) => layer.id === 'section')!.scale
    const sectionAnchor = getAnchorUm(sectionScale)
    expect(sectionAnchor[1]).toBeCloseTo(-179.2578125, 6)
    // A 500 µm-thick section centred at -190 fits the 1600 × 1000 viewport.
    const halfHeightUm = scaleToMicrometers(sectionScale) * 1000 / 1600 / 2
    expect(-190 - 250).toBeGreaterThan(sectionAnchor[1] - halfHeightUm)
    expect(-190 + 250).toBeLessThan(sectionAnchor[1] + halfHeightUm)
    expect(getAnchorUm(-3.05)).toEqual([0, -190, 0])
    expect(getAnchorUm(-2.65)).toEqual(LEAF_ENTRY)
    expect(getAnchorUm(-3.75)).toEqual([0, 0, 0])
    expect(getAnchorUm(-4.35)).toEqual([0, 0, 0])
    for (const s of [-2.65, -3.05, -3.75]) {
      const leftSlope = (getAnchorUm(s)[1] - getAnchorUm(s - 1e-6)[1]) / 1e-6
      const rightSlope = (getAnchorUm(s + 1e-6)[1] - getAnchorUm(s)[1]) / 1e-6
      expect(Math.abs(leftSlope - rightSlope)).toBeLessThan(0.01)
    }
  })

  it('uses actual horizontal field width for every 1–2–5 scale bar', () => {
    for (const viewport of [390, 1600]) {
      for (let s = SCALE_MIN; s <= SCALE_MAX; s += 0.01) {
        const bar = getScaleBar(s, viewport)
        expect(bar.widthPx).toBeLessThanOrEqual(100 + 1e-7)
        expect(bar.widthPx).toBeGreaterThanOrEqual(39.999)
        expect(bar.widthPx / viewport).toBeCloseTo(bar.lengthMeters / 10 ** s, 10)
        const coefficient = bar.lengthMeters / 10 ** Math.floor(Math.log10(bar.lengthMeters) + 1e-10)
        expect([1, 2, 5].some((n) => Math.abs(n - coefficient) < 1e-8)).toBe(true)
      }
    }
    expect(getScaleBar(-4, 1000).label).toBe('10 μm')
    expect(getScaleBar(-1, 1000).label).toBe('1 cm')
    expect(scaleToMicrometers(-4)).toBe(100)
    expect(clampScale(-100)).toBe(SCALE_MIN)
    expect(clampScale(100)).toBe(SCALE_MAX)
    expect(Number.isFinite(clampScale(NaN))).toBe(true)
  })

  it('tilts the leaf into the section without a singular camera basis or a handoff jump', () => {
    for (let s = SCALE_MIN; s <= SCALE_MAX; s += 0.005) {
      const pose = getCameraPose(s), next = getCameraPose(s + 0.00001)
      expect(Math.abs(next.yaw - pose.yaw) + Math.abs(next.pitch - pose.pitch) + Math.abs(next.roll - pose.roll)).toBeLessThan(0.001)
      const dot = Math.sin(pose.yaw) * Math.cos(pose.pitch) * Math.sin(pose.roll) + Math.sin(pose.pitch) * Math.cos(pose.roll)
      expect(Math.abs(dot)).toBeLessThan(0.96)
    }
    expect(getCameraPose(-2.65).pitch * 180 / Math.PI).toBeCloseTo(40)
    expect(getCameraPose(-3.86).pitch * 180 / Math.PI).toBeCloseTo(18)
  })
})

describe('round 1 environment', () => {
  it('keeps streaming time running in darkness', () => {
    const daylight = advanceSimulation({ ...DEFAULT_ENVIRONMENT }, 2)
    const darkness = advanceSimulation({ ...DEFAULT_ENVIRONMENT, I: 0 }, 2)
    expect(daylight.simulationSeconds).toBe(2)
    expect(darkness.simulationSeconds).toBe(2)
    expect(getLightAppearance(0).keyIntensity).toBeLessThan(getLightAppearance(1800).keyIntensity)
  })

  it('handles pause and simulated time without inventing physiological outputs', () => {
    expect(advanceSimulation({ ...DEFAULT_ENVIRONMENT, timeScale: 60 }, 2).simulationSeconds).toBe(120)
    expect(advanceSimulation({ ...DEFAULT_ENVIRONMENT, timeScale: 0 }, 2).simulationSeconds).toBe(0)
    expect(advanceSimulation({ ...DEFAULT_ENVIRONMENT }, -2).simulationSeconds).toBe(0)
    expect(advanceSimulation({ ...DEFAULT_ENVIRONMENT }, NaN).simulationSeconds).toBe(0)
  })

  it('keeps procedurally placed structures stable across layer remounts', () => {
    const a = seededRandom(417)
    const b = seededRandom(417)
    for (let i = 0; i < 300; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
