import { HOME_PRIMARY_COUNT, recommendedWorldIds } from '~/data/home-recommended'

export const HOME_FEATURED_COUNT = 6
const DAY = 86_400_000
// Monday midnight in the site's editorial timezone (Asia/Shanghai).
const EPOCH = Date.parse('2026-09-07T00:00:00+08:00')

export function homeFeaturedWeek(now = Date.now()): number {
  return Math.floor((now - EPOCH) / (7 * DAY))
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  if (!items.length) return []
  const start = ((offset % items.length) + items.length) % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

/** Stable within a week; two primary slots rotate each Monday. */
export function selectHomeFeaturedIds({
  availableIds,
  visited = [],
  week = 0,
  page = 0,
}: {
  availableIds: readonly string[]
  visited?: readonly string[]
  week?: number
  page?: number
}): string[] {
  const available = new Set(availableIds)
  const seen = new Set(visited)
  const primary = rotate(recommendedWorldIds.slice(0, HOME_PRIMARY_COUNT), week * 2)
  const secondary = rotate(recommendedWorldIds.slice(HOME_PRIMARY_COUNT), week)
  const ordered = [
    ...primary.filter((id) => !seen.has(id)),
    ...secondary.filter((id) => !seen.has(id)),
    ...primary.filter((id) => seen.has(id)),
    ...secondary.filter((id) => seen.has(id)),
  ].filter((id) => available.has(id))
  return rotate(ordered, page * HOME_FEATURED_COUNT).slice(0, HOME_FEATURED_COUNT)
}
