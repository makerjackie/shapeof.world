import { isDiscoverable as worldIsDiscoverable } from '~/data/world-tiers'

export type Identified = { id: string }

export type RandomSource = () => number

export type SelectionOptions = {
  random?: RandomSource
  /** Override discovery eligibility in tests or a narrower entry point. */
  isDiscoverable?: (world: Identified) => boolean
}

export type EditorialNextKind = 'issue' | 'path' | 'related' | 'recommended'

export type EditorialNextWorldInput<T> = {
  issue?: T | null
  path?: T | null
  related?: T | null
  recommended?: T | null
}

export type EditorialNextWorldSelection<T> = {
  world: T
  kind: EditorialNextKind
}

type VisitedIds = ReadonlyArray<string> | ReadonlySet<string>

function toVisitedSet(visited: VisitedIds): ReadonlySet<string> {
  return visited instanceof Set ? visited : new Set(visited)
}

function randomItem<T>(items: ReadonlyArray<T>, random: RandomSource): T | undefined {
  if (items.length === 0) return undefined
  // Keep the selector total even if a caller passes a malformed injected
  // source at a boundary (the normal TypeScript path always supplies a fn).
  const value = typeof random === 'function' ? random() : Math.random()
  if (!Number.isFinite(value)) return items[0]
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(value * items.length)))
  return items[index]
}

function safeRandomIndex(upperExclusive: number, random: RandomSource): number {
  if (upperExclusive <= 1) return 0

  let value: number
  try {
    value = typeof random === 'function' ? random() : Math.random()
  } catch {
    return 0
  }

  if (!Number.isFinite(value)) return 0
  return Math.min(upperExclusive - 1, Math.max(0, Math.floor(value * upperExclusive)))
}

/** Select the strongest available editorial continuation for a world page. */
export function selectEditorialNextWorld<T>({
  issue,
  path,
  related,
  recommended,
}: EditorialNextWorldInput<T>): EditorialNextWorldSelection<T> | undefined {
  if (issue != null) return { world: issue, kind: 'issue' }
  if (path != null) return { world: path, kind: 'path' }
  if (related != null) return { world: related, kind: 'related' }
  if (recommended != null) return { world: recommended, kind: 'recommended' }
  return undefined
}

/**
 * Sample a small, shuffled pool from a potentially large world collection.
 * Reservoir sampling keeps the retained world objects bounded by `limit`;
 * the id set is only used to prevent duplicate candidates.
 */
export function selectRandomWorldCandidates<T extends Identified>(
  worlds: ReadonlyArray<T>,
  currentId: string,
  limit: number,
  {
    random = Math.random,
    isDiscoverable = (world) => worldIsDiscoverable(world.id),
  }: SelectionOptions = {},
): Array<T> {
  if (!Number.isFinite(limit) || limit <= 0) return []
  const capacity = Math.floor(limit)
  if (capacity <= 0) return []

  const selected: Array<T> = []
  const eligibleIds = new Set<string>()
  let eligibleCount = 0

  for (const world of worlds) {
    if (world.id === currentId || eligibleIds.has(world.id) || !isDiscoverable(world)) continue
    eligibleIds.add(world.id)
    eligibleCount += 1

    if (selected.length < capacity) {
      selected.push(world)
      continue
    }

    const replacementIndex = safeRandomIndex(eligibleCount, random)
    if (replacementIndex < capacity) selected[replacementIndex] = world
  }

  // Reservoir order still reflects input order when the eligible count does
  // not exceed the limit, so shuffle the retained pool before returning it.
  for (let index = selected.length - 1; index > 0; index -= 1) {
    const swapIndex = safeRandomIndex(index + 1, random)
    ;[selected[index], selected[swapIndex]] = [selected[swapIndex], selected[index]]
  }

  return selected
}

/**
 * Pick a next world for an ordinary world page.
 * Discoverable, unvisited worlds are preferred; once those run out, any
 * discoverable world except the current one remains eligible.
 */
export function selectNextWorld<T extends Identified>(
  worlds: ReadonlyArray<T>,
  currentId: string,
  visited: VisitedIds,
  {
    random = Math.random,
    isDiscoverable = (world) => worldIsDiscoverable(world.id),
  }: SelectionOptions = {},
): T | undefined {
  const visitedSet = toVisitedSet(visited)
  const candidates = worlds.filter((world) => world.id !== currentId && isDiscoverable(world))
  const unvisited = candidates.filter((world) => !visitedSet.has(world.id))
  return randomItem(unvisited.length > 0 ? unvisited : candidates, random)
}

/**
 * Pick the homepage random destination: unvisited flagship first, then any
 * unvisited world; after the collection is exhausted, return to a random
 * flagship (or any world when no flagship exists).
 */
export function selectHomeWorld<T extends Identified>(
  worlds: ReadonlyArray<T>,
  visited: VisitedIds,
  flagshipIds: ReadonlySet<string>,
  {
    random = Math.random,
    isDiscoverable = (world) => worldIsDiscoverable(world.id),
  }: SelectionOptions = {},
): T | undefined {
  const visitedSet = toVisitedSet(visited)
  const discoverableWorlds = worlds.filter(isDiscoverable)
  const unvisited = discoverableWorlds.filter((world) => !visitedSet.has(world.id))
  const unvisitedFlagship = unvisited.filter((world) => flagshipIds.has(world.id))
  if (unvisitedFlagship.length > 0) return randomItem(unvisitedFlagship, random)
  if (unvisited.length > 0) return randomItem(unvisited, random)

  const flagship = discoverableWorlds.filter((world) => flagshipIds.has(world.id))
  return randomItem(flagship.length > 0 ? flagship : discoverableWorlds, random)
}
