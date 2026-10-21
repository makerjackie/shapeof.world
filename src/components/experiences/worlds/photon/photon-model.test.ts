import { describe, expect, it } from 'vitest'

import {
  EV_J,
  clockFrameTime,
  simultaneousClockEvents,
  polarizationVisibility,
  LIGHT_SPEED,
  PLANCK,
  SCREEN_HALF_WIDTH,
  createDetectionDistribution,
  interferenceDensity,
  lightClockComparison,
  lightClockState,
  lorentzFactor,
  photonBeamProperties,
  photonProperties,
  properTimeRatio,
  sampleDetection,
  vacuumPulseState,
  type ClockObserver,
} from './photon-model'

describe('photon energy and frequency', () => {
  it('uses exact SI constants and recovers a green photon energy', () => {
    expect(LIGHT_SPEED).toBe(299_792_458)
    expect(PLANCK).toBe(6.626_070_15e-34)
    expect(EV_J).toBe(1.602_176_634e-19)
    const green = photonProperties(550)
    expect(green.frequencyTHz).toBeCloseTo(545.077_196, 5)
    expect(green.energyEv).toBeCloseTo(2.254_258, 5)
  })

  it('gives violet more energy, without changing the speed of light', () => {
    const violet = photonProperties(400)
    const red = photonProperties(700)
    expect(violet.energyEv).toBeCloseTo(3.099_605, 5)
    expect(red.energyEv).toBeCloseTo(1.771_203, 5)
    expect(violet.frequencyTHz * 1e12 * 400e-9).toBeCloseTo(LIGHT_SPEED, 5)
    expect(red.frequencyTHz * 1e12 * 700e-9).toBeCloseTo(LIGHT_SPEED, 5)
  })

  it.each([0, -1, NaN, Infinity, Number.MIN_VALUE])('rejects invalid wavelength %s', (wavelength) => {
    expect(() => photonProperties(wavelength)).toThrow(RangeError)
    expect(() => createDetectionDistribution(wavelength, 0.3)).toThrow(RangeError)
  })
})

describe('single-photon detector distribution', () => {
  it('has a central maximum and symmetric nonnegative density', () => {
    expect(interferenceDensity(0, 520, 0.3)).toBe(1)
    for (const position of [0.0002, 0.0017, 0.007, 0.016]) {
      const density = interferenceDensity(position, 520, 0.3)
      expect(density).toBeGreaterThanOrEqual(0)
      expect(density).toBeLessThanOrEqual(1)
      expect(density).toBeCloseTo(interferenceDensity(-position, 520, 0.3), 14)
    }
  })

  it('places the first double-slit dark fringe at λL/(2d)', () => {
    const dark = 520e-9 * 2 / (2 * 0.3e-3)
    expect(interferenceDensity(dark, 520, 0.3)).toBeLessThan(1e-28)
    expect(interferenceDensity(dark, 520, 0.3, false)).toBeGreaterThan(0.9)
  })

  it('retains diffraction when one slit is closed', () => {
    const envelopeZero = 520e-9 * 2 / 0.06e-3
    expect(interferenceDensity(envelopeZero, 520, 0.3, false)).toBeLessThan(1e-28)
    expect(interferenceDensity(envelopeZero * 1.43, 520, 0.3, false)).toBeGreaterThan(0.04)
  })

  it.each([true, false])('normalizes visible detector probabilities (twoSlits=%s)', (twoSlits) => {
    const distribution = createDetectionDistribution(520, 0.3, twoSlits)
    const { cdf, positions } = distribution
    expect(positions[0]).toBe(-SCREEN_HALF_WIDTH)
    expect(positions.at(-1)).toBe(SCREEN_HALF_WIDTH)
    expect(cdf[0]).toBe(0)
    expect(cdf.at(-1)).toBe(1)
    for (let i = 1; i < cdf.length; i += 1) {
      expect(cdf[i]).toBeGreaterThanOrEqual(cdf[i - 1])
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
    expect(sampleDetection(distribution, 0.5)).toBeCloseTo(0, 12)
    expect(sampleDetection(distribution, 0)).toBe(-SCREEN_HALF_WIDTH)
    expect(sampleDetection(distribution, 1)).toBe(SCREEN_HALF_WIDTH)
    for (const u of [0.001, 0.1, 0.25, 0.49]) {
      expect(sampleDetection(distribution, u)).toBeCloseTo(-sampleDetection(distribution, 1 - u), 12)
    }
  })

  it('samples each dark-fringe neighborhood far less often than the central peak', () => {
    const distribution = createDetectionDistribution(520, 0.3)
    const dark = 520e-9 * 2 / (2 * 0.3e-3)
    let centralCount = 0
    let darkCount = 0
    for (let i = 0; i < 10_000; i += 1) {
      const y = sampleDetection(distribution, (i + 0.5) / 10_000)
      if (Math.abs(y) < 0.0002) centralCount += 1
      if (Math.abs(y - dark) < 0.0002) darkCount += 1
    }
    expect(centralCount).toBeGreaterThan(300)
    expect(darkCount).toBeLessThan(centralCount / 20)
  })

  it('rejects invalid geometry and out-of-range uniform samples', () => {
    expect(() => interferenceDensity(NaN, 520, 0.3)).toThrow(RangeError)
    expect(() => interferenceDensity(0, 520, 0)).toThrow(RangeError)
    const distribution = createDetectionDistribution(520, 0.3)
    for (const u of [-0.001, 1.001, NaN, Infinity]) {
      expect(() => sampleDetection(distribution, u)).toThrow(RangeError)
    }
    expect(() => sampleDetection({ positions: new Float64Array(0), cdf: new Float64Array(0) }, 0.5))
      .toThrow(RangeError)
  })
})

describe('transverse light clock', () => {
  it('gives the moving clock 0.6 seconds per ground second at 0.8c', () => {
    expect(lorentzFactor(0)).toBe(1)
    expect(lorentzFactor(0.8)).toBeCloseTo(5 / 3, 14)
    expect(properTimeRatio(0.8)).toBeCloseTo(0.6, 14)
    expect(lightClockState(10, 0.8).properTime).toBeCloseTo(6, 14)
    expect(properTimeRatio(-0.8)).toBe(properTimeRatio(0.8))
  })

  it('counts complete returns to the lower mirror, not each reflection', () => {
    expect(lightClockState(0, 0.8)).toMatchObject({ x: 0, y: 0, properTime: 0, ticks: 0, phase: 0 })
    const upper = lightClockState(5 / 3, 0.8)
    expect(upper.y).toBeCloseTo(1, 14)
    expect(upper.ticks).toBe(0)
    expect(upper.phase).toBeCloseTo(0.5, 14)
    const returned = lightClockState(10 / 3, 0.8)
    expect(returned.y).toBeCloseTo(0, 14)
    expect(returned.ticks).toBe(1)
    expect(returned.phase).toBe(0)
    expect(lightClockState(2, 0).ticks).toBe(1)
  })

  it('keeps total photon speed c on both legs for every supported travel speed', () => {
    const height = 2.4
    const c = 3
    for (const beta of [-0.95, 0, 0.5, 0.8, 0.95]) {
      const roundTrip = 2 * height * lorentzFactor(beta) / c
      for (const fraction of [0.13, 0.3, 0.68, 0.9]) {
        const time = fraction * roundTrip
        const delta = 1e-5
        const before = lightClockState(time, beta, height, c)
        const after = lightClockState(time + delta, beta, height, c)
        const speed = Math.hypot(after.x - before.x, after.y - before.y) / delta
        expect(speed).toBeCloseTo(c, 8)
        expect(before.y).toBeGreaterThanOrEqual(0)
        expect(before.y).toBeLessThanOrEqual(height)
      }
    }
  })

  it.each([-1, 1, 1.01, NaN, Infinity])('rejects a nonexistent light-speed rest frame (%s)', (beta) => {
    expect(() => lorentzFactor(beta)).toThrow(RangeError)
    expect(() => lightClockState(1, beta)).toThrow(RangeError)
  })

  it('rejects invalid time, mirror spacing, and display light speed', () => {
    expect(() => lightClockState(-1, 0.8)).toThrow(RangeError)
    expect(() => lightClockState(Infinity, 0.8)).toThrow(RangeError)
    expect(() => lightClockState(1, 0.8, 0)).toThrow(RangeError)
    expect(() => lightClockState(1, 0.8, 1, -1)).toThrow(RangeError)
  })
})

describe('physical which-path markers', () => {
  it('removes the two-path dark fringes while both slits remain open', () => {
    const dark = 520e-9 * 2 / (2 * 0.3e-3)
    expect(interferenceDensity(dark, 520, 0.3, true, false)).toBeLessThan(1e-28)
    expect(interferenceDensity(dark, 520, 0.3, true, true)).toBeGreaterThan(0.9)
  })

  it('retains the single-slit envelope, including its zeros and secondary lobes', () => {
    const firstEnvelopeZero = 520e-9 * 2 / 0.06e-3
    for (const y of [0, 0.002, 0.008, firstEnvelopeZero, firstEnvelopeZero * 1.43]) {
      expect(interferenceDensity(y, 520, 0.3, true, true))
        .toBe(interferenceDensity(y, 520, 0.3, false))
    }
    expect(interferenceDensity(firstEnvelopeZero, 520, 0.3, true, true)).toBeLessThan(1e-28)
    expect(interferenceDensity(firstEnvelopeZero * 1.43, 520, 0.3, true, true)).toBeGreaterThan(0.04)
  })

  it('samples the normalized envelope without changing default interference behavior', () => {
    const defaultDistribution = createDetectionDistribution(520, 0.3)
    const unmarked = createDetectionDistribution(520, 0.3, true, false)
    const marked = createDetectionDistribution(520, 0.3, true, true)
    const single = createDetectionDistribution(520, 0.3, false)
    expect(defaultDistribution.cdf).toEqual(unmarked.cdf)
    expect(marked.cdf).toEqual(single.cdf)
    expect(marked.cdf[0]).toBe(0)
    expect(marked.cdf.at(-1)).toBe(1)
    for (const u of [0, 0.1, 0.5, 0.9, 1]) {
      expect(sampleDetection(marked, u)).toBe(sampleDetection(single, u))
    }
  })

  it('does not invent new interference when only one slit is open', () => {
    for (const y of [-0.01, 0, 0.005, 0.015]) {
      expect(interferenceDensity(y, 650, 0.4, false, true))
        .toBe(interferenceDensity(y, 650, 0.4, false, false))
    }
  })
})

describe('photon rate and vacuum pulses', () => {
  it('increases power through photon rate without increasing energy per photon', () => {
    const dim = photonBeamProperties(520, 1e18)
    const bright = photonBeamProperties(520, 4e18)
    expect(dim.powerWatts).toBeCloseTo(0.382_008_817, 8)
    expect(bright.powerWatts).toBeCloseTo(4 * dim.powerWatts, 14)
    expect(bright.energyEv).toBe(dim.energyEv)
    expect(bright.frequencyTHz).toBe(dim.frequencyTHz)
    expect(photonBeamProperties(520, 0).powerWatts).toBe(0)
  })

  it('increases each photon energy and total power at a fixed rate when light turns blue', () => {
    const red = photonBeamProperties(650, 1e18)
    const blue = photonBeamProperties(450, 1e18)
    expect(blue.energyEv / red.energyEv).toBeCloseTo(650 / 450, 14)
    expect(blue.powerWatts / red.powerWatts).toBeCloseTo(650 / 450, 14)
    expect(blue.photonsPerSecond).toBe(red.photonsPerSecond)
  })

  it('keeps red and blue pulse centers together in vacuum at every elapsed time', () => {
    for (const time of [0, 1e-12, 1e-9, 1]) {
      const red = vacuumPulseState(time, 650)
      const blue = vacuumPulseState(time, 450)
      expect(red.x).toBe(blue.x)
      expect(red.speed).toBe(LIGHT_SPEED)
      expect(blue.speed).toBe(LIGHT_SPEED)
      expect(blue.energyEv).toBeGreaterThan(red.energyEv)
    }
    expect(vacuumPulseState(1e-9, 650).x).toBeCloseTo(0.299_792_458, 12)
  })

  it('uses the same display-unit speed for both pulse envelopes', () => {
    for (const wavelength of [400, 520, 700]) {
      const before = vacuumPulseState(1.2, wavelength, 0.62)
      const after = vacuumPulseState(1.7, wavelength, 0.62)
      expect((after.x - before.x) / 0.5).toBeCloseTo(0.62, 14)
    }
  })

  it('rejects invalid photon rates, pulse ages, speeds, and wavelengths', () => {
    for (const rate of [-1, NaN, Infinity]) {
      expect(() => photonBeamProperties(520, rate)).toThrow(RangeError)
    }
    for (const age of [-1, NaN, Infinity]) {
      expect(() => vacuumPulseState(age, 520)).toThrow(RangeError)
    }
    for (const speed of [0, -1, NaN, Infinity]) {
      expect(() => vacuumPulseState(1, 520, speed)).toThrow(RangeError)
    }
    expect(() => photonBeamProperties(0, 10)).toThrow(RangeError)
    expect(() => vacuumPulseState(1, 0)).toThrow(RangeError)
  })
})

describe('two inertial observers', () => {
  it('keeps physical identities fixed while the two proper times exchange roles', () => {
    const fromGround = lightClockComparison(10, 0.8, 'ground')
    expect(fromGround.observer).toBe('ground')
    expect(fromGround.frameTime).toBe(10)
    expect(fromGround.ground.relativeBeta).toBe(0)
    expect(fromGround.moving.relativeBeta).toBe(0.8)
    expect(fromGround.ground.properTime).toBe(10)
    expect(fromGround.moving.properTime).toBeCloseTo(6, 14)

    const fromMoving = lightClockComparison(10, 0.8, 'moving')
    expect(fromMoving.ground.relativeBeta).toBe(-0.8)
    expect(fromMoving.moving.relativeBeta).toBe(0)
    expect(fromMoving.ground.x).toBe(-8)
    expect(fromMoving.moving.x).toBe(0)
    expect(fromMoving.ground.properTime).toBeCloseTo(6, 14)
    expect(fromMoving.moving.properTime).toBe(10)
    expect(lightClockComparison(10, 0.8)).toEqual(fromGround)
  })

  it.each(['ground', 'moving'] as const)('starts both clocks together at the origin in the %s frame', (observer) => {
    const comparison = lightClockComparison(0, 0.95, observer)
    for (const identity of ['ground', 'moving'] as const) {
      const state = comparison[identity]
      expect(state.x).toBeCloseTo(0, 14)
      expect(state.y).toBe(0)
      expect(state.properTime).toBe(0)
      expect(state.ticks).toBe(0)
    }
  })

  it.each(['ground', 'moving'] as const)('preserves light speed on both legs for both identities in the %s frame', (observer) => {
    const height = 1.4
    const c = 0.62
    for (const beta of [0, 0.5, 0.8, 0.95]) {
      for (const identity of ['ground', 'moving'] as const) {
        const isAtRest = observer === identity
        const period = 2 * height * (isAtRest ? 1 : lorentzFactor(beta)) / c
        for (const fraction of [0.17, 0.37, 0.63, 0.87]) {
          const time = fraction * period
          const delta = 1e-5
          const before = lightClockComparison(time, beta, observer, height, c)[identity]
          const after = lightClockComparison(time + delta, beta, observer, height, c)[identity]
          const velocityX = (after.x - before.x) / delta
          const velocityY = (after.y - before.y) / delta
          expect(Math.hypot(velocityX, velocityY)).toBeCloseTo(c, 8)
          expect(velocityX).toBeCloseTo(before.relativeBeta * c, 8)
        }
      }
    }
  })

  it.each(['ground', 'moving'] as const)('agrees with a Lorentz transform of each %s clock event, not a camera translation', (identity) => {
    const time = 1.7
    const beta = 0.8
    const c = 2.3
    const height = 1.4
    const gamma = lorentzFactor(beta)
    const original = lightClockComparison(time, beta, 'ground', height, c)[identity]
    const transformedTime = gamma * (time - beta * original.x / c)
    const transformedX = gamma * (original.x - beta * c * time)
    const transformed = lightClockComparison(transformedTime, beta, 'moving', height, c)[identity]
    expect(transformed.x).toBeCloseTo(transformedX, 12)
    expect(transformed.y).toBeCloseTo(original.y, 12)
    expect(transformed.properTime).toBeCloseTo(original.properTime, 12)
  })

  it.each(['ground', 'moving'] as const)('uses a complete return for each clock tick in the %s frame', (observer) => {
    const beta = 0.95
    const height = 0.9
    const c = 0.62
    for (const identity of ['ground', 'moving'] as const) {
      const period = 2 * height * (observer === identity ? 1 : lorentzFactor(beta)) / c
      const upper = lightClockComparison(period / 2, beta, observer, height, c)[identity]
      const returned = lightClockComparison(period, beta, observer, height, c)[identity]
      expect(upper.y).toBeCloseTo(height, 12)
      expect(upper.ticks).toBe(0)
      expect(returned.y).toBeCloseTo(0, 12)
      expect(returned.ticks).toBe(1)
    }
  })

  it('rejects invalid observers, beta, and time while retaining the subluminal boundary', () => {
    for (const observer of ['ground', 'moving'] as const) {
      for (const beta of [-1, 1, 1.001, NaN, Infinity]) {
        expect(() => lightClockComparison(1, beta, observer)).toThrow(RangeError)
      }
      expect(lightClockComparison(1, 1 - 1e-9, observer).frameTime).toBe(1)
    }
    expect(() => lightClockComparison(-1, 0.8)).toThrow(RangeError)
    expect(() => lightClockComparison(1, 0.8, 'photon' as ClockObserver)).toThrow(RangeError)
    expect(() => lightClockComparison(1, 0.8, 'ground', 0)).toThrow(RangeError)
  })
})


describe('partial polarization path markers', () => {
  it('retains full interference for identical markers and removes it only for orthogonal ones', () => {
    for (const y of [0, 0.0017, 0.005, 0.013]) {
      expect(interferenceDensity(y, 520, 0.3, true, true, 0)).toBeCloseTo(interferenceDensity(y, 520, 0.3), 13)
      expect(interferenceDensity(y, 520, 0.3, true, true, 90)).toBeCloseTo(interferenceDensity(y, 520, 0.3, false), 13)
    }
  })
  it('fills a destructive minimum continuously as the marker overlap decreases', () => {
    const minimum = 520e-9 * 2 / (2 * 0.0003)
    const values = [0, 30, 60, 90].map(angle => interferenceDensity(minimum, 520, 0.3, true, true, angle))
    expect(values[0]).toBeCloseTo(0, 12)
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1])
    expect(polarizationVisibility(60)).toBeCloseTo(0.5, 14)
    expect(polarizationVisibility(90)).toBe(0)
  })
  it('keeps partial-marker sampling normalized, symmetric and nonnegative', () => {
    const distribution = createDetectionDistribution(520, 0.3, true, true, 43)
    expect(distribution.cdf.at(-1)).toBe(1)
    for (let i = 1; i < distribution.cdf.length; i++) expect(distribution.cdf[i]).toBeGreaterThanOrEqual(distribution.cdf[i - 1])
    expect(sampleDetection(distribution, .25)).toBeCloseTo(-sampleDetection(distribution, .75), 10)
  })
  it.each([-1, 91, NaN, Infinity])('rejects invalid marker angle %s', angle => {
    expect(() => polarizationVisibility(angle)).toThrow(RangeError)
  })
})

describe('simultaneity anchored to one ship event', () => {
  it('pairs ship 6 s with ground 10 s or 3.6 s at 0.8c, without changing the ship event', () => {
    const ground = simultaneousClockEvents(6, .8, 'ground')
    const moving = simultaneousClockEvents(6, .8, 'moving')
    expect(ground.ship).toEqual(moving.ship)
    expect(ground.ship.t).toBeCloseTo(10)
    expect(ground.ship.x).toBeCloseTo(8)
    expect(ground.ground.t).toBeCloseTo(10)
    expect(moving.ground.t).toBeCloseTo(3.6)
    expect(moving.ship.t - .8 * moving.ship.x).toBeCloseTo(moving.ground.t)
  })
  it.each([0, .3, .8, .95, -.8])('preserves proper time and the invariant interval at beta %s', beta => {
    for (const observer of ['ground', 'moving'] as const) {
      const events = simultaneousClockEvents(12, beta, observer)
      expect(events.ship.t ** 2 - events.ship.x ** 2).toBeCloseTo(12 ** 2, 10)
      const clocks = lightClockComparison(clockFrameTime(12, beta, observer), beta, observer)
      expect(clocks.moving.properTime).toBeCloseTo(12)
      expect(clocks.ground.properTime).toBeCloseTo(events.ground.t)
    }
  })
  it('keeps cumulative time and ticks increasing over many animation windows', () => {
    const first = lightClockComparison(10, .8)
    const later = lightClockComparison(1000, .8)
    expect(later.moving.properTime).toBeCloseTo(600)
    expect(later.moving.ticks).toBeGreaterThan(first.moving.ticks)
  })
})
