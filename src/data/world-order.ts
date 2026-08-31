import firstSeen from './generated/world-first-seen.json'

const firstSeenById = firstSeen as Record<string, string>

export function getWorldFirstSeen(worldId: string): string | undefined {
  return firstSeenById[worldId]
}

export function compareCatalogWorlds(left: { id: string }, right: { id: string }): number {
  const leftDate = firstSeenById[left.id]
  const rightDate = firstSeenById[right.id]
  if (leftDate && rightDate && leftDate !== rightDate) return leftDate.localeCompare(rightDate)
  if (leftDate && !rightDate) return -1
  if (!leftDate && rightDate) return 1
  return left.id.localeCompare(right.id)
}
