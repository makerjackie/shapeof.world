import { describe, expect, it } from 'vitest'

import { compareDefaultCatalogOrder, defaultCatalogScore } from './world-default-rank'
import { isFlagship } from './world-tiers'

describe('default catalogue ranking', () => {
  const now = Date.parse('2026-09-11T00:00:00Z')

  it('boosts a flagship world over a solid world with the same release date', () => {
    expect(isFlagship('kakeya-needle')).toBe(true)
    expect(defaultCatalogScore('kakeya-needle', '2026-01-01', now))
      .toBeGreaterThan(defaultCatalogScore('not-a-flagship-world', '2026-01-01', now))
  })

  it('is stable for identical inputs', () => {
    expect(defaultCatalogScore('kakeya-needle', '2026-01-01', now))
      .toBe(defaultCatalogScore('kakeya-needle', '2026-01-01', now))
  })

  it('uses catalogue index only as a tie-breaker', () => {
    const left = { id: 'same-id', index: '02' }
    const right = { id: 'same-id', index: '01' }
    expect(compareDefaultCatalogOrder(left, right, now)).toBeGreaterThan(0)
  })
})
