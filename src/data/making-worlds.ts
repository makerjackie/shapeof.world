import { resolveWorldState } from './world-state'
import { worldCatalog } from './worlds/catalog'

/**
 * Worlds parked in the public “in the making” gallery.
 * They stay playable at `/<id>` but leave homepage, search, Paths,
 * sitemap, and other discovery surfaces. This is not the Failure Museum.
 */
export const makingWorldIds = worldCatalog
  .filter((world) => resolveWorldState(world) === 'making')
  .map((world) => world.id)

export type MakingWorldId = (typeof makingWorldIds)[number]

export const makingWorldIdSet: ReadonlySet<string> = new Set(makingWorldIds)

export function isMakingWorldId(worldId: string) {
  return makingWorldIdSet.has(worldId)
}
