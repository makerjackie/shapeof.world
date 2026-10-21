import type { Path } from '~/data/content-graph'
import type { WorldSummary } from '~/data/world-summaries'

export const HOME_FEATURED_PATH_COUNT = 3
export const HOME_FRESH_LIMIT = 6

export function pathMembers(
  path: Path,
  worldById: ReadonlyMap<string, WorldSummary>,
): WorldSummary[] {
  return path.worldIds
    .map((id) => worldById.get(id))
    .filter((item): item is WorldSummary => Boolean(item))
}

/** First unexplored world in editorial order; wrap to the first stop when complete. */
export function firstUnexploredWorldIndex(members: WorldSummary[], visited: readonly string[]): number {
  const index = members.findIndex((world) => !visited.includes(world.id))
  return index >= 0 ? index : 0
}

export function pathDurationMinutes(worlds: ReadonlyArray<Pick<WorldSummary, 'duration'>>): number {
  const seconds = worlds.reduce((sum, world) => sum + (world.duration ?? 0), 0)
  return Math.max(1, Math.round(seconds / 60))
}

export function pathStopLabel(
  path: Path,
  index: number,
  world: WorldSummary,
  locale: 'zh' | 'en',
): string {
  const custom = path.stopLabels?.[index]
  if (custom) return locale === 'en' ? custom.en : custom.zh
  return locale === 'en' ? world.translations.en.topicLabel : world.topicLabel
}

export function formatCompactMonthDay(date: string): string {
  const [, month, day] = date.split('-')
  return month && day ? `${month}.${day}` : date
}
