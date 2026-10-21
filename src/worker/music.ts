import catalog from '../data/soundtrack.json'

const requestHeaders = ['range', 'if-range', 'if-none-match', 'if-modified-since']
const responseHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified', 'cache-control']

/** A fixed, read-only media endpoint; never forwards cookies or arbitrary URLs. */
export async function handleMusic(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const fail = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } })
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } })
  }
  const match = new URL(request.url).pathname.match(/^\/media\/music\/([a-z0-9-]+)\/v([1-9]\d*)\/preview\.mp3$/)
  const track = match && Object.hasOwn(catalog.tracks, match[1])
    ? catalog.tracks[match[1] as keyof typeof catalog.tracks] : undefined
  // Keep previous immutable versions readable for already-open pages.
  if (!match || !track || Number(match[2]) > Number(track.version.slice(1))) return fail(404)
  const headers = new Headers()
  for (const name of requestHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let upstream: Response
  try {
    upstream = await fetcher(`${catalog.cdnOrigin}/tracks/${match[1]}/v${match[2]}/preview.mp3`, {
      method: request.method, headers, redirect: 'manual', signal: controller.signal,
    })
  } catch {
    return fail(502)
  } finally {
    clearTimeout(timeout)
  }
  if (![200, 206, 304, 416].includes(upstream.status)) {
    await upstream.body?.cancel()
    return fail(upstream.status === 404 ? 404 : 502)
  }
  if ([200, 206].includes(upstream.status) && !/^audio\/mpeg(?:;|$)/i.test(upstream.headers.get('content-type') ?? '')) {
    await upstream.body?.cancel()
    return fail(502)
  }
  const outgoing = new Headers({ 'x-content-type-options': 'nosniff' })
  for (const name of responseHeaders) {
    const value = upstream.headers.get(name)
    if (value) outgoing.set(name, value)
  }
  if (upstream.status === 416) outgoing.set('cache-control', 'no-store')
  // Stream through the existing CDN cache; do not buffer MP3s or cache partial bodies ourselves.
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: outgoing })
}
