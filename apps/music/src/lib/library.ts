import type { Track } from '~/data/catalog'
import type { TrackFilters } from './filters'

export type LibraryState = { filters: TrackFilters; sort: string; savedOnly: boolean; limit: number }
export const initialLibrary: LibraryState = { filters: {}, sort: 'explore', savedOnly: false, limit: 40 }
export function readLibrary(key = 'music.library'): LibraryState {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (!value || typeof value !== 'object') return initialLibrary
    const filters: TrackFilters = {}
    for (const key of ['q', 'style', 'scenario', 'category'] as const) {
      if (typeof value.filters?.[key] === 'string') filters[key] = value.filters[key]
    }
    for (const key of ['energy', 'durationMin', 'durationMax'] as const) {
      if (typeof value.filters?.[key] === 'number' && Number.isFinite(value.filters[key])) filters[key] = value.filters[key]
    }
    for (const key of ['commercialOnly', 'loopOnly', 'narrationOnly'] as const) {
      if (value.filters?.[key] === true) filters[key] = true
    }
    return { filters, sort: ['explore', 'short', 'long', 'title'].includes(value.sort) ? value.sort : 'explore', savedOnly: value.savedOnly === true, limit: Number.isInteger(value.limit) ? Math.max(40, Math.min(1000, value.limit)) : 40 }
  } catch { return initialLibrary }
}
// Stable ordering mixes styles without changing on every render or visit.
const rank = (id: string) => [...id].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)
export function sortLibrary(tracks: Track[], sort: string, locale: 'zh' | 'en') {
  return [...tracks].sort((a, b) => sort === 'short' ? a.duration - b.duration : sort === 'long' ? b.duration - a.duration : sort === 'title' ? a.title[locale].localeCompare(b.title[locale], locale) : rank(a.id) - rank(b.id))
}
