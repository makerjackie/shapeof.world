import { describe, expect, it } from 'vitest'

import {
  dailyIssues,
  getDailyFeaturedIssue,
  getDailyIssueFeed,
  getDailyIssueFeedContext,
  getEditorialDayKey,
  getNextDailyIssue,
  localizeIssue,
  validateDailyIssues,
} from './issues'
import { getWorld } from './worlds'
import { getPublicWorld, rightsBlockedWorldIds } from './worlds'

describe('daily issue catalogue', () => {
  it('keeps every issue valid and uniquely addressable', () => {
    expect(validateDailyIssues(dailyIssues, getWorld)).toEqual([])
    expect(new Set(dailyIssues.map((issue) => issue.id)).size).toBe(dailyIssues.length)
  })

  it('removes the tectonic explorer edition from the public issue catalogue', () => {
    expect(dailyIssues.some((issue) => issue.worldId === 'tectonic-explorer')).toBe(false)
  })

  it('puts an explicitly scheduled issue first', () => {
    const feed = getDailyIssueFeed(new Date('2026-07-17T12:00:00Z'), 4)
    expect(feed[0]?.id).toBe('gravity-turns-falling-into-orbit')
  })

  it('separates the one featured daily discovery from the complete archive', () => {
    expect(getDailyFeaturedIssue(new Date('2026-07-17T12:00:00Z'))?.id).toBe('gravity-turns-falling-into-orbit')
    expect(getDailyFeaturedIssue(new Date('2026-07-20T12:00:00Z'))?.id).toBe('gravity-turns-falling-into-orbit')
    expect(getDailyFeaturedIssue(new Date('2025-01-01T12:00:00Z'))).toBeUndefined()
  })

  it('keeps the selected lead as the first discovery', () => {
    expect(getDailyFeaturedIssue(new Date('2026-07-18T12:00:00Z'))?.id).toBe('gravity-turns-falling-into-orbit')
    expect(getDailyIssueFeed(new Date('2026-07-18T12:00:00Z'), 1)[0]?.id)
      .toBe(getDailyFeaturedIssue(new Date('2026-07-18T12:00:00Z'))?.id)
  })

  it('keeps the lead and the newest discoveries in the first impression', () => {
    const feed = getDailyIssueFeed(new Date('2026-07-17T12:00:00Z'), 3)
    expect(feed.map((issue) => issue.id)).toEqual([
      'gravity-turns-falling-into-orbit',
      'cities-stitch-the-world',
      'inside-a-cow',
    ])
  })

  it('returns a deterministic feed without repeating a world', () => {
    const date = new Date('2026-07-12T12:00:00Z')
    const first = getDailyIssueFeed(date, 4)
    const second = getDailyIssueFeed(date, 4)
    expect(first.map((issue) => issue.id)).toEqual(second.map((issue) => issue.id))
    expect(new Set(first.map((issue) => issue.worldId)).size).toBe(first.length)
  })

  it('exposes every published world on the main discovery feed', () => {
    const date = new Date('2026-07-12T12:00:00Z')
    const feed = getDailyIssueFeed(date)
    const publishedWorlds = new Set(
      dailyIssues
        .filter((issue) => issue.publishedOn <= '2026-07-12' && Boolean(getPublicWorld(issue.worldId)))
        .map((issue) => issue.worldId),
    )

    expect(feed).toHaveLength(publishedWorlds.size)
    expect(new Set(feed.map((issue) => issue.worldId))).toEqual(publishedWorlds)
  })

  it('keeps archived worlds out of the public discovery feed', () => {
    const feed = getDailyIssueFeed(new Date('2026-07-17T12:00:00Z'))
    // Length tracks published-and-public daily issues as worlds are archived.
    expect(feed.length).toBeGreaterThan(0)
    expect(feed).toHaveLength(
      dailyIssues.filter((issue) => issue.publishedOn <= '2026-07-17' && Boolean(getPublicWorld(issue.worldId))).length,
    )
    expect(feed.some((issue) => issue.worldId === 'gravity-and-orbits')).toBe(false)
    expect(feed.some((issue) => issue.worldId === 'gene-expression')).toBe(false)
    expect(feed.some((issue) => issue.worldId === 'two-mynas')).toBe(false)
    expect(feed.some((issue) => issue.worldId === 'tectonic-explorer')).toBe(false)
    expect(feed.some((issue) => issue.worldId === 'building-sunlight')).toBe(false)
    expect(feed[0]?.worldId).toBe('solar-system')
  })

  it('does not publish issues for removed rights-blocked worlds', () => {
    expect([...rightsBlockedWorldIds]).toEqual([])
    expect(dailyIssues.some((issue) => issue.worldId === 'woolly-mammoth')).toBe(false)
    expect(dailyIssues.some((issue) => issue.worldId === 'armstrong-suit')).toBe(false)
  })

  it('never leaks future issues when an edition predates the archive', () => {
    expect(getDailyIssueFeed(new Date('2025-01-01T12:00:00Z'), 5)).toEqual([])
  })

  it('keeps next navigation inside the exact dated issue sequence', () => {
    const date = new Date('2026-07-11T12:00:00Z')
    const feed = getDailyIssueFeed(date)

    expect(feed.length).toBeGreaterThan(1)
    feed.forEach((issue, index) => {
      const expected = feed[(index + 1) % feed.length]
      expect(getNextDailyIssue(issue, date)?.id).toBe(expected.id)
    })
  })

  it('reports the exact dated position used by the poster feed', () => {
    const date = new Date('2026-07-17T12:00:00Z')
    const feed = getDailyIssueFeed(date)

    feed.forEach((issue, index) => {
      expect(getDailyIssueFeedContext(issue, date)).toMatchObject({
        position: index + 1,
        total: feed.length,
        next: feed[(index + 1) % feed.length],
      })
    })
  })

  it('localizes the daily question without coupling it to the renderer', () => {
    const issue = dailyIssues.find((item) => item.id === 'gravity-turns-falling-into-orbit')!
    expect(localizeIssue(issue, 'zh').question).toContain('太阳')
    expect(localizeIssue(issue, 'en').question).toContain('planets')
  })

  it('changes the edition at a fixed Shanghai midnight on server and client', () => {
    expect(getEditorialDayKey(new Date('2026-07-11T15:59:00Z'))).toBe('2026-07-11')
    expect(getEditorialDayKey(new Date('2026-07-11T16:01:00Z'))).toBe('2026-07-12')
  })
})
