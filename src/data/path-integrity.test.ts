import { describe, expect, it } from 'vitest'

import { paths } from './content-graph'
import { archivedWorldIds, getPublicWorld } from './worlds'

describe('Path integrity', () => {
  it('keeps every ordered Path explicit and publicly playable', () => {
    expect(new Set(paths.map((path) => path.id)).size).toBe(paths.length)
    expect(new Set(paths.map((path) => path.slug)).size).toBe(paths.length)

    for (const path of paths) {
      expect(path.worldIds.length, path.id).toBeGreaterThan(1)
      expect(new Set(path.worldIds).size, path.id).toBe(path.worldIds.length)
      expect(path.slug, path.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      if (path.updatedAt) {
        expect(path.updatedAt, path.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(new Date(path.updatedAt).toISOString().slice(0, 10), path.id).toBe(path.updatedAt)
      }
      if (path.stopLabels) {
        expect(path.stopLabels.length, path.id).toBe(path.worldIds.length)
      }

      for (const worldId of path.worldIds) {
        expect(archivedWorldIds.has(worldId), `${path.id}:${worldId}`).toBe(false)
        expect(getPublicWorld(worldId), `${path.id}:${worldId}`).toBeDefined()
      }
    }
  })
})
