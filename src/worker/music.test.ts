// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { handleMusic } from './music'

const url = 'https://shapeof.world/media/music/hidden-shapes/v3/preview.mp3'
describe('same-origin music', () => {
  it('streams byte ranges without forwarding credentials, origin or query parameters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('part', {
      status: 206, headers: { 'content-type': 'audio/mpeg', 'content-range': 'bytes 0-3/100',
        'cache-control': 'public, max-age=3600', etag: '"track"', 'set-cookie': 'secret=1', 'access-control-allow-origin': '*' },
    }))
    const result = await handleMusic(new Request(`${url}?target=https://example.com`, {
      headers: { range: 'bytes=0-3', cookie: 'session=secret', authorization: 'secret', origin: 'http://localhost:3000' },
    }), fetcher)
    expect(fetcher.mock.calls[0][0]).toBe('https://music-cdn.shapeof.world/tracks/hidden-shapes/v3/preview.mp3')
    expect([...new Headers(fetcher.mock.calls[0][1]?.headers)]).toEqual([['range', 'bytes=0-3']])
    expect(result.status).toBe(206)
    expect(result.headers.get('content-range')).toBe('bytes 0-3/100')
    expect(result.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(result.headers.has('set-cookie')).toBe(false)
    expect(await result.text()).toBe('part')
  })
  it.each(['/unknown/v1/preview.mp3', '/hidden-shapes/v999/preview.mp3', '/hidden-shapes/v3/master.wav', '/%2fexample.com/v1/preview.mp3'])(
    'rejects unregistered paths: %s', async path => {
      const fetcher = vi.fn<typeof fetch>()
      expect((await handleMusic(new Request(`https://shapeof.world/media/music${path}`), fetcher)).status).toBe(404)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )
  it('keeps previous versions readable and preserves HEAD/conditional requests', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 304, headers: { etag: '"track"' } }))
    const result = await handleMusic(new Request(url.replace('/v3/', '/v1/'), { method: 'HEAD', headers: { 'if-none-match': '"track"' } }), fetcher)
    expect(result.status).toBe(304)
    expect(result.body).toBeNull()
    expect(fetcher.mock.calls[0][1]?.method).toBe('HEAD')
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('if-none-match')).toBe('"track"')
  })
  it.each([302, 500, 404])('does not redirect or cache upstream failure %s', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status, headers: { location: 'https://example.com' } }))
    const result = await handleMusic(new Request(url), fetcher)
    expect(result.status).toBe(status === 404 ? 404 : 502)
    expect(result.headers.get('cache-control')).toBe('no-store')
    expect(result.headers.has('location')).toBe(false)
    expect(fetcher.mock.calls[0][1]?.redirect).toBe('manual')
  })
  it('preserves unsatisfiable range totals', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 416, headers: { 'content-range': 'bytes */100' } }))
    const result = await handleMusic(new Request(url), fetcher)
    expect(result.status).toBe(416)
    expect(result.headers.get('content-range')).toBe('bytes */100')
  })
  it('rejects HTML masquerading as audio and network errors', async () => {
    for (const fetcher of [vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>', { headers: { 'content-type': 'text/html' } })), vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))]) {
      expect((await handleMusic(new Request(url), fetcher)).status).toBe(502)
    }
  })
  it('rejects writes before contacting the CDN', async () => {
    const fetcher = vi.fn<typeof fetch>()
    expect((await handleMusic(new Request(url, { method: 'POST' }), fetcher)).status).toBe(405)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
