import { describe, expect, it, vi } from 'vitest'

import {
  cachedAnonymousHtmlFetch,
  canStoreAnonymousHtml,
  htmlCacheKey,
  shouldCacheAnonymousHtml,
} from './anonymous-html-cache'

function request(url: string, init?: RequestInit) {
  return new Request(url, init)
}

describe('anonymous HTML cache', () => {
  it('does not reuse HTML or old chunk references across releases', async () => {
    const req = request('https://shapeof.world/en?query=retained')
    const oldKey = htmlCacheKey(req, 'old-commit').url
    const newKey = htmlCacheKey(req, 'new-commit').url
    expect(newKey).not.toBe(oldKey)
    expect(new URL(newKey).searchParams.get('query')).toBe('retained')
    const cache = {
      match: vi.fn(async (key: Request) => key.url === oldKey ? new Response('old HTML') : undefined),
      put: vi.fn(async () => {}),
    }
    const response = await cachedAnonymousHtmlFetch(req, async () => new Response('new HTML', { headers: { 'content-type': 'text/html' } }), cache, undefined, 'new-commit')
    expect(await response.text()).toBe('new HTML')
    expect(cache.put).toHaveBeenCalledOnce()
  })
  it('only caches anonymous document GET requests', () => {
    expect(shouldCacheAnonymousHtml(request('https://shapeof.world/'))).toBe(true)
    expect(shouldCacheAnonymousHtml(request('https://shapeof.world/en/explore/seasons'))).toBe(true)
    expect(shouldCacheAnonymousHtml(request('https://shapeof.world/api/event', { method: 'POST' }))).toBe(false)
    expect(shouldCacheAnonymousHtml(request('https://shapeof.world/api/health'))).toBe(false)
    expect(shouldCacheAnonymousHtml(request('https://shapeof.world/', {
      headers: { cookie: 'oneworld.locale.v1=en' },
    }))).toBe(false)
    expect(shouldCacheAnonymousHtml(request('https://shapeof.world/assets/brand/app-icon-56.webp'))).toBe(false)
  })

  it('shares cache entries across browser languages while keeping localized URLs separate', () => {
    const chinese = htmlCacheKey(request('https://shapeof.world/', {
      headers: { 'accept-language': 'zh-CN,zh;q=0.9' },
    }))
    const english = htmlCacheKey(request('https://shapeof.world/', {
      headers: { 'accept-language': 'en-US,en;q=0.8' },
    }))
    expect(chinese.url).toBe(english.url)
    expect(htmlCacheKey(request('https://shapeof.world/en')).url).not.toBe(chinese.url)
  })

  it('refuses to store redirects, cookies, or non-HTML', () => {
    expect(canStoreAnonymousHtml(new Response('ok', { status: 302 }))).toBe(false)
    expect(canStoreAnonymousHtml(new Response('{}', {
      headers: { 'content-type': 'application/json' },
    }))).toBe(false)
    expect(canStoreAnonymousHtml(new Response('<html></html>', {
      headers: { 'content-type': 'text/html', 'set-cookie': 'oneworld.locale.v1=en' },
    }))).toBe(false)
    expect(canStoreAnonymousHtml(new Response('<html></html>', {
      headers: { 'content-type': 'text/html', 'cache-control': 'private, no-store' },
    }))).toBe(false)
    expect(canStoreAnonymousHtml(new Response('<html></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=120' },
    }))).toBe(true)
  })

  it('returns a cached document and writes misses into Cache API', async () => {
    const store = new Map<string, Response>()
    const cache = {
      match: vi.fn(async (key: Request) => store.get(key.url)?.clone()),
      put: vi.fn(async (key: Request, response: Response) => {
        store.set(key.url, response)
      }),
    }

    const first = await cachedAnonymousHtmlFetch(
      request('https://shapeof.world/explore/seasons'),
      async () => new Response('<html>seasons</html>', {
        headers: { 'content-type': 'text/html', 'cache-control': 'public, s-maxage=120' },
      }),
      cache,
    )
    expect(await first.text()).toBe('<html>seasons</html>')
    expect(cache.put).toHaveBeenCalledOnce()

    const second = await cachedAnonymousHtmlFetch(
      request('https://shapeof.world/explore/seasons'),
      async () => new Response('<html>fresh</html>', {
        headers: { 'content-type': 'text/html' },
      }),
      cache,
    )
    expect(await second.text()).toBe('<html>seasons</html>')
  })
})
