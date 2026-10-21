import { describe, expect, it } from 'vitest'

import {
  EULER_PERIOD,
  LAGRANGE_PERIOD,
  TRAIL_JUMP,
  angularMomentumZ,
  collinearStars,
  figureEightStars,
  isTrailBreak,
  lagrangeStars,
  makeSim,
  maxAbsZ,
  mechanicalEnergy,
  returnProximity,
  simulate,
  trailPairConnected,
} from './three-body-model'
import {
  DEFAULT_ORBIT_ID,
  EQUAL_ORBITS,
  NAMED_ORBITS,
  SPATIAL_ORBITS,
  UNEQUAL_ORBITS,
  getOrbit,
  listOrbits,
  starsForOrbit,
} from './three-body-orbits'

function advance(starsPeriod: { stars: ReturnType<typeof figureEightStars>; period: number }, budget = 0.4) {
  const sim = makeSim(starsPeriod.stars, { trailMax: 40, trailEvery: 0.05, maxStep: 0.003, period: null })
  const start = sim.stars.map((star) => ({ ...star }))
  const energy0 = mechanicalEnergy(sim.stars)
  let guard = 0
  while (sim.t < starsPeriod.period && guard < 80) {
    simulate(sim, Math.min(budget, starsPeriod.period - sim.t))
    guard += 1
  }
  return { sim, start, energy0 }
}

describe('three-body catalogs', () => {
  it('loads 695 equal-mass, 1349 unequal-mass, and spatial Li–Liao families', () => {
    expect(EQUAL_ORBITS).toHaveLength(695)
    expect(UNEQUAL_ORBITS).toHaveLength(1349)
    expect(SPATIAL_ORBITS.length).toBeGreaterThan(2000)
  })

  it('keeps named dances including Euler, Lagrange, figure-eight and Šuvakov moth I', () => {
    const ids = NAMED_ORBITS.map((orbit) => orbit.id)
    expect(ids).toContain('named-euler')
    expect(ids).toContain('named-lagrange')
    expect(ids).toContain('named-figure-eight')
    expect(ids).toContain('named-moth-i')
    expect(ids).toContain('named-yarn')
  })
})

describe('three-body integrator', () => {
  it('returns the figure-eight near its start after one period', () => {
    const { sim, start } = advance({ stars: figureEightStars(), period: 6.3259 })
    expect(sim.t).toBeGreaterThan(6.3)
    expect(returnProximity(start, sim.stars)).toBeLessThan(0.08)
    expect(sim.escaped).toBeNull()
  })

  it('returns Li–Liao I.A1 (figure-eight family) near its start', () => {
    const orbit = EQUAL_ORBITS.find((item) => item.cls === 'I.A' && item.n === 1)
    expect(orbit).toBeTruthy()
    const { sim, start } = advance({ stars: starsForOrbit(orbit!), period: orbit!.period })
    expect(returnProximity(start, sim.stars)).toBeLessThan(0.08)
  })

  it('returns butterfly I near its start after one period', () => {
    const orbit = getOrbit('named-butterfly-i')
    const { sim, start } = advance({ stars: starsForOrbit(orbit), period: orbit.period })
    expect(returnProximity(start, sim.stars)).toBeLessThan(0.12)
  })

  it('keeps the Lagrange triangle nearly equilateral over a period', () => {
    const { sim } = advance({ stars: lagrangeStars(), period: LAGRANGE_PERIOD }, 0.3)
    const [a, b, c] = sim.stars
    const ab = Math.hypot(b.x - a.x, b.y - a.y)
    const bc = Math.hypot(c.x - b.x, c.y - b.y)
    const ca = Math.hypot(a.x - c.x, a.y - c.y)
    expect(ab).toBeCloseTo(bc, 2)
    expect(bc).toBeCloseTo(ca, 2)
  })

  it('keeps the Euler solution collinear', () => {
    const { sim } = advance({ stars: starsForOrbit(getOrbit('named-euler')), period: EULER_PERIOD }, 0.3)
    const area = sim.stars[0].x * (sim.stars[1].y - sim.stars[2].y)
      + sim.stars[1].x * (sim.stars[2].y - sim.stars[0].y)
      + sim.stars[2].x * (sim.stars[0].y - sim.stars[1].y)
    expect(Math.abs(area)).toBeLessThan(0.05)
  })

  it('conserves energy and zero angular momentum on a collinear periodic orbit', () => {
    const stars = collinearStars(0.3068934205, 0.125506567, 1)
    const { sim, energy0 } = advance({ stars, period: 6.2346748391 })
    expect(Math.abs(mechanicalEnergy(sim.stars) - energy0)).toBeLessThan(0.005)
    expect(Math.abs(angularMomentumZ(sim.stars))).toBeLessThan(0.005)
  })

  it('gives spatial orbits a nonzero vertical velocity', () => {
    const orbit = SPATIAL_ORBITS[0]
    const stars = starsForOrbit(orbit)
    expect(stars[0].z).toBe(0)
    expect(stars[2].z).not.toBe(0)
    expect(Math.abs(stars[0].vz) + Math.abs(stars[1].vz)).toBeGreaterThan(0)
  })

  it('opens the spatial atlas on a high-amplitude orbit, not a near-planar one', () => {
    const opening = getOrbit(DEFAULT_ORBIT_ID)
    expect(opening.kind).toBe('spatial')
    expect(Math.abs(opening.z0 ?? 0) + Math.abs(opening.vz ?? 0)).toBeGreaterThan(0.4)
    const firstPage = listOrbits('spatial', 0.6).slice(0, 8)
    expect(firstPage.every((orbit) => Math.abs(orbit.z0 ?? 0) + Math.abs(orbit.vz ?? 0) > 0.15)).toBe(true)
  })

  it('takes a spatial orbit off the plane during integration', () => {
    const orbit = getOrbit(DEFAULT_ORBIT_ID)
    const sim = makeSim(starsForOrbit(orbit), {
      trailMax: 80,
      trailEvery: 0.04,
      maxStep: 0.003,
      period: orbit.period,
    })
    expect(sim.stars[0].z).toBe(0)
    simulate(sim, 1.4)
    expect(Math.abs(sim.stars[0].z)).toBeGreaterThan(0.05)
    expect(maxAbsZ(sim.stars)).toBeGreaterThan(0.15)
    expect(sim.escaped).toBeNull()
  })

  it('keeps a long trail when trailMax is raised', () => {
    const sim = makeSim(figureEightStars(), {
      trailMax: 220,
      trailEvery: 0.02,
      maxStep: 0.003,
      period: null,
    })
    simulate(sim, 3.2)
    expect(sim.trails[0].length).toBeGreaterThan(80)
    expect(sim.trails[0].length).toBeLessThanOrEqual(220)
  })

  it('breaks a long jump instead of drawing a straight chord', () => {
    const orbit = getOrbit(DEFAULT_ORBIT_ID)
    const sim = makeSim(starsForOrbit(orbit), {
      trailMax: 5000,
      trailEvery: 0.005,
      maxStep: 0.003,
      period: orbit.period,
    })
    for (let i = 0; i < 36; i += 1) simulate(sim, 0.35)
    let segments = 0
    for (const trail of sim.trails) {
      for (let i = 1; i < trail.length; i += 1) {
        const from = trail[i - 1]
        const to = trail[i]
        if (isTrailBreak(from) || isTrailBreak(to)) continue
        segments += 1
        expect(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)).toBeLessThan(TRAIL_JUMP + 1e-6)
      }
    }
    expect(segments).toBeGreaterThan(80)
  })

  it('breaks trails at a period wrap instead of drawing a teleport chord', () => {
    const sim = makeSim(figureEightStars(), {
      trailMax: 2400,
      trailEvery: 0.02,
      maxStep: 0.003,
      period: 6.3259,
    })
    let elapsed = 0
    let guard = 0
    while (elapsed < 7 && guard < 80) {
      simulate(sim, 0.25)
      elapsed += 0.25
      guard += 1
    }
    expect(sim.trails.some((trail) => trail.some((point) => isTrailBreak(point)))).toBe(true)
    for (const trail of sim.trails) {
      for (let i = 1; i < trail.length; i += 1) {
        const from = trail[i - 1]
        const to = trail[i]
        if (isTrailBreak(from) || isTrailBreak(to)) continue
        expect(trailPairConnected(from, to)).toBe(true)
      }
    }
  })
})
