/**
 * Old-site and locale-prefixed URLs that still arrive on shapeof.world.
 * Send them into the current site. Never send them to v1.
 */

const currentExactPaths = new Set([
  '/',
  '/about',
  '/atlas',
  '/changelog',
  '/failures',
  '/making',
  '/made-with',
  '/sources',
  '/story',
  '/worlds',
])

const worldIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/')
  if (collapsed.length > 1 && collapsed.endsWith('/')) return collapsed.slice(0, -1)
  return collapsed || '/'
}

function isCurrentPath(path: string): boolean {
  if (currentExactPaths.has(path)) return true
  const explore = path.match(/^\/explore\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)
  if (explore) return worldIdPattern.test(explore[1])
  const madeWith = path.match(/^\/made-with\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)
  return Boolean(madeWith)
}

/**
 * Returns a same-origin href when the incoming path is a known leftover from
 * the previous site or a `/zh` `/en` prefix. Query strings, including UTM,
 * are preserved. Returns null when the router should 404 as usual.
 */
export function resolveLegacyEntryHref(pathname: string, search = ''): string | null {
  const query = !search || search.startsWith('?') ? search : `?${search}`
  const incoming = new URL(`https://shapeof.world${pathname}${query}`)
  const original = normalizePathname(incoming.pathname)
  let path = original
  let locale: 'zh' | 'en' | undefined

  const localeMatch = path.match(/^\/(zh|en)(\/.*)?$/i)
  if (localeMatch) {
    locale = localeMatch[1].toLowerCase() as 'zh' | 'en'
    path = normalizePathname(localeMatch[2] || '/')
  }

  if (path === '/index.html' || path === '/index.htm') path = '/'
  if (path === '/t' || path === '/lab' || path === '/history') path = '/'

  const shortWorld = path.match(/^\/w\/([a-z0-9]+(?:-[a-z0-9]+)*)$/i)
  if (shortWorld) path = `/explore/${shortWorld[1].toLowerCase()}`

  if (!isCurrentPath(path)) {
    if (!locale) return null
    path = '/'
  }

  const unchanged = path === original && !locale
  if (unchanged) return null

  incoming.pathname = path
  if (locale && !incoming.searchParams.has('lang')) {
    incoming.searchParams.set('lang', locale)
  }
  return `${incoming.pathname}${incoming.search}${incoming.hash}`
}
