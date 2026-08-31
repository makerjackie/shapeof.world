import { compareCatalogWorlds } from './world-order'
import {
  archivedWorldIds,
  isWorldDirectlyAccessible,
  isWorldDiscoverable,
  rightsBlockedWorldIds,
} from './world-state'
import { worldCatalog } from './worlds/catalog'
import type { WorldExperience } from './worlds/types'
import { nextDiscoverable, pickDailyTrio, selectDiscoverable, selectFlagship } from './world-tiers'

export * from './worlds/types'
export { archivedWorldIds, rightsBlockedWorldIds } from './world-state'

const catalogWorldById = new Map(worldCatalog.map((world) => [world.id, world]))

function isPublicCatalogWorld(world: WorldExperience | undefined): world is WorldExperience {
  return Boolean(world && isWorldDiscoverable(world))
}

export const worlds: Array<WorldExperience> = worldCatalog
  .filter(isPublicCatalogWorld)
  .sort(compareCatalogWorlds)
  .map((world, index) => ({
    ...world,
    index: String(index + 1).padStart(2, '0'),
    related: world.related.filter((id) => isPublicCatalogWorld(catalogWorldById.get(id))),
  }))

const publicWorldById = new Map(worlds.map((world) => [world.id, world]))

export function getPublicWorld(id: string): WorldExperience | undefined {
  return publicWorldById.get(id)
}

export function getWorld(id: string): WorldExperience | undefined {
  const world = publicWorldById.get(id) ?? catalogWorldById.get(id)
  return world && isWorldDirectlyAccessible(world) ? world : undefined
}

export const indexedWorlds = [...worlds]
  .sort((left, right) => Number(left.index) - Number(right.index))

/** 门面世界。「随机来一个」和每日轮换只从这里取。见 `world-tiers.ts`。 */
export const flagshipWorlds: Array<WorldExperience> = selectFlagship(indexedWorlds)

/** 进入发现流的世界（排除 `archiveVisible`）。 */
export const discoverableWorlds: Array<WorldExperience> = selectDiscoverable(indexedWorlds)

export function getTodayWorlds(date = new Date()): Array<WorldExperience> {
  return pickDailyTrio(flagshipWorlds.length >= 3 ? flagshipWorlds : discoverableWorlds, date)
}

export function getRelatedWorlds(world: WorldExperience): Array<WorldExperience> {
  return world.related.map((id) => publicWorldById.get(id)).filter((item): item is WorldExperience => Boolean(item))
}

export function getAdjacentWorld(world: WorldExperience, direction: -1 | 1 = 1): WorldExperience {
  return nextDiscoverable(indexedWorlds, world.id, direction)
}
