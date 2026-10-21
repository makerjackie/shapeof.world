import configured from '../data/route-reservations.json' with { type: 'json' }
import discovered from '../data/generated/route-reservations.json' with { type: 'json' }

export const mountedWorks: readonly string[] = configured.mountedWorks
export const reservedRouteNames = new Set<string>([
  ...configured.commonReservedNames,
  ...discovered.topLevelRoutes,
  ...discovered.languagePrefixes,
  ...discovered.legacyEntryNames,
  ...discovered.staticNames,
])

export function isReservedWorldName(name: string, mounts: readonly string[] = mountedWorks): boolean {
  return reservedRouteNames.has(name) || mounts.some(mount => name.startsWith(mount))
}

/** Used by catalogue generation and the World compiler, as well as route tests. */
export function assertWorldRouteNames(ids: readonly string[], options: {
  reservedNames?: Iterable<string>; mountedNames?: readonly string[]
} = {}): void {
  const reserved = new Set(options.reservedNames ?? reservedRouteNames)
  const mounted = options.mountedNames ?? mountedWorks
  const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  const mounts = new Set<string>()
  for (const name of mounted) {
    if (typeof name !== 'string' || !valid.test(name) || [...reserved].some(route => route.startsWith(name)) || mounts.has(name)
      || mounted.some(other => other !== name && (name.startsWith(other) || other.startsWith(name)))) {
      throw new Error(`Conflicting mounted work name: ${name}`)
    }
    mounts.add(name)
  }
  const seen = new Set<string>()
  for (const id of ids) {
    if (typeof id !== 'string' || !valid.test(id)) throw new Error(`Invalid world id: ${id}`)
    if (seen.has(id)) throw new Error(`Duplicate world id: ${id}`)
    if (reserved.has(id) || mounted.some(name => id.startsWith(name))) throw new Error(`Reserved world id: ${id}`)
    seen.add(id)
  }
}
