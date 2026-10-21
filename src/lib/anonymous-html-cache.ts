const HTML_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=600'

export function shouldCacheAnonymousHtml(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (request.headers.get('cookie')) return false
  const { pathname } = new URL(request.url)
  if (pathname.startsWith('/api/')) return false
  if (/\.[a-z0-9]+$/iu.test(pathname) && !pathname.endsWith('.html')) return false
  return true
}

export function htmlCacheKey(request: Request, buildId?: string): Request {
  const url = new URL(request.url)
  if (buildId) url.searchParams.set('__sow_build', buildId)
  return new Request(url.toString(), { method: 'GET' })
}

export function canStoreAnonymousHtml(response: Response): boolean {
  if (response.status !== 200) return false
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) return false
  if (response.headers.get('set-cookie')) return false
  const cacheControl = response.headers.get('cache-control') ?? ''
  if (/(?:^|,)\s*(?:private|no-store|no-cache)\b/iu.test(cacheControl)) return false
  return true
}

export async function cachedAnonymousHtmlFetch(
  request: Request,
  fetchDocument: (request: Request) => Promise<Response>,
  cache?: Pick<Cache, 'match' | 'put'>,
  waitUntil?: (task: Promise<unknown>) => void,
  buildId?: string,
): Promise<Response> {
  if (!cache || !shouldCacheAnonymousHtml(request)) return fetchDocument(request)

  const cacheKey = htmlCacheKey(request, buildId)
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const response = await fetchDocument(request)
  if (!canStoreAnonymousHtml(response)) return response

  const headers = new Headers(response.headers)
  if (!headers.has('cache-control')) headers.set('cache-control', HTML_CACHE_CONTROL)
  const storeable = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
  const cachedCopy = storeable.clone()
  // A failed cache write must never affect the response, and it must not become
  // an unhandled rejection inside `waitUntil` (quota, race, consumed body).
  const put = cache.put(cacheKey, cachedCopy).catch(() => undefined)
  if (waitUntil) waitUntil(put)
  else await put
  return storeable
}
