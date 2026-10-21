import { describe, expect, it } from 'vitest'

import { recommendedWorldIds } from './home-recommended'
import { getPublicWorldSummary } from './world-summaries'

describe('homepage recommended order', () => {
  it('contains unique public worlds only', () => {
    expect(new Set(recommendedWorldIds).size).toBe(recommendedWorldIds.length)
    expect(recommendedWorldIds.every((worldId) => Boolean(getPublicWorldSummary(worldId)))).toBe(true)
  })
})
