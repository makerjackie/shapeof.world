import { webBuild } from './lib/web-build'
import { handleMusic } from './worker/music'
import { paraglideMiddleware } from './paraglide/server.js'
import handler from '@tanstack/react-start/server-entry'

import { cachedAnonymousHtmlFetch } from '~/lib/anonymous-html-cache'
import { LEGACY_SITE_HOST } from '~/lib/legacy-site'
export { FeedbackDelivery } from './worker/FeedbackDelivery'

type WorkerCaches = { readonly default: Pick<Cache, 'match' | 'put'> }

function workerCache(): Pick<Cache, 'match' | 'put'> | undefined {
  try {
    if (typeof caches === 'undefined') return undefined
    return (caches as unknown as WorkerCaches).default
  } catch {
    return undefined
  }
}

const CANONICAL_ORIGIN = 'https://shapeof.world'
/** Former and temporary hosts that now forward to the canonical site. */
const FORWARDED_HOSTS = new Set(['new.shapeof.world', 'open.shapeof.world'])

type LegacyEnv = { LEGACY?: { fetch(request: Request): Promise<Response> } }

/**
 * The archived earlier site (Worker `oneworld`) is served through a service
 * binding, unchanged, but kept out of search engines.
 */
async function legacySite(req: Request, env: LegacyEnv): Promise<Response> {
  if (new URL(req.url).pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  if (!env.LEGACY) return new Response('Archive unavailable', { status: 503 })
  const upstream = await env.LEGACY.fetch(req)
  const response = new Response(upstream.body, upstream)
  response.headers.set('x-robots-tag', 'noindex, nofollow')
  return response
}

async function routeRequest(req: Request, env: LegacyEnv, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(req.url)
  if (FORWARDED_HOSTS.has(url.hostname)) {
    return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301)
  }
  if (url.hostname === LEGACY_SITE_HOST) return legacySite(req, env)
  const pathname = url.pathname
  if (pathname.startsWith('/media/music/')) return handleMusic(req)
  return paraglideMiddleware(req, () => cachedAnonymousHtmlFetch(
    req,
    (request) => Promise.resolve(handler.fetch(request)),
    webBuild.channel === 'local' ? undefined : workerCache(),
    ctx?.waitUntil.bind(ctx),
    webBuild.commit,
  ))
}

export default { fetch: routeRequest }
