import { describe, expect, it } from 'vitest'

import releaseManifest from './web-release.json'
import { getWorld } from './worlds'
import { resolveWorldState } from './world-state'
import { changelogReleases } from './changelog'

describe('changelog', () => {
  it('links the current release to real entries and preserves public versus preview states', () => {
    for (const id of releaseManifest.changelogIds) {
      const entry = changelogReleases.find((item) => item.id === id)
      expect(entry, id).toBeDefined()
      expect(entry!.date).toBe(releaseManifest.date)
      for (const worldId of entry!.worldIds ?? []) expect(resolveWorldState(getWorld(worldId)!)).toBe('public')
      for (const worldId of entry!.previewWorldIds ?? []) expect(resolveWorldState(getWorld(worldId)!)).toBe('making')
    }
  })
  it('requires major updates to be explicit public links with no duplicates', () => {
    for (const release of changelogReleases) {
      const major = release.majorUpdateWorldIds ?? []
      expect(new Set(major).size).toBe(major.length)
      for (const id of major) expect(release.worldIds).toContain(id)
    }
  })
  it('keeps releases newest-first with unique ids', () => {
    expect(changelogReleases.length).toBeGreaterThan(0)
    const dates = changelogReleases.map((release) => release.date)
    for (let index = 1; index < dates.length; index += 1) {
      expect(Date.parse(dates[index - 1])).toBeGreaterThanOrEqual(Date.parse(dates[index]))
    }
    expect(new Set(changelogReleases.map((release) => release.id)).size).toBe(changelogReleases.length)
  })
})
