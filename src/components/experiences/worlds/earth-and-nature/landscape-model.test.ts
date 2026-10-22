import { describe, expect, it } from 'vitest'

import {
  GRID,
  createLandscape,
  isBoundary,
  maxHeight,
  paintHardRock,
  pressUplift,
  riverCellCount,
  route,
  step,
} from './landscape-model'

function grow(years: number, rain = 1, size = 64) {
  const landscape = createLandscape(size)
  const dt = 4000
  for (let t = 0; t < years; t += dt) {
    pressUplift(landscape, size / 2, size / 2, size / 5)
    step(landscape, dt, rain)
  }
  return landscape
}

describe('landscape model', () => {
  it('starts as low land with the sea fixed at the edges', () => {
    const landscape = createLandscape()
    expect(landscape.size).toBe(GRID)
    expect(maxHeight(landscape)).toBeLessThan(150)
    for (let i = 0; i < landscape.height.length; i += 1) {
      if (isBoundary(landscape.size, i)) expect(landscape.height[i]).toBe(0)
    }
  })

  it('routes every cell downhill to the sea', () => {
    const landscape = createLandscape(48)
    route(landscape, 1)
    const { size, receiver, height } = landscape
    for (let i = 0; i < height.length; i += 1) {
      let at = i
      let hops = 0
      while (receiver[at] !== at) {
        expect(height[receiver[at]]).toBeLessThan(height[at])
        at = receiver[at]
        hops += 1
        expect(hops).toBeLessThan(size * size)
      }
      expect(isBoundary(size, at)).toBe(true)
    }
  })

  it('conserves drainage area: everything that falls reaches the sea', () => {
    const landscape = createLandscape(40)
    route(landscape, 2)
    const { size, area, receiver } = landscape
    let reachingSea = 0
    for (let i = 0; i < area.length; i += 1) {
      if (!isBoundary(size, i) && isBoundary(size, receiver[i])) reachingSea += area[i]
    }
    const interior = (size - 2) * (size - 2)
    expect(reachingSea).toBeCloseTo(interior * 400 * 400 * 2, -3)
  })

  it('rises while pushed, then levels off where uplift and erosion balance', () => {
    const early = maxHeight(grow(400_000))
    const late = maxHeight(grow(2_400_000))
    const later = maxHeight(grow(3_200_000))
    expect(early).toBeGreaterThan(300)
    expect(late).toBeGreaterThan(early)
    // Steady state: another 800 000 years of pushing changes the summit by under 10%.
    expect(Math.abs(later - late) / late).toBeLessThan(0.1)
    expect(late).toBeGreaterThan(800)
    expect(late).toBeLessThan(5000)
  })

  it('carves a branching river network instead of one channel', () => {
    const landscape = grow(1_200_000)
    expect(riverCellCount(landscape)).toBeGreaterThan(60)
  })

  it('stops at a lower summit when it rains more', () => {
    const dry = maxHeight(grow(2_400_000, 0.5))
    const wet = maxHeight(grow(2_400_000, 2.5))
    expect(wet).toBeLessThan(dry * 0.75)
  })

  it('wears down once the pushing stops', () => {
    const landscape = grow(1_600_000)
    const peak = maxHeight(landscape)
    for (let t = 0; t < 2_000_000; t += 4000) step(landscape, 4000)
    expect(maxHeight(landscape)).toBeLessThan(peak * 0.7)
  })

  it('leaves hard rock standing higher than the soft rock around it', () => {
    const soft = grow(1_600_000)
    const size = 64
    const hard = createLandscape(size)
    paintHardRock(hard, size / 2, size / 2, size / 6)
    for (let t = 0; t < 1_600_000; t += 4000) {
      pressUplift(hard, size / 2, size / 2, size / 5)
      step(hard, 4000)
    }
    expect(maxHeight(hard)).toBeGreaterThan(maxHeight(soft) * 1.3)
  })

  it('accounts eroded rock as volume carried to the sea', () => {
    const landscape = grow(800_000)
    expect(landscape.erodedM3).toBeGreaterThan(0)
    expect(landscape.years).toBe(800_000)
  })
})
