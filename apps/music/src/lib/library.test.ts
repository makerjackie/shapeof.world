import { afterEach, describe, expect, it, vi } from 'vitest'
import { tracks } from '../data/catalog'
import { initialLibrary, readLibrary, sortLibrary } from './library'

afterEach(() => vi.unstubAllGlobals())
describe('library browsing state', () => {
  it('survives blocked or damaged browser storage', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked') } })
    expect(readLibrary()).toEqual(initialLibrary)
    vi.stubGlobal('sessionStorage', { getItem: () => '{broken' })
    expect(readLibrary()).toEqual(initialLibrary)
  })
  it('restores valid filters without accepting malformed stored values', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ filters: { q: 'piano', energy: 'loud', style: 'ambient', durationMin: 0 }, limit: -10, sort: 'unknown', savedOnly: true }) })
    expect(readLibrary()).toEqual({ filters: { q: 'piano', style: 'ambient', durationMin: 0 }, limit: 40, sort: 'explore', savedOnly: true })
  })
  it('keeps every track, leaves the source untouched, and sorts durations numerically', () => {
    const source = tracks.map(track => track.id)
    for (const sort of ['explore', 'title', 'short', 'long']) {
      const result = sortLibrary(tracks, sort, 'en')
      expect(new Set(result.map(track => track.id))).toEqual(new Set(source))
      expect(tracks.map(track => track.id)).toEqual(source)
      if (sort === 'short') expect(result.every((track, i) => !i || result[i-1].duration <= track.duration)).toBe(true)
      if (sort === 'long') expect(result.every((track, i) => !i || result[i-1].duration >= track.duration)).toBe(true)
    }
  })
})
