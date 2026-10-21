import { describe, expect, it } from 'vitest'

import { recommendedWorldIds } from './home-recommended'
import { archivedWorldIds, getPublicWorld } from './worlds'
import {
  FLAGSHIP_CAPACITY,
  archiveVisibleWorldIds,
  flagshipWorldIds,
  getWorldTier,
  isDiscoverable,
} from './world-tiers'

describe('world tiers', () => {
  it('only promotes worlds that are actually public', () => {
    for (const worldId of flagshipWorldIds) {
      expect(archivedWorldIds.has(worldId), `flagship ${worldId} is archived`).toBe(false)
      expect(getPublicWorld(worldId), `flagship ${worldId} is not in the public catalogue`).toBeDefined()
    }
  })

  it('keeps archive-visible ids resolvable so search and direct links still work', () => {
    for (const worldId of archiveVisibleWorldIds) {
      expect(getPublicWorld(worldId), `archive-visible ${worldId} is not in the public catalogue`).toBeDefined()
    }
  })

  it('never puts one world in two tiers', () => {
    for (const worldId of flagshipWorldIds) {
      expect(archiveVisibleWorldIds.has(worldId), `${worldId} is both flagship and archive-visible`).toBe(false)
    }
  })

  it('derives the shelf from the single curation list, not a second one', () => {
    // 门面必须是 home-recommended 的前缀。两份名单会互相漂移，一份不会。
    expect([...flagshipWorldIds]).toEqual(recommendedWorldIds.slice(0, FLAGSHIP_CAPACITY))
  })

  it('keeps the flagship shelf small enough to stay a shelf', () => {
    expect(flagshipWorldIds.size).toBeGreaterThan(0)
    expect(flagshipWorldIds.size).toBeLessThanOrEqual(20)
  })

  it('defaults unlisted public worlds to solid after publication', () => {
    expect(getWorldTier('a-world-that-was-just-added-by-another-branch')).toBe('solid')
    expect(isDiscoverable('a-world-that-was-just-added-by-another-branch')).toBe(true)
  })
})
