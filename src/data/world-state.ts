import { failedWorlds } from './failed-worlds'
import ledger from './world-lifecycle-ledger.json'
import { getWorldPublication, type WorldExperience } from './worlds/types'

export type WorldState = 'public' | 'making' | 'archived' | 'failed' | 'rights-blocked'

export const rightsBlockedWorldIds: ReadonlySet<string> = new Set(ledger.rightsBlockedWorldIds)

export const archivedWorldIds: ReadonlySet<string> = new Set(ledger.archivedWorldIds)

const failedWorldIds: ReadonlySet<string> = new Set(failedWorlds.map((world) => world.worldId))

export function resolveWorldState(
  world: Pick<WorldExperience, 'id' | 'publication'>,
): WorldState {
  if (rightsBlockedWorldIds.has(world.id)) return 'rights-blocked'
  if (failedWorldIds.has(world.id)) return 'failed'
  if (archivedWorldIds.has(world.id)) return 'archived'
  return getWorldPublication(world)
}

export function isWorldDiscoverable(
  world: Pick<WorldExperience, 'id' | 'publication'>,
): boolean {
  return resolveWorldState(world) === 'public'
}

export function isWorldDirectlyAccessible(
  world: Pick<WorldExperience, 'id' | 'publication'>,
): boolean {
  return resolveWorldState(world) !== 'rights-blocked'
}
