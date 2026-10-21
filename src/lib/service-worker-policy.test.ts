import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
const runtimeSource = readFileSync(join(process.cwd(), 'src/components/SilentSiteUpdate.tsx'), 'utf8')

function constant(name: string): string {
  const match = source.match(new RegExp(`const ${name} = '([^']+)'`))
  if (!match) throw new Error(`Missing ${name} in public/sw.js`)
  return match[1]
}

function stringArray(name: string): Array<string> {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`))
  if (!match) throw new Error(`Missing ${name} array in public/sw.js`)
  return Array.from(match[1].matchAll(/'([^']+)'/g), (entry) => entry[1])
}

describe('service worker release policy', () => {
  it('purges only retired resources in application caches, preserving other worlds and unrelated caches', async () => {
    const removed = new Request('https://shapeof.world/en/explore/osmosis-membrane')
    const retained = new Request('https://shapeof.world/explore/cell-city')
    const cache = { keys: vi.fn(async () => [removed, retained]), delete: vi.fn(async () => true) }
    const caches = { keys: vi.fn(async () => ['oneworld-shell-v66', 'unrelated-app']), open: vi.fn(async () => cache) }
    const runtime = runInNewContext(`${source}\n;({ purgeRemovedWorldResources })`, {
      self: { addEventListener: () => {} }, caches, URL,
    }) as { purgeRemovedWorldResources: () => Promise<void> }
    await runtime.purgeRemovedWorldResources()
    expect(caches.open.mock.calls).toEqual([['oneworld-shell-v66']])
    expect(cache.delete.mock.calls).toEqual([[removed]])
  })
  it('returns 410 for exactly the removed lessons and their own media without replaying offline cache', async () => {
    const handlers = new Map<string, (event: unknown) => void>()
    const caches = { match: vi.fn(), open: vi.fn() }, fetch = vi.fn()
    const runtime = runInNewContext(`${source}\n;({ isRemovedWorldResource })`, {
      self: { location: { origin: 'https://shapeof.world' }, addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler) },
      URL, caches, fetch, Response,
    }) as { isRemovedWorldResource: (path: string) => boolean }
    for (const path of ['/explore/collision-threshold', '/en/explore/osmosis-membrane/', '/assets/posters/mobile/osmosis-membrane.webp', '/assets/worlds/collision-threshold/review-2026-10-02/desktop.webp']) {
      const respondWith = vi.fn()
      handlers.get('fetch')!({ request: { method: 'GET', url: `https://shapeof.world${path}?lang=en`, mode: 'navigate' }, respondWith })
      expect((await respondWith.mock.calls[0][0]).status).toBe(410)
    }
    for (const path of ['/explore/sea-breeze-lab', '/explore/cell-city', '/assets/posters/osmosis-membrane-other.webp', '/assets/music/pulse-chamber.mp3']) {
      expect(runtime.isRemovedWorldResource(path)).toBe(false)
    }
    expect(fetch).not.toHaveBeenCalled()
    expect(caches.match).not.toHaveBeenCalled()
  })
  it('versions every cache together and deletes obsolete versions on activate', () => {
    expect(constant('VERSION')).toMatch(/^v\d+$/)
    expect(source).toContain('const SHELL_CACHE = `oneworld-shell-${VERSION}`')
    expect(source).toContain('const STATIC_CACHE = `oneworld-static-${VERSION}`')
    expect(source).toContain('const WORLD_CACHE = `oneworld-worlds-${VERSION}`')
    expect(source).toContain('new Set([SHELL_CACHE, STATIC_CACHE, WORLD_CACHE])')
    expect(source).toMatch(/keys\.filter\(\(key\) => key\.startsWith\('oneworld-'\) && !current\.has\(key\)\)\.map\(\(key\) => caches\.delete\(key\)\)/)
    expect(source).toContain("event.data?.type === 'SKIP_WAITING'")
  })

  it('precaches only the lightweight application shell', () => {
    const shell = stringArray('SHELL')
    const heavyweight = /\.(?:glb|gltf|bin|hdr|bcif|pdb|nii(?:\.gz)?|wasm)(?:$|\?)/i

    expect(shell).toEqual([
      '/',
      '/offline',
      '/site.webmanifest',
      '/favicon-32x32.png',
      '/android-chrome-192x192.png',
    ])
    expect(shell.some((entry) => heavyweight.test(entry))).toBe(false)
    expect(source.match(/addAll\(/g)).toHaveLength(1)
    expect(source).toContain('cache.addAll(SHELL)')
  })

  it('keeps world assets on demand, bounded, and disabled under data saver', () => {
    expect(source).toMatch(/const WORLD_ASSET = \/.*glb.*gltf.*bin.*dat.*bcif.*nii.*wasm.*\/i/)
    expect(source).toContain('const MAX_WORLD_ENTRIES = 18')
    expect(source).toContain('const MAX_CACHEABLE_WORLD_BYTES = 10 * 1024 * 1024')
    expect(source).toContain("request.headers.get('save-data') === 'on'")
    expect(source).toContain('declaredBytes <= MAX_CACHEABLE_WORLD_BYTES')
    expect(source).toContain('cacheInBackground(WORLD_CACHE, request, response, MAX_WORLD_ENTRIES, waitUntil)')
    expect(source).toContain('await trimCache(cacheName, maximumEntries)')

    const apiGuard = source.indexOf("url.pathname.startsWith('/api/')")
    const worldBranch = source.indexOf('WORLD_ASSET.test(url.pathname)')
    expect(apiGuard).toBeGreaterThan(0)
    expect(apiGuard).toBeLessThan(worldBranch)
  })

  it('does not persist responses marked private or no-store, even outside excluded routes', async () => {
    const caches = { open: vi.fn() }
    const runtime = runInNewContext(`${source}\n;({ persistResponse })`, {
      self: { addEventListener: () => {} }, caches,
    }) as { persistResponse: (name: string, request: Request, response: Response, limit: number) => Promise<void> }
    for (const policy of ['private', 'no-store', 'private, no-store', 'no-cache']) {
      await runtime.persistResponse('test-cache', new Request('https://shapeof.world/'), new Response('private data', { headers: { 'cache-control': policy } }), 80)
    }
    expect(caches.open).not.toHaveBeenCalled()
  })

  it('checks for a fresh worker without relying on the browser HTTP cache', () => {
    expect(runtimeSource).toContain("{ updateViaCache: 'none' }")
    expect(runtimeSource).toContain("registration.update()")
    expect(runtimeSource).toContain("'controllerchange'")
    expect(runtimeSource).toContain("window.location.reload()")
    expect(runtimeSource).toContain("waiting.postMessage({ type: 'SKIP_WAITING' })")
    expect(runtimeSource).not.toContain('<aside')
  })
})
