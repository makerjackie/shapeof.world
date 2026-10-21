import { describe, expect, it } from 'vitest'

import {
  clampBeta,
  energyRatio,
  intervalSquared,
  lightClockLegGeometry,
  lightClockSample,
  lorentzFactor,
  properTimeRate,
  sampleLightClockLeg,
  transformEvent,
  transformVelocity,
} from './light-speed-model'

describe('invariant light speed and Lorentz geometry', () => {
  it('matches the 3–4–5 light-clock triangle and a second analytical speed', () => {
    expect(lorentzFactor(0.6)).toBeCloseTo(1.25, 12)
    expect(properTimeRate(0.6)).toBeCloseTo(0.8, 12)
    expect(properTimeRate(0.8)).toBeCloseTo(0.6, 12)
    expect(lorentzFactor(0)).toBe(1)
    expect(energyRatio(0.6)).toBeCloseTo(1.25, 12)
    expect(energyRatio(0.9999)).toBeGreaterThan(70)
  })

  it('preserves timelike, null, and spacelike intervals and reverses the boost', () => {
    for (const beta of [-0.98, -0.6, 0, 0.8, 0.98]) {
      for (const event of [{ x: 3, ct: 5 }, { x: 5, ct: 5 }, { x: 5, ct: 3 }]) {
        const transformed = transformEvent(event, beta)
        expect(intervalSquared(transformed)).toBeCloseTo(intervalSquared(event), 9)
        const recovered = transformEvent(transformed, -beta)
        expect(recovered.x).toBeCloseTo(event.x, 10)
        expect(recovered.ct).toBeCloseTo(event.ct, 10)
      }
    }
  })

  it('changes simultaneity without collapsing a light-separated pair into one event', () => {
    // Simultaneous lab events one length unit to either side of the origin.
    const left = transformEvent({ x: -1, ct: 0 }, 0.6)
    const right = transformEvent({ x: 1, ct: 0 }, 0.6)
    expect(right.ct - left.ct).toBeCloseTo(-1.5, 12)

    const arrival = transformEvent({ x: 1, ct: 1 }, 0.6)
    expect(arrival.x).toBeCloseTo(0.5, 12)
    expect(arrival.ct).toBeCloseTo(0.5, 12)
    expect(intervalSquared(arrival)).toBeCloseTo(0, 12)
  })

  it('leaves light at c in both directions and keeps massive speeds below c', () => {
    for (const beta of [-0.98, -0.6, 0, 0.8, 0.98]) {
      expect(transformVelocity(1, beta)).toBeCloseTo(1, 12)
      expect(transformVelocity(-1, beta)).toBeCloseTo(-1, 12)
    }
    expect(transformVelocity(0.6, -0.6)).toBeCloseTo(15 / 17, 12)
    expect(transformVelocity(0.6, 0.6)).toBe(0)
  })

  it('keeps UI clipping separate from the physical domain and rejects a photon rest frame', () => {
    expect(clampBeta(1)).toBe(0.98)
    expect(clampBeta(-1)).toBe(-0.98)
    expect(() => clampBeta(Number.NaN)).toThrow(RangeError)
    expect(() => lorentzFactor(1)).toThrow(/no light rest frame/)
    expect(() => transformEvent({ x: 1, ct: 1 }, -1)).toThrow(RangeError)
  })
})

describe('transverse light-clock samples', () => {
  it('takes 2.5 lab units for one moving tick versus 2 for a stationary tick at 0.6c', () => {
    const reflection = lightClockSample(1.25, 0.6)
    expect(reflection.moving.position.x).toBeCloseTo(0.75, 12)
    expect(reflection.moving.position.y).toBeCloseTo(1, 12)
    // The diagonal leg is 1.25 long, traversed in 1.25 time units: c = 1.
    expect(Math.hypot(reflection.moving.position.x, reflection.moving.position.y)).toBeCloseTo(1.25, 12)

    const returned = lightClockSample(2.5, 0.6)
    expect(returned.moving.roundTripTime).toBeCloseTo(2.5, 12)
    expect(returned.stationary.roundTripTime).toBe(2)
    expect(returned.moving.properTime).toBeCloseTo(2, 12)
    expect(returned.moving.position.y).toBeCloseTo(0, 12)
    expect(returned.moving.ticks).toBe(1)
    expect(returned.moving.phase).toBeCloseTo(0, 12)
  })

  it('preserves light speed between reflections for either clock and either direction of travel', () => {
    for (const beta of [-0.8, 0, 0.6, 0.98]) {
      for (const time of [0.1, 0.3, 3.7]) {
        const sample = lightClockSample(time, beta, 2)
        for (const clock of [sample.stationary, sample.moving]) {
          expect(Math.hypot(clock.velocity.x, clock.velocity.y)).toBeCloseTo(1, 12)
          expect(clock.position.y).toBeGreaterThanOrEqual(0)
          expect(clock.position.y).toBeLessThanOrEqual(2)
        }
      }
    }
  })

  it('scales mirror spacing, reflects continuously, and samples independently of call history', () => {
    const before = lightClockSample(2.5 - 1e-6, 0.6, 2)
    const after = lightClockSample(2.5 + 1e-6, 0.6, 2)
    expect(before.moving.position.y).toBeCloseTo(after.moving.position.y, 10)
    expect(before.moving.velocity.y).toBeGreaterThan(0)
    expect(after.moving.velocity.y).toBeLessThan(0)
    expect(after.moving.roundTripTime).toBeCloseTo(5, 12)

    const first = lightClockSample(0.625, 0.6)
    lightClockSample(1000, 0.98)
    expect(lightClockSample(0.625, 0.6)).toEqual(first)
    expect(first.moving.position.x).toBeCloseTo(0.375, 12)
    expect(first.moving.position.y).toBeCloseTo(0.5, 12)
    expect(() => lightClockSample(1, 0.6, 0)).toThrow(RangeError)
    expect(() => lightClockSample(-1, 0.6)).toThrow(RangeError)
  })
})

describe('one light-clock leg measured in two frames', () => {
  it('builds the 3:4:5 triangle and makes both measured speeds equal to c', () => {
    const geometry = lightClockLegGeometry(0.8)
    expect(geometry.vertical).toBe(3)
    expect(geometry.horizontal).toBeCloseTo(4, 12)
    expect(geometry.hypotenuse).toBeCloseTo(5, 12)
    expect(geometry.tLab).toBeCloseTo(5, 12)
    expect(geometry.tClock).toBe(3)
    expect(geometry.reflectionLab).toEqual({ x: 4, y: 3, ct: 5 })
    expect(geometry.reflectionClock).toEqual({ x: 0, y: 3, ct: 3 })
    expect(Math.hypot(geometry.vertical, geometry.horizontal) / geometry.tLab).toBeCloseTo(1, 12)
    expect(geometry.vertical / geometry.tClock).toBe(1)
  })

  it('locates the same null light events in both frames and lands exactly on the moving mirror', () => {
    for (const beta of [-0.98, -0.8, 0, 0.6, 0.98]) {
      const geometry = lightClockLegGeometry(beta, 2)
      for (const progress of [0, 0.25, 0.5, 1]) {
        const sample = sampleLightClockLeg(geometry, progress)
        const transformed = transformEvent(sample.photonLab, beta)
        expect(transformed.x).toBeCloseTo(sample.photonClock.x, 10)
        expect(transformed.ct).toBeCloseTo(sample.photonClock.ct, 10)
        expect(sample.photonLab.y).toBe(sample.photonClock.y)
        // There are two spatial dimensions here. The 1D interval helper alone
        // deliberately excludes y and must not be mistaken for this null norm.
        expect(sample.photonLab.ct ** 2 - sample.photonLab.x ** 2 - sample.photonLab.y ** 2).toBeCloseTo(0, 10)
        expect(sample.upperMirrorLab.y - sample.lowerMirrorLab.y).toBe(2)
      }
      expect(sampleLightClockLeg(geometry, 0).photonLab).toEqual(geometry.emission)
      const arrival = sampleLightClockLeg(geometry, 1)
      expect(arrival.photonLab).toEqual(arrival.upperMirrorLab)
      expect(arrival.photonLab).toEqual(geometry.reflectionLab)
    }
  })

  it('reverses only the horizontal direction and scales the entire experiment with mirror spacing', () => {
    const right = lightClockLegGeometry(0.8)
    const left = lightClockLegGeometry(-0.8)
    expect(left.reflectionLab.x).toBeCloseTo(-4, 12)
    expect(left.horizontal).toBe(right.horizontal)
    expect(left.tLab).toBe(right.tLab)
    const doubled = lightClockLegGeometry(0.8, 6)
    expect(doubled.vertical).toBeCloseTo(6, 12)
    expect(doubled.horizontal).toBeCloseTo(8, 12)
    expect(doubled.hypotenuse).toBeCloseTo(10, 12)
    expect(doubled.tClock).toBe(6)
    expect(sampleLightClockLeg(right, 0.5).photonLab).toEqual({ x: 2, y: 1.5, ct: 2.5 })
  })

  it('stays finite near either light-speed boundary without admitting a light rest frame', () => {
    for (const beta of [-0.999999999, 0.999999999]) {
      const geometry = lightClockLegGeometry(beta)
      expect(Number.isFinite(geometry.tLab)).toBe(true)
      expect(Number.isFinite(geometry.horizontal)).toBe(true)
      expect(geometry.tLab).toBeGreaterThan(60_000)
      // Normalize before checking the null relation to avoid subtracting very
      // large, almost equal squared lengths near the light-speed boundary.
      const event = geometry.reflectionLab
      expect(1 - (event.x / event.ct) ** 2 - (event.y / event.ct) ** 2).toBeCloseTo(0, 12)
    }
    expect(() => lightClockLegGeometry(1)).toThrow(/no light rest frame/)
    expect(() => lightClockLegGeometry(0.8, 0)).toThrow(RangeError)
    const geometry = lightClockLegGeometry(0.8)
    expect(sampleLightClockLeg(geometry, -1).photonLab).toEqual(geometry.emission)
    expect(sampleLightClockLeg(geometry, 2).photonLab).toEqual(geometry.reflectionLab)
  })
})
