import { describe, expect, it } from 'vitest'

import { getWorldReleaseDate, listFreshWorldIds } from './world-freshness'
import { archivedWorldIds, getPublicWorld } from './worlds'
import { changelogReleases } from './changelog'
import firstSeen from './generated/world-first-seen.json'

describe('homepage freshness from first appearances and curated updates', () => {
  it('does not promote a work-in-progress changelog link into public discovery', () => {
    expect(changelogReleases.some((release) => release.previewWorldIds?.includes('cat-anatomy'))).toBe(true)
    expect(getWorldReleaseDate('cat-anatomy')).toBeUndefined()
    expect(listFreshWorldIds({ withinDays: 3650, limit: 1000, now: new Date('2026-09-12T12:00:00Z') })).not.toContain('cat-anatomy')
  })
  it('brings updated public worlds back without changing their first appearance', () => {
    const release = changelogReleases.find((item) => item.majorUpdateWorldIds?.includes('earth-spin-orbit'))!
    const recent = listFreshWorldIds({ withinDays: 2, limit: 100, now: new Date(`${release.date}T12:00:00Z`) })
    for (const id of release.majorUpdateWorldIds!.filter(id => getPublicWorld(id))) {
      expect(recent).toContain(id)
      expect(getWorldReleaseDate(id)).toBe(release.date)
    }
    expect(firstSeen.rainbow < release.date).toBe(true)
    expect(getWorldReleaseDate('not-a-public-world')).toBeUndefined()
  })
  it('does not refresh dates for poster updates, maintenance, or ordinary log mentions', () => {
    for (const id of ['double-slit', 'butterfly-effect', 'black-hole-flyby', 'solar-system', 'moon-voyage']) {
      expect(getWorldReleaseDate(id)).toBe((firstSeen as Record<string, string>)[id])
    }
  })
  it('lists only public worlds, newest first-seen first', () => {
    const fresh = listFreshWorldIds({
      withinDays: 3650,
      limit: 20,
      now: new Date('2026-08-13T12:00:00+08:00'),
    })
    expect(fresh.length).toBeGreaterThan(0)
    expect(fresh.length).toBeLessThanOrEqual(20)

    let previous = Number.POSITIVE_INFINITY
    for (const id of fresh) {
      expect(getPublicWorld(id), id).toBeDefined()
      expect(archivedWorldIds.has(id), id).toBe(false)
      const stamp = getWorldReleaseDate(id)
      expect(stamp, id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const time = Date.parse(stamp!)
      expect(time).toBeLessThanOrEqual(previous)
      previous = time
    }
  })

  it('omits worlds whose posters are older than the window', () => {
    const recent = listFreshWorldIds({
      withinDays: 1,
      limit: 50,
      now: new Date('2026-08-13T12:00:00+08:00'),
    })
    for (const id of recent) {
      const stamp = getWorldReleaseDate(id)
      expect(Date.parse(stamp!)).toBeGreaterThanOrEqual(Date.parse('2026-08-12'))
    }
  })
})
