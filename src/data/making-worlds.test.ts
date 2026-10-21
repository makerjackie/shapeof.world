import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { failedWorldIds } from './failed-worlds'
import { makingWorldIds, makingWorldIdSet, isMakingWorldId } from './making-worlds'
import { archivedWorldIds, getPublicWorld, getWorld } from './worlds'
import { resolveWorldState } from './world-state'
import { worldCatalog } from './worlds/catalog'
import { getWorldPublication } from './worlds/types'
import { getPublicWorldSummary } from './world-summaries'
import { registeredRendererIds } from '../worlds/experience-registry'

describe('worlds in the making', () => {
  it('derives the making set from WorldState and keeps it directly playable', () => {
    const catalogMakingIds = worldCatalog
      .filter((world) => resolveWorldState(world) === 'making')
      .map((world) => world.id)

    expect(new Set(makingWorldIds).size).toBe(makingWorldIds.length)
    expect([...makingWorldIdSet]).toEqual([...makingWorldIds])
    expect(makingWorldIds).toEqual(catalogMakingIds)

    for (const worldId of makingWorldIds) {
      const world = getWorld(worldId)

      expect(isMakingWorldId(worldId), worldId).toBe(true)
      expect(archivedWorldIds.has(worldId), worldId).toBe(false)
      expect(failedWorldIds.has(worldId), worldId).toBe(false)
      expect(getWorldPublication(world ?? {}), worldId).toBe('making')
      expect(getPublicWorld(worldId), worldId).toBeUndefined()
      expect(getPublicWorldSummary(worldId), worldId).toBeUndefined()
      expect(world, worldId).toBeDefined()
      expect(registeredRendererIds, worldId).toContain(world?.renderer)
    }
  })

  it('indexes the gallery but never its individual making worlds', () => {
    const sitemap = readFileSync(resolve(import.meta.dirname, '../../public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://shapeof.world/making</loc>')
    for (const worldId of makingWorldIds) {
      expect(sitemap, worldId).not.toContain(
        `<loc>https://shapeof.world/explore/${worldId}</loc>`,
      )
    }
  })
})
