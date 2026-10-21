import { parseWorldPath } from './world-urls'
import { recommendedWorldIds } from '~/data/home-recommended'
import { selectHomeFeaturedIds } from '~/lib/home-featured'
import { stripLocalePrefix } from '~/lib/locale'

function sharedPrefixLength(left: string, right: string): number {
  let length = 0
  while (length < left.length && length < right.length && left[length] === right[length]) length += 1
  return length
}

/**
 * Worlds offered on the 404 page: the same weekly selection the home page
 * shows. A mistyped `/<id>` that clearly names a selected world
 * (`/periodic`, `/periodic-tabel`) puts that world first.
 */
export function selectNotFoundWorldIds(availableIds: readonly string[], pathname: string, week: number): string[] {
  const featured = selectHomeFeaturedIds({ availableIds, week })
  const requested = parseWorldPath(stripLocalePrefix(pathname))?.worldId
  if (!requested || requested.length < 4) return featured
  const available = new Set(availableIds)
  const match = recommendedWorldIds.find((id) => available.has(id)
    && (id.startsWith(requested) || sharedPrefixLength(id, requested) >= 6))
  if (!match) return featured
  return [match, ...featured.filter((id) => id !== match)].slice(0, Math.max(featured.length, 1))
}
