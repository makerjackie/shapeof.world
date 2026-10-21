import { describe, expect, it } from 'vitest'

import {
  angularBlurDeg,
  buildRainbowProfile,
  exitDirection,
  rainbowAngleDeg,
  rainbowFootAzimuthDeg,
  sampleGraded,
  sampleProfile,
  scatterAngleRad,
  traceDropRay,
  unpolarizedReflectance,
  visibleArcFraction,
  waterRefractiveIndex,
  wavelengthToRgb,
} from './rainbow-optics'

/**
 * Reference wavelengths are the spectral lines the published water indices and
 * rainbow angles are quoted at, so the numbers below are comparable with the
 * literature rather than with a hand-picked "red" and "violet".
 */
const C_LINE_NM = 656.3
const H_LINE_NM = 404.7

function degrees(radians: number) {
  return (radians * 180) / Math.PI
}

describe('water dispersion', () => {
  it('matches published indices across the visible band', () => {
    // Hale & Querry give 1.3330 at the sodium D line, ~1.3428 at 405 nm and
    // ~1.3311 at 656 nm for water near room temperature.
    expect(waterRefractiveIndex(589.3)).toBeCloseTo(1.3325, 3)
    expect(waterRefractiveIndex(H_LINE_NM)).toBeCloseTo(1.3423, 3)
    expect(waterRefractiveIndex(C_LINE_NM)).toBeCloseTo(1.3307, 3)
  })

  it('bends short wavelengths more than long ones', () => {
    expect(waterRefractiveIndex(400)).toBeGreaterThan(waterRefractiveIndex(700))
  })
})

describe('rainbow angles', () => {
  it('puts the primary bow at the observed 40.7°…42.4°', () => {
    expect(rainbowAngleDeg(waterRefractiveIndex(C_LINE_NM), 1)).toBeCloseTo(42.4, 1)
    expect(rainbowAngleDeg(waterRefractiveIndex(H_LINE_NM), 1)).toBeCloseTo(40.75, 1)
  })

  it('puts the secondary bow near 50°…53° with the colours reversed', () => {
    const red = rainbowAngleDeg(waterRefractiveIndex(C_LINE_NM), 2)
    const violet = rainbowAngleDeg(waterRefractiveIndex(H_LINE_NM), 2)
    expect(red).toBeCloseTo(50.3, 1)
    expect(violet).toBeCloseTo(53.3, 1)
    // Primary: red outside. Secondary: red inside. That flip is the whole point.
    expect(rainbowAngleDeg(waterRefractiveIndex(C_LINE_NM), 1))
      .toBeGreaterThan(rainbowAngleDeg(waterRefractiveIndex(H_LINE_NM), 1))
    expect(red).toBeLessThan(violet)
  })

  it('leaves a gap between the two bows for Alexander’s dark band', () => {
    const outerEdgeOfPrimary = rainbowAngleDeg(waterRefractiveIndex(C_LINE_NM), 1)
    const innerEdgeOfSecondary = rainbowAngleDeg(waterRefractiveIndex(C_LINE_NM), 2)
    expect(innerEdgeOfSecondary - outerEdgeOfPrimary).toBeGreaterThan(7)
  })

  it('is the angle at which the deviation stops changing', () => {
    const index = waterRefractiveIndex(550)
    const peak = rainbowAngleDeg(index, 1)
    const at = (impact: number) => traceDropRay(impact, index, 1).scatterDeg
    // No impact parameter can scatter past the caustic.
    for (let impact = 0.01; impact < 1; impact += 0.01) {
      expect(at(impact)).toBeLessThanOrEqual(peak + 1e-6)
    }
    // And the angle is stationary there: neighbouring rays barely move.
    const cosSquared = (index * index - 1) / 3
    const stationary = Math.sin(Math.acos(Math.sqrt(cosSquared)))
    expect(Math.abs(at(stationary + 0.01) - at(stationary - 0.01))).toBeLessThan(0.02)
  })
})

describe('bow feet on the horizon', () => {
  it('places both feet inside a 104° sky that is fitted to width', () => {
    const primary = rainbowAngleDeg(waterRefractiveIndex(550), 1)
    const foot = rainbowFootAzimuthDeg(12, primary)
    expect(foot).toBeGreaterThan(30)
    expect(foot).toBeLessThan(52)
    expect(visibleArcFraction(12, primary)).toBeGreaterThan(0.5)
  })

  it('hides the feet once the sun climbs past the bow', () => {
    const primary = rainbowAngleDeg(waterRefractiveIndex(550), 1)
    expect(rainbowFootAzimuthDeg(primary, primary)).toBe(0)
  })
})

describe('ray tracing through one drop', () => {
  const index = waterRefractiveIndex(550)

  it('returns light back towards the sun, not onward', () => {
    const ray = traceDropRay(0.86, index, 1)
    expect(degrees(ray.deviationRad)).toBeGreaterThan(90)
    expect(degrees(ray.deviationRad)).toBeLessThan(180)
  })

  it('walks around the drop with one hit per bounce plus entry and exit', () => {
    expect(traceDropRay(0.5, index, 1).path).toHaveLength(3)
    expect(traceDropRay(0.5, index, 2).path).toHaveLength(4)
    for (const point of traceDropRay(0.5, index, 2).path) {
      expect(Math.hypot(point[0], point[1])).toBeCloseTo(1, 9)
    }
  })

  it('enters on the side the light comes from', () => {
    const [entryX, entryY] = traceDropRay(0.6, index, 1).path[0]
    expect(entryX).toBeLessThan(0)
    expect(entryY).toBeCloseTo(0.6, 9)
  })

  it('mirrors the path for rays below the axis', () => {
    const above = traceDropRay(0.7, index, 1)
    const below = traceDropRay(-0.7, index, 1)
    expect(below.scatterDeg).toBeCloseTo(above.scatterDeg, 9)
    expect(below.path[1][1]).toBeCloseTo(-above.path[1][1], 9)
  })

  it('loses far more light to the second bounce than the first', () => {
    const primary = traceDropRay(0.86, index, 1)
    const secondary = traceDropRay(0.95, index, 2)
    expect(secondary.throughput).toBeLessThan(primary.throughput)
  })

  it('keeps Fresnel reflectance physical and rising towards grazing angles', () => {
    const shallow = unpolarizedReflectance(0.1, Math.asin(Math.sin(0.1) / index), index)
    const grazing = unpolarizedReflectance(1.5, Math.asin(Math.sin(1.5) / index), index)
    expect(shallow).toBeGreaterThan(0)
    expect(shallow).toBeLessThan(0.05)
    expect(grazing).toBeGreaterThan(shallow)
    expect(grazing).toBeLessThan(1)
  })

  it('sends the axial ray straight back at the sun', () => {
    expect(scatterAngleRad(0, 0, 1)).toBeCloseTo(0, 9)
  })
})

describe('angular profile of a rain curtain', () => {
  const rain = buildRainbowProfile({ dropRadiusMm: 1, orders: [1, 2], bins: 900, samples: 2400, slices: 24 })

  const brightestBetween = (fromDeg: number, toDeg: number) => {
    let best = { deg: fromDeg, value: -1 }
    for (let bin = 0; bin < rain.luminance.length; bin += 1) {
      const deg = (bin + 0.5) * rain.stepDeg
      if (deg < fromDeg || deg > toDeg) continue
      if (rain.luminance[bin] > best.value) best = { deg, value: rain.luminance[bin] }
    }
    return best
  }

  it('grows a caustic at the primary bow without being told to', () => {
    expect(brightestBetween(20, 46).deg).toBeCloseTo(41.5, 0)
  })

  it('grows a fainter second caustic beyond it', () => {
    const secondary = brightestBetween(47, 60)
    expect(secondary.deg).toBeGreaterThan(49)
    expect(secondary.deg).toBeLessThan(55)
    expect(secondary.value).toBeLessThan(brightestBetween(20, 46).value)
  })

  it('predicts a dark band between the bows, far darker than either side', () => {
    // Alexander's band: no once-reflected light can reach past 42.6°, and
    // twice-reflected light does not start until 50.3°. Neither bow is asked
    // to leave a gap — the gap is what is left over.
    const band = brightestBetween(44, 49).value
    expect(band).toBeLessThan(brightestBetween(20, 38).value * 0.05)
    expect(band).toBeLessThan(brightestBetween(49, 58).value * 0.05)
  })

  it('keeps the sky beyond the secondary bow far fainter than the bow', () => {
    // Not empty: twice-reflected light does spill all the way round towards the
    // sun. It is just spread thin enough to read as sky.
    expect(brightestBetween(62, 88).value).toBeLessThan(brightestBetween(49, 58).value * 0.2)
  })

  it('splits the primary bow with red outside and violet inside', () => {
    const colour: [number, number, number] = [0, 0, 0]
    const outer = [...sampleProfile(rain, 42.1, colour)]
    const inner = [...sampleProfile(rain, 40.6, colour)]
    expect(outer[0] / Math.max(outer[2], 1e-6)).toBeGreaterThan(inner[0] / Math.max(inner[2], 1e-6))
  })

  it('washes a fog droplet bow out to white and moves it inwards', () => {
    const fog = buildRainbowProfile({ dropRadiusMm: 0.01, orders: [1], bins: 900, samples: 1600, slices: 20 })
    const colour: [number, number, number] = [0, 0, 0]

    let fogPeak = { deg: 0, value: -1 }
    for (let bin = 0; bin < fog.luminance.length; bin += 1) {
      const deg = (bin + 0.5) * fog.stepDeg
      if (deg > 46) break
      if (fog.luminance[bin] > fogPeak.value) fogPeak = { deg, value: fog.luminance[bin] }
    }
    // Observed fogbows sit a couple of degrees inside the raindrop bow, near 39°.
    expect(fogPeak.deg).toBeLessThan(40.5)
    expect(fogPeak.deg).toBeGreaterThan(37.5)

    const [fr, fg, fb] = sampleProfile(fog, fogPeak.deg, colour)
    const fogSpread = (Math.max(fr, fg, fb) - Math.min(fr, fg, fb)) / Math.max(fr, fg, fb)
    const [rr, rg, rb] = sampleProfile(rain, 42.1, colour)
    const rainSpread = (Math.max(rr, rg, rb) - Math.min(rr, rg, rb)) / Math.max(rr, rg, rb)
    expect(fogSpread).toBeLessThan(rainSpread)
  })

  it('reads as zero outside the sampled range', () => {
    const colour: [number, number, number] = [0, 0, 0]
    expect(sampleProfile(rain, -5, colour)).toEqual([0, 0, 0])
    expect(sampleProfile(rain, 120, colour)).toEqual([0, 0, 0])
    expect(sampleGraded(rain, -5, colour, 0.3)).toEqual([0, 0, 0])
    expect(sampleGraded(rain, 120, colour, 0.3)).toEqual([0, 0, 0])
  })
})

describe('grading for display', () => {
  const rain = buildRainbowProfile({ dropRadiusMm: 1, orders: [1, 2], bins: 760, samples: 2000, slices: 26 })
  const colour: [number, number, number] = [0, 0, 0]
  const peakOf = (degrees: number, glowGain: number) => Math.max(...sampleGraded(rain, degrees, colour, glowGain))
  const rawOf = (degrees: number) => Math.max(...sampleProfile(rain, degrees, colour))

  it('turns the broad glow down much harder than the narrow bows', () => {
    const glowGain = 0.3
    const glowDrop = peakOf(30, glowGain) / rawOf(30)
    const bowDrop = peakOf(41.75, glowGain) / rawOf(41.75)
    expect(glowDrop).toBeLessThan(0.45)
    expect(bowDrop).toBeGreaterThan(0.7)
  })

  it('keeps the secondary bow above the glow it sits next to', () => {
    // The whole reason for grading: ungraded, the smooth glow inside the primary
    // bow outshines the secondary bow, so any plain curve erases the second bow.
    expect(rawOf(51.35)).toBeLessThan(rawOf(30))
    expect(peakOf(51.35, 0.3)).toBeGreaterThan(peakOf(30, 0.3))
  })

  it('never turns light into darkness', () => {
    for (let degrees = 0; degrees < 88; degrees += 0.5) {
      for (const channel of sampleGraded(rain, degrees, colour, 0.3)) {
        expect(channel).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('drop size and sun height', () => {
  it('blurs small drops far more than large ones', () => {
    expect(angularBlurDeg(0.01, 550)).toBeGreaterThan(angularBlurDeg(1, 550) * 10)
  })

  it('never blurs less sharply than the solar disc itself', () => {
    expect(angularBlurDeg(50, 550)).toBeGreaterThan(0.2)
  })

  it('sinks the bow as the sun climbs and hides it past the bow radius', () => {
    expect(visibleArcFraction(0, 42)).toBe(1)
    expect(visibleArcFraction(21, 42)).toBeLessThan(1)
    expect(visibleArcFraction(21, 42)).toBeGreaterThan(0)
    expect(visibleArcFraction(42, 42)).toBe(0)
    expect(visibleArcFraction(60, 42)).toBe(0)
  })
})

describe('spectral colour', () => {
  it('renders the visible band as recognisable hues', () => {
    const [r, , b] = wavelengthToRgb(680)
    expect(r).toBeGreaterThan(200)
    expect(b).toBeLessThan(80)

    const [gr, gg] = wavelengthToRgb(530)
    expect(gg).toBeGreaterThan(200)
    expect(gg).toBeGreaterThan(gr)

    const [vr, , vb] = wavelengthToRgb(430)
    expect(vb).toBeGreaterThan(150)
    expect(vb).toBeGreaterThan(vr)
  })

  it('stays inside the byte range', () => {
    for (let nm = 400; nm <= 700; nm += 5) {
      for (const channel of wavelengthToRgb(nm)) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }
    }
  })
})


describe('secondary bow explanation', () => {
  it('has a minimum return angle, unlike the primary maximum', () => {
    const index = waterRefractiveIndex(550)
    const edge = rainbowAngleDeg(index, 2)
    for (let impact = 0.01; impact < 1; impact += 0.01) {
      expect(traceDropRay(impact, index, 2).scatterDeg).toBeGreaterThanOrEqual(edge - 1e-6)
    }
  })

  it('uses opposite halves of the drop to return primary and secondary light in the same direction', () => {
    const index = waterRefractiveIndex(550)
    for (const order of [1, 2]) {
      const b = Math.sqrt(1 - (index * index - 1) / (order * order + 2 * order))
      const ray = traceDropRay(order === 1 ? b : -b, index, order)
      const [x, y] = exitDirection(ray)
      expect(x).toBeLessThan(0)
      expect(y).toBeLessThan(0)
      expect(Math.atan2(-y, -x) * 180 / Math.PI).toBeCloseTo(rainbowAngleDeg(index, order), 8)
    }
  })
})
