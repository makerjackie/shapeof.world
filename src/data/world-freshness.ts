import firstSeen from './generated/world-first-seen.json'
import { changelogReleases } from './changelog'

/**
 * Recent worlds use the later of first appearance and an explicitly curated major release.
 * Only ids in the public first-seen index can enter discovery. Poster
 * recaptures alone do not change this date or the stable catalogue order.
 */
const firstSeenById = firstSeen as Record<string, string>
const releaseDateById = { ...firstSeenById }
for (const release of changelogReleases) {
  for (const id of release.majorUpdateWorldIds ?? []) {
    if (releaseDateById[id] && release.date > releaseDateById[id]) {
      releaseDateById[id] = release.date
    }
  }
}

export function getWorldReleaseDate(worldId: string): string | undefined {
  return releaseDateById[worldId]
}

export function listFreshWorldIds(options?: {
  withinDays?: number
  limit?: number
  now?: Date
}): string[] {
  const withinDays = options?.withinDays ?? 30
  const limit = options?.limit ?? 20
  const now = options?.now ?? new Date()
  const cutoff = now.getTime() - withinDays * 86_400_000
  return Object.entries(releaseDateById)
    .filter(([, date]) => Date.parse(date) >= cutoff && Date.parse(date) <= now.getTime())
    .sort(([leftId, leftDate], [rightId, rightDate]) => {
      const dateDelta = Date.parse(rightDate) - Date.parse(leftDate)
      return dateDelta !== 0 ? dateDelta : leftId.localeCompare(rightId)
    })
    .slice(0, limit)
    .map(([id]) => id)
}
