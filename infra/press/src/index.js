// press.shapeof.world: the release kits for finished videos (upload file,
// candidate titles, descriptions and covers). Public, with no password, but
// kept out of search engines. Pages are built into dist/ by scripts/build.mjs;
// the author's picks live in KV, the upload-ready videos in R2.
import { SECURITY_HEADERS, handleMedia, handlePicks, json, withHeaders } from './handlers.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', ...SECURITY_HEADERS } })
    }

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname !== '/api/picks') return json({ error: 'not found' }, 404)
      // Anyone can save a pick, so writes are rate-limited per address.
      if (request.method === 'PUT') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
        const { success } = await env.WRITE_LIMITER.limit({ key: `picks:${ip}` })
        if (!success) return json({ error: 'too many requests' }, 429)
      }
      return handlePicks(request, env)
    }

    if (url.pathname.startsWith('/media/')) return handleMedia(request, env, url)
    return withHeaders(await env.ASSETS.fetch(request), { 'Cache-Control': 'no-cache' })
  },
}
