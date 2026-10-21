import { getWorldReleaseDate } from './world-freshness'
import { isFlagship } from './world-tiers'

/**
 * Default catalogue order is computed, not hand-ranked.
 * Flagship worlds get a modest quality boost; recent public dates
 * still surface new work; a stable hash keeps the mix from collapsing
 * into a second “newest” list.
 */
export const DEFAULT_CATALOG_QUALITY = 0.35
export const DEFAULT_CATALOG_FRESHNESS = 0.5
export const DEFAULT_CATALOG_JITTER = 0.12
export const DEFAULT_CATALOG_HALF_LIFE_DAYS = 90

function hashWorldId(worldId: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < worldId.length; index += 1) {
    hash ^= worldId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function defaultCatalogScore(
  worldId: string,
  releaseDate?: string,
  now = Date.now(),
): number {
  const quality = isFlagship(worldId) ? DEFAULT_CATALOG_QUALITY : 0
  const ageDays = releaseDate
    ? Math.max(0, (now - Date.parse(releaseDate)) / 86_400_000)
    : 400
  const freshness = Math.exp(-ageDays / DEFAULT_CATALOG_HALF_LIFE_DAYS)
  const jitter = ((hashWorldId(worldId) % 1000) / 1000) * DEFAULT_CATALOG_JITTER
  return quality + freshness * DEFAULT_CATALOG_FRESHNESS + jitter
}

export function compareDefaultCatalogOrder(
  left: { id: string; index?: string | number },
  right: { id: string; index?: string | number },
  now = Date.now(),
): number {
  const delta = defaultCatalogScore(right.id, getWorldReleaseDate(right.id), now)
    - defaultCatalogScore(left.id, getWorldReleaseDate(left.id), now)
  if (delta !== 0) return delta
  return Number(left.index ?? 0) - Number(right.index ?? 0)
}
