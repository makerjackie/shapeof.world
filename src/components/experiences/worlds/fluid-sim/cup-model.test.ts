import { describe, expect, it } from 'vitest'

import { cupGeometry, insideCup, liquidKind, SPOON_DURATION, spoonPosition } from './cup-model'

describe('cupGeometry', () => {
  it('fits the cup inside a portrait phone with room above and below', () => {
    const cup = cupGeometry(390, 844)
    const aspect = 390 / 844
    // diameter in px across the width
    const diameterPx = cup.r * 2 * 844
    expect(diameterPx).toBeGreaterThan(300)
    expect(diameterPx).toBeLessThan(390)
    expect(insideCup(cup, aspect, 0.5, cup.cy)).toBe(true)
    // top edge leaves room for the question, bottom edge for the controls
    const topPx = (1 - (cup.cy + cup.r)) * 844
    const bottomPx = (1 - (cup.cy - cup.r)) * 844
    expect(topPx).toBeGreaterThan(230)
    expect(bottomPx).toBeLessThan(700)
  })

  it('keeps the cup within the height on a wide desktop', () => {
    const cup = cupGeometry(1440, 900)
    expect(cup.r * 2).toBeLessThan(0.8)
    expect(insideCup(cup, 1440 / 900, 0.02, 0.5)).toBe(false)
    // shifted right, but the rim still clears the right edge
    expect(cup.cx).toBeGreaterThan(0.5)
    expect(cup.cx + (cup.r * 1.1) / (1440 / 900)).toBeLessThan(0.95)
  })
})

describe('spoonPosition', () => {
  const cup = cupGeometry(390, 844)
  const aspect = 390 / 844

  it('stays inside the cup for every demo stroke', () => {
    for (const mode of ['stir', 'push'] as const) {
      for (let t = 0; t <= SPOON_DURATION[mode]; t += 0.05) {
        const p = spoonPosition(mode, t, cup, aspect)
        expect(p).not.toBeNull()
        expect(insideCup(cup, aspect, p!.x, p!.y, 0.1)).toBe(true)
      }
    }
  })

  it('lifts the spoon out when the stroke is over', () => {
    expect(spoonPosition('stir', SPOON_DURATION.stir + 0.01, cup, aspect)).toBeNull()
    expect(spoonPosition('push', -0.01, cup, aspect)).toBeNull()
  })

  it('pushes left to right', () => {
    const a = spoonPosition('push', 0, cup, aspect)!
    const b = spoonPosition('push', SPOON_DURATION.push, cup, aspect)!
    expect(b.x).toBeGreaterThan(a.x)
  })
})

describe('liquidKind', () => {
  it('names the slider by everyday liquids', () => {
    expect(liquidKind(0.3)).toBe('water')
    expect(liquidKind(0.8)).toBe('oil')
    expect(liquidKind(1.6)).toBe('honey')
  })
})
