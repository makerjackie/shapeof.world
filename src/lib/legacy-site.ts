import legacyWorldIds from '~/data/legacy-world-ids.json'

/**
 * The site as it stood before 2026-10-21 (Worker `oneworld`), kept as an
 * unindexed archive. Its worlds lived at /explore/<id> and /en/explore/<id>.
 */
export const LEGACY_SITE_HOST = 'v2.shapeof.world'
export const LEGACY_SITE_ORIGIN = `https://${LEGACY_SITE_HOST}`

const legacyIds = new Set<string>(legacyWorldIds)

/**
 * For a path that no longer exists here but named a world on the old site,
 * the same world in the archive; otherwise null.
 */
export function legacyArchiveUrl(pathname: string): string | null {
  const match = /^\/(en\/)?(?:explore\/)?([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)
  if (!match || !legacyIds.has(match[2])) return null
  return `${LEGACY_SITE_ORIGIN}/${match[1] ?? ''}explore/${match[2]}`
}
