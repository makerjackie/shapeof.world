import { describe, expect, it } from 'vitest'
import { MAX_YIELD_KT, MIN_YIELD_KT, sampleEffects, sliderToYield, snapYield, tntCubeSideM, YIELD_PRESETS, yieldToSlider } from './effects'

describe('bounded public effects illustration', () => {
  it('shows only energy below one kiloton and starts circles at one kiloton', () => {
    for (const yieldKt of [0.001, 0.25, 0.999]) {
      const sample = sampleEffects(yieldKt)
      expect(sample.showEffects).toBe(false)
      expect(sample.energyJ).toBe(yieldKt * 4.184e12)
      expect(sample.tntTons).toBe(yieldKt * 1_000)
      for (const key of ['heightKm', 'fireballKm', 'blast20Km', 'blast5Km', 'blast1Km', 'burnKm', 'outerRadiusKm'] as const) {
        expect(sample[key]).toBeNull()
      }
    }
    expect(sampleEffects(1).showEffects).toBe(true)
    expect(sampleEffects(0.001).energyJ).toBe(4.184e9)
    expect(sampleEffects(0.001).tntTons).toBe(1)
  })

  it('matches the requested fifteen-kiloton reference', () => {
    const sample = sampleEffects(15)
    expect(sample.showEffects).toBe(true)
    if (!sample.showEffects) throw new Error('Expected effects at fifteen kilotons')
    expect(sample.blast5Km).toBeCloseTo(1.53, 2)
    expect(sample.blast1Km).toBeCloseTo(4.19, 2)
    expect(sample.fireballKm * 1_000).toBeCloseTo(180, 0)
    expect(sample.heightKm * 1_000).toBeCloseTo(493, 0)
    expect(sample.burnKm).toBeCloseTo(2.18, 2)
    expect(sample.energyJ).toBe(6.276e13)
    expect(sample.tntTons).toBe(15_000)
  })

  it('preserves the supplied coefficients and the upper-range reference', () => {
    const base = sampleEffects(1)
    expect(base).toMatchObject({heightKm: 0.2, fireballKm: 0.06096, blast20Km: 0.24, blast5Km: 0.62, blast1Km: 1.70, burnKm: 0.6})
    expect(sampleEffects(1_000).blast5Km).toBe(6.2)
    expect(sampleEffects(1_000).blast1Km).toBe(17)
    const maximum = sampleEffects(50_000)
    expect(maximum.fireballKm).toBeCloseTo(4.62, 2)
    expect(maximum.heightKm).toBeCloseTo(7.37, 2)
    expect(maximum.blast1Km).toBeCloseTo(62.6, 1)
    expect(maximum.burnKm).toBeCloseTo(54, 0)
  })

  it('passes all burn anchors and interpolates geometrically between them', () => {
    const anchors = [[1, 0.6], [20, 2.5], [1_000, 12], [20_000, 38]]
    for (const [yieldKt, radiusKm] of anchors) expect(sampleEffects(yieldKt).burnKm).toBeCloseTo(radiusKm, 12)
    for (let index = 1; index < anchors.length; index++) {
      const [yield0, radius0] = anchors[index - 1]
      const [yield1, radius1] = anchors[index]
      expect(sampleEffects(Math.sqrt(yield0 * yield1)).burnKm).toBeCloseTo(Math.sqrt(radius0 * radius1), 12)
    }
    expect(sampleEffects(50_000).burnKm).toBeCloseTo(38 * (50_000 / 20_000) ** (Math.log(38 / 12) / Math.log(20_000 / 1_000)), 12)
  })

  it('keeps the fireball above the ground and all radii ordered within the supported range', () => {
    for (let index = 0; index <= 200; index++) {
      const sample = sampleEffects(Math.exp(Math.log(MAX_YIELD_KT) * index / 200))
      if (!sample.showEffects) throw new Error('Expected supported effect sample')
      expect(sample.fireballKm).toBeLessThan(sample.heightKm)
      expect(sample.blast20Km).toBeLessThan(sample.blast5Km)
      expect(sample.blast5Km).toBeLessThan(sample.blast1Km)
      expect(sample.outerRadiusKm).toBeGreaterThanOrEqual(sample.blast1Km)
      expect(sample.outerRadiusKm).toBeGreaterThanOrEqual(sample.burnKm)
    }
  })

  it('clamps finite inputs to the exhibit range and rejects nonfinite inputs', () => {
    expect(sampleEffects(-1)).toEqual(sampleEffects(MIN_YIELD_KT))
    expect(sampleEffects(100_000)).toEqual(sampleEffects(MAX_YIELD_KT))
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => sampleEffects(value)).toThrow(RangeError)
      expect(() => yieldToSlider(value)).toThrow(RangeError)
      expect(() => sliderToYield(value)).toThrow(RangeError)
    }
  })
})

describe('equivalent TNT volume', () => {
  it('compares the supplied reference masses with a cube at the published density', () => {
    for (const [yieldKt, side, precision] of [[0.001, 0.85, 2], [1, 8.5, 1], [15, 20.9, 1], [3_300, 126, 0], [50_000, 312, 0]]) {
      expect(tntCubeSideM(yieldKt)).toBeCloseTo(side, precision)
      expect(sampleEffects(yieldKt).tntCubeSideM).toBe(tntCubeSideM(yieldKt))
    }
    expect(tntCubeSideM(50_000)).toBeGreaterThan(300)
  })
  it('preserves cubic volume and rejects nonfinite input', () => {
    for (const yieldKt of [0.001, 1, 15, 3_300, 50_000]) {
      expect(tntCubeSideM(yieldKt) ** 3 * 1.654).toBeCloseTo(yieldKt * 1_000, 5)
    }
    expect(() => tntCubeSideM(NaN)).toThrow(RangeError)
  })
})

describe('historical yield selection', () => {
  it('includes the nine requested landmarks with names, dates and source links', () => {
    expect(YIELD_PRESETS.map(({yieldKt}) => yieldKt)).toEqual([0.001, 1, 15, 21, 22, 3_300, 10_400, 15_000, 50_000])
    expect(YIELD_PRESETS.map(({year}) => year)).toEqual([null, null, 1945, 1945, 1964, 1967, 1952, 1954, 1961])
    expect(new Set(YIELD_PRESETS.map(({id}) => id)).size).toBe(9)
    for (const preset of YIELD_PRESETS) {
      expect(preset.name.trim()).not.toBe('')
      expect(preset.nameEn.trim()).not.toBe('')
      expect(new URL(preset.sourceUrl).hostname).toBe('en.wikipedia.org')
    }
  })

  it('maps the logarithmic slider reversibly and preserves exact endpoints', () => {
    expect(sliderToYield(0)).toBe(MIN_YIELD_KT)
    expect(sliderToYield(1)).toBe(MAX_YIELD_KT)
    expect(sliderToYield(-1)).toBe(MIN_YIELD_KT)
    expect(sliderToYield(2)).toBe(MAX_YIELD_KT)
    for (const {yieldKt} of YIELD_PRESETS) expect(sliderToYield(yieldToSlider(yieldKt))).toBeCloseTo(yieldKt, 8)
    expect(sliderToYield(0.5)).toBeCloseTo(Math.sqrt(MIN_YIELD_KT * MAX_YIELD_KT), 12)
  })

  it('snaps to the nearest landmark in slider space and leaves distant values alone', () => {
    for (const {yieldKt} of YIELD_PRESETS) expect(snapYield(yieldKt)).toBe(yieldKt)
    expect(snapYield(21.2)).toBe(21)
    expect(snapYield(21.9)).toBe(22)
    expect(snapYield(100)).toBe(100)
    expect(snapYield(15.01, 0)).toBe(15.01)
  })
})
