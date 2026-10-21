import { describe, expect, it } from 'vitest'
import { recommendedWorldIds, HOME_PRIMARY_COUNT } from '~/data/home-recommended'
import { homeFeaturedWeek, selectHomeFeaturedIds } from './home-featured'

const availableIds = [...recommendedWorldIds, 'unreviewed-new-world']

describe('homepage selection', () => {
  it('starts with six primary choices, never outside the approved pool', () => {
    const selected = selectHomeFeaturedIds({ availableIds })
    expect(selected).toHaveLength(6)
    expect(selected.every((id) => recommendedWorldIds.slice(0, HOME_PRIMARY_COUNT).includes(id as typeof recommendedWorldIds[number]))).toBe(true)
    expect(new Set(selected).size).toBe(6)
    expect(selected).not.toContain('unreviewed-new-world')
  })
  it('uses Shanghai Monday boundaries without resetting at a year boundary', () => {
    expect(homeFeaturedWeek(Date.parse('2026-09-13T15:59:59Z'))).toBe(0)
    expect(homeFeaturedWeek(Date.parse('2026-09-13T16:00:00Z'))).toBe(1)
    expect(homeFeaturedWeek(Date.parse('2026-12-31T23:00:00+08:00')))
      .toBe(homeFeaturedWeek(Date.parse('2027-01-01T01:00:00+08:00')))
  })
  it('keeps four choices between adjacent weeks while rotating two', () => {
    const thisWeek = selectHomeFeaturedIds({ availableIds, week: 0 })
    const nextWeek = selectHomeFeaturedIds({ availableIds, week: 1 })
    expect(thisWeek.filter((id) => nextWeek.includes(id))).toHaveLength(4)
    expect(selectHomeFeaturedIds({ availableIds, week: 0 })).toEqual(thisWeek)
  })
  it('prefers unseen primary works, then unseen secondary works over revisits', () => {
    const visited = recommendedWorldIds.slice(0, 8)
    const selected = selectHomeFeaturedIds({ availableIds, visited })
    expect(selected.slice(0, 2)).toEqual(recommendedWorldIds.slice(8, 10))
    expect(selected.every((id) => !visited.includes(id as typeof recommendedWorldIds[number]))).toBe(true)
  })
  it('manual paging can reach every primary and secondary work without duplicate cards', () => {
    const reached = new Set<string>()
    for (let page = 0; page < recommendedWorldIds.length; page++) {
      const selected = selectHomeFeaturedIds({ availableIds, page })
      expect(new Set(selected).size).toBe(selected.length)
      selected.forEach((id) => reached.add(id))
    }
    expect([...reached].sort()).toEqual([...recommendedWorldIds].sort())
  })
  it('still shows approved works after all are visited and filters removed works', () => {
    const availableIds = ['equation-wormhole', 'fluid-sim', 'unreviewed-new-world']
    expect(selectHomeFeaturedIds({ availableIds, visited: recommendedWorldIds, week: 100, page: 7 }).sort())
      .toEqual(['equation-wormhole', 'fluid-sim'])
    expect(selectHomeFeaturedIds({ availableIds: [], week: -1 })).toEqual([])
  })
})
