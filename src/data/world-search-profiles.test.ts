import { describe, expect, test } from 'vitest'

import { getWorldSearchProfile, searchPilotWorldIds } from './world-search-profiles'

const locales = ['zh', 'en'] as const

describe('world search profiles', () => {
  test('cover the five pilot worlds and nothing else', () => {
    expect([...searchPilotWorldIds].sort()).toEqual([
      'black-hole-flyby',
      'fluid-sim',
      'mandelbrot-zoom',
      'moon-voyage',
      'solar-system',
    ])
    expect(getWorldSearchProfile('eclipses')).toBeUndefined()
    expect(getWorldSearchProfile('toString')).toBeUndefined()
  })

  for (const worldId of searchPilotWorldIds) {
    for (const locale of locales) {
      test(`${worldId} has full ${locale} copy`, () => {
        const copy = getWorldSearchProfile(worldId)![locale]
        expect(copy.title.length).toBeGreaterThanOrEqual(15)
        expect(copy.description.length).toBeGreaterThanOrEqual(50)
        expect(copy.answer.length).toBeGreaterThanOrEqual(50)
        expect(copy.queries.length).toBeGreaterThanOrEqual(4)
        expect(copy.teaches.length).toBeGreaterThanOrEqual(3)
        for (const text of [...copy.queries, ...copy.teaches]) expect(text.trim()).not.toBe('')
      })
    }
  }
})
