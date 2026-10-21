import { failedWorlds } from '../../src/data/failed-worlds.ts'
import ledger from '../../src/data/world-lifecycle-ledger.json' with { type: 'json' }
import { getWorldPublication } from '../../src/data/worlds/types.ts'

export const rightsBlockedWorldIds = new Set(ledger.rightsBlockedWorldIds)
export const archivedWorldIds = new Set(ledger.archivedWorldIds)
const failedWorldIds = new Set(failedWorlds.map((world) => world.worldId))

export function resolveWorldState(world) {
	if (rightsBlockedWorldIds.has(world.id)) return 'rights-blocked'
	if (failedWorldIds.has(world.id)) return 'failed'
	if (archivedWorldIds.has(world.id)) return 'archived'
	return getWorldPublication(world)
}

export function isWorldDiscoverable(world) {
	return resolveWorldState(world) === 'public'
}

export function isWorldDirectlyAccessible(world) {
	return resolveWorldState(world) !== 'rights-blocked'
}

export function lifecycleMatrix(state) {
	return {
		state,
		webDiscovery: state === 'public',
		directAccess: state !== 'rights-blocked',
		seoIndex: state === 'public',
		officialPack: state === 'public',
		appDiscovery: state === 'public',
	}
}
