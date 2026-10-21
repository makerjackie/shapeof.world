import type { Path } from './content-graph'
import { getWorldReleaseDate } from './world-freshness'

export function pathReleaseDate(path: Path, worldDate = getWorldReleaseDate): string {
  return path.worldIds.reduce((latest, id) => {
    const date = worldDate(id) ?? ''
    return date > latest ? date : latest
  }, path.updatedAt ?? '')
}

export function sortPathsByRecentUpdate(items: readonly Path[], worldDate = getWorldReleaseDate): Path[] {
  return [...items].sort((a, b) => pathReleaseDate(b, worldDate).localeCompare(pathReleaseDate(a, worldDate))
    || a.order - b.order || a.id.localeCompare(b.id))
}
