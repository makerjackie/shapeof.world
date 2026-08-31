import firstSeen from './generated/world-first-seen.json'

/**
 * Homepage “最近更新” uses each public world’s first appearance date
 * (component or first poster add). Poster recaptures update sitemap lastmod
 * only. Failed and archived worlds are absent because they are not in `worlds`.
 */
const firstSeenById = firstSeen as Record<string, string>

export function getWorldReleaseDate(worldId: string): string | undefined {
  return firstSeenById[worldId]
}

export function listFreshWorldIds(options?: {
  withinDays?: number
  limit?: number
  now?: Date
}): string[] {
  const withinDays = options?.withinDays ?? 30
  const limit = options?.limit ?? 12
  const now = options?.now ?? new Date()
  const cutoff = now.getTime() - withinDays * 86_400_000
  return Object.entries(firstSeenById)
    .filter(([, date]) => Date.parse(date) >= cutoff)
    .sort(([leftId, leftDate], [rightId, rightDate]) => {
      const dateDelta = Date.parse(rightDate) - Date.parse(leftDate)
      return dateDelta !== 0 ? dateDelta : leftId.localeCompare(rightId)
    })
    .slice(0, limit)
    .map(([id]) => id)
}
