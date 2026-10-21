import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  worldArtifactBucketPath,
  worldArtifactManifest,
  worldCatalogPagePath,
  worldSearchIndexPath,
} from './world-artifacts'
import { worldSummaries } from './world-summaries'
import { archivedWorldIds, rightsBlockedWorldIds } from './world-state'
import { failedWorlds } from './failed-worlds'
import { listFreshWorldIds } from './world-freshness'
import { recommendedWorldIds } from './home-recommended'

describe('World artifact contract', () => {
  it('uses curated update dates consistently in the homepage bootstrap', () => {
    const home = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public/generated/world-artifacts/home-bootstrap.json'), 'utf8'))
    expect(home.freshWorldIds).toEqual(listFreshWorldIds({ withinDays: 36500, limit: 6, now: new Date('2099-01-01') }))
    const included = new Set(home.worlds.map((world: { id: string }) => world.id))
    expect(recommendedWorldIds.every((id) => included.has(id))).toBe(true)
  })
  it('uses the same freshness order across every directory page and category', () => {
    const expected = listFreshWorldIds({ withinDays: 36500, limit: 10000, now: new Date('2099-01-01') })
    const categories = [undefined, ...worldArtifactManifest.categories.map((category) => category.id)]
    for (const category of categories) {
      const count = category ? worldArtifactManifest.categories.find((item) => item.id === category)!.pageCount : worldArtifactManifest.pageCount
      const ids = Array.from({ length: count }, (_, index) => {
        const page: Array<{ id: string }> = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public' + worldCatalogPagePath(index + 1, category, 'newest')), 'utf8'))
        return page.map((world) => world.id)
      }).flat()
      const included = new Set(ids)
      expect(ids).toEqual(expected.filter((id) => included.has(id)))
      if (!category) expect(ids).toEqual(expected)
    }
  })
  it('generates the complete public exploration index without non-public worlds', () => {
    const directory = resolve(import.meta.dirname, '../../public/generated/world-artifacts')
    const ids: string[] = JSON.parse(readFileSync(resolve(directory, 'exploration.json'), 'utf8'))
    const making: Array<{ id: string }> = JSON.parse(readFileSync(resolve(directory, 'making.json'), 'utf8'))
    expect(ids).toEqual(worldSummaries.map((world) => world.id))
    expect(new Set(ids).size).toBe(ids.length)
    const excluded = [
      ...archivedWorldIds, ...rightsBlockedWorldIds,
      ...failedWorlds.map((world) => world.worldId), ...making.map((world) => world.id),
    ]
    expect(ids.filter((id) => excluded.includes(id))).toEqual([])
  })

  it('retains English detail copy for every public world', () => {
    const buckets = new Map<string, Record<string, { world: { translations: { en: Record<string, string> } } }>>()
    for (const summary of worldSummaries) {
      const path = worldArtifactBucketPath(summary.id)
      if (!buckets.has(path)) {
        buckets.set(path, JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public' + path), 'utf8')))
      }
      const english = buckets.get(path)?.[summary.id]?.world.translations.en
      for (const field of ['hook', 'payoff', 'posterSource']) {
        expect(english?.[field], `${summary.id} is missing English ${field}`).toBeTruthy()
      }
    }
  })

  it('keeps the committed manifest aligned with public summaries', () => {
    expect(worldArtifactManifest.total).toBe(worldSummaries.length)
    const { pageSize, tailAbsorb } = worldArtifactManifest
    const fullPages = Math.floor(worldSummaries.length / pageSize)
    const remainder = worldSummaries.length % pageSize
    const expectedPages = remainder === 0 ? fullPages : remainder <= tailAbsorb && fullPages > 0 ? fullPages : fullPages + 1
    expect(worldArtifactManifest.pageCount).toBe(expectedPages)
    expect(worldArtifactManifest.fallbackWorlds).toHaveLength(2)
  })

  it('builds stable bounded asset paths', () => {
    expect(worldArtifactBucketPath('seasons')).toMatch(/^\/generated\/world-artifacts\/details\/[0-9a-f]{2}\.json$/)
    expect(worldCatalogPagePath(2)).toBe('/generated/world-artifacts/pages/catalogue/0002.json')
    expect(worldCatalogPagePath(1, 'physics', 'newest')).toBe('/generated/world-artifacts/pages/categories/physics/newest/0001.json')
    expect(worldSearchIndexPath('zh')).toBe('/generated/world-artifacts/search/zh.json')
  })

  it('merges failed and making worlds without exposing other archives', () => {
    const making: Array<{ id: string }> = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public/generated/world-artifacts/making.json'), 'utf8'))
    const ids = making.map((world) => world.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const record of failedWorlds) expect(ids).toContain(record.worldId)
    for (const id of rightsBlockedWorldIds) expect(ids).not.toContain(id)
    const failedIds = new Set(failedWorlds.map((world) => world.worldId))
    for (const id of archivedWorldIds) if (!failedIds.has(id)) expect(ids).not.toContain(id)
  })

  it('lists making worlds newest first by first-seen date', () => {
    const making: Array<{ id: string; firstSeen: string; lastModified: string }> = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../public/generated/world-artifacts/making.json'), 'utf8'),
    )
    expect(making.every((world) => /^\d{4}-\d{2}-\d{2}$/.test(world.firstSeen))).toBe(true)
    expect(making.every((world) => /^\d{4}-\d{2}-\d{2}$/.test(world.lastModified))).toBe(true)
    expect(making.every((world) => world.lastModified >= world.firstSeen)).toBe(true)
    const sorted = [...making].sort((left, right) => {
      const dateDelta = right.firstSeen.localeCompare(left.firstSeen)
      return dateDelta !== 0 ? dateDelta : left.id.localeCompare(right.id)
    })
    expect(making.map((world) => world.id)).toEqual(sorted.map((world) => world.id))
  })

  it('excludes rights-blocked records and references from public artifacts', () => {
    const generator = readFileSync(resolve(import.meta.dirname, '../../scripts/generate-world-artifacts.mjs'), 'utf8')
    expect(generator).toContain("from './lib/world-lifecycle.mjs'")
    expect(generator).toContain('resolveWorldState')
    expect(generator).toContain("if (state === 'rights-blocked') continue")
    expect(generator).toContain("resolveWorldState({id}) !== 'rights-blocked'")
  })
})
