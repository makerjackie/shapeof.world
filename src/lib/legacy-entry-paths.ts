import { parseWorldPath, worldPath } from './world-urls'
import { legacyWorldRedirects, legacyWorldSceneRedirects } from '../data/legacy-redirects'
import firstSeen from '../data/generated/world-first-seen.json'
import routeReservations from '../data/generated/route-reservations.json'

export const legacyHomeEntryNames = ['index.html', 'index.htm', 't', 'lab', 'history'] as const
export const legacyWorldEntryPrefix = 'w'
export const legacyChineseEntryPrefix = 'zh'

/**
 * Old-site and locale-prefixed URLs that still arrive on shapeof.world.
 * Send them into the current site. Never send them to v1.
 */

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/')
  if (collapsed.length > 1 && collapsed.endsWith('/')) return collapsed.slice(0, -1)
  return collapsed || '/'
}

/**
 * Returns a same-origin href when the incoming path is a known leftover from
 * the previous site or a `/zh` prefix. English `/en` is the live English site
 * and is left alone. Query strings, including UTM, are preserved. Returns
 * null when the router should 404 as usual.
 */
export function resolveLegacyEntryHref(pathname: string, search = ''): string | null {
  const query = !search || search.startsWith('?') ? search : `?${search}`
  const incoming = new URL(`https://shapeof.world${pathname}${query}`)
  const original = normalizePathname(incoming.pathname)
  const mergedWorld = parseWorldPath(original.replace(/^\/(?:zh|w)\//, '/'))
  const mergedScene = mergedWorld && Object.hasOwn(legacyWorldSceneRedirects, mergedWorld.worldId)
    ? legacyWorldSceneRedirects[mergedWorld.worldId] : undefined
  if (mergedScene && mergedWorld) {
    incoming.pathname = worldPath(mergedScene.worldId, mergedWorld.locale)
    incoming.searchParams.set('scene', mergedScene.scene)
    return `${incoming.pathname}${incoming.search}${incoming.hash}`
  }
  let path = original
  let locale: 'zh' | 'en' | undefined

  const localeMatch = path.match(new RegExp(`^/${legacyChineseEntryPrefix}(/.*)?$`, 'i'))
  if (localeMatch) {
    locale = 'zh'
    path = normalizePathname(localeMatch[1] || '/')
  }

  if ((legacyHomeEntryNames as readonly string[]).includes(path.slice(1))) path = '/'

  const shortWorld = path.match(new RegExp(`^/${legacyWorldEntryPrefix}/([a-z0-9]+(?:-[a-z0-9]+)*)$`, 'i'))
  if (shortWorld) {
    const id = shortWorld[1].toLowerCase()
    const target = Object.hasOwn(legacyWorldRedirects, id) ? legacyWorldRedirects[id] : id
    if (!Object.hasOwn(firstSeen, target)) return null
    path = worldPath(target)
  }

  const unchanged = path === original && !locale
  if (unchanged) return null

  const world = parseWorldPath(path)
  if (world && (world.legacy || Object.hasOwn(legacyWorldRedirects, world.worldId))) {
    const target = Object.hasOwn(legacyWorldRedirects, world.worldId) ? legacyWorldRedirects[world.worldId] : world.worldId
    if (!Object.hasOwn(firstSeen, target)) return null
    path = worldPath(target, world.locale)
  }

  if (locale && path.split('/').filter(Boolean).length <= 1
    && !routeReservations.exactPagePaths.includes(path)
    && !Object.hasOwn(firstSeen, path.slice(1))) return null

  incoming.pathname = path
  incoming.searchParams.delete('lang')
  return `${incoming.pathname}${incoming.search}${incoming.hash}`
}
