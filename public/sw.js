const VERSION = 'v69'
const SHELL_CACHE = `oneworld-shell-${VERSION}`
const STATIC_CACHE = `oneworld-static-${VERSION}`
const WORLD_CACHE = `oneworld-worlds-${VERSION}`
const SHELL = [
  '/',
  '/offline',
  '/site.webmanifest',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
]
const WORLD_ASSET = /\.(?:glb|gltf|bin|dat|hdr|bcif|pdb|nii|nii\.gz|wasm)(?:$|\?)/i
const MAX_STATIC_ENTRIES = 80
const MAX_WORLD_ENTRIES = 18
const MAX_CACHEABLE_WORLD_BYTES = 10 * 1024 * 1024
const MUTABLE_STATIC_PREFIXES = ['/assets/posters/', '/vendor/']
// Explicit user-requested removals. Do not replay previously cached world pages offline.
function isRemovedWorldResource(pathname) {
  return /^\/(?:en\/)?(?:explore\/)?(?:collision-threshold|osmosis-membrane)\/?$/.test(pathname)
    || /^\/assets\/worlds\/(?:collision-threshold|osmosis-membrane)\//.test(pathname)
    || /^\/assets\/posters\/(?:desktop\/|mobile\/|orb\/|social\/|thumb\/)?(?:collision-threshold|osmosis-membrane)\.(?:webp|jpg)$/.test(pathname)
}

async function purgeRemovedWorldResources() {
  for (const name of await caches.keys()) {
    if (!name.startsWith('oneworld-')) continue
    const cache = await caches.open(name)
    for (const request of await cache.keys()) {
      if (isRemovedWorldResource(new URL(request.url).pathname)) await cache.delete(request)
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('activate', (event) => {
  const current = new Set([SHELL_CACHE, STATIC_CACHE, WORLD_CACHE])
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('oneworld-') && !current.has(key)).map((key) => caches.delete(key)))),
  )
  event.waitUntil(self.clients.claim())
  event.waitUntil(purgeRemovedWorldResources())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

async function trimCache(cacheName, maximumEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maximumEntries) return
  await Promise.all(keys.slice(0, keys.length - maximumEntries).map((key) => cache.delete(key)))
}

async function persistResponse(cacheName, request, response, maximumEntries) {
  if (/(?:private|no-store|no-cache)/i.test(response.headers.get('cache-control') || '')) return
  try {
    const cache = await caches.open(cacheName)
    await cache.put(request, response)
    await trimCache(cacheName, maximumEntries)
  } catch {
    // Storage is optional. A quota/permission failure must never discard HTTP 200.
  }
}

function cacheInBackground(cacheName, request, response, limit, waitUntil) {
  const work = persistResponse(cacheName, request, response.clone(), limit)
  if (waitUntil) waitUntil(work)
  return waitUntil ? Promise.resolve() : work
}

async function navigationResponse(request, waitUntil) {
  try {
    const response = await fetch(request)
    if (response.ok) await cacheInBackground(STATIC_CACHE, request, response, MAX_STATIC_ENTRIES, waitUntil)
    return response
  } catch {
    return (await caches.match(request))
      || (await caches.match('/offline'))
      || Response.error()
  }
}

async function staticResponse(request, waitUntil) {
  let cached
  try { cached = await caches.match(request) } catch { /* Network still works without storage. */ }
  const network = fetch(request).then(async response => {
    if (response.ok) await cacheInBackground(STATIC_CACHE, request, response, MAX_STATIC_ENTRIES, waitUntil)
    return response
  }).catch(() => undefined)
  if (waitUntil) waitUntil(network.then(() => undefined))
  return cached || (await network) || Response.error()
}

async function mutableStaticResponse(request, waitUntil) {
  try {
    const response = await fetch(request)
    if (response.ok) await cacheInBackground(STATIC_CACHE, request, response, MAX_STATIC_ENTRIES, waitUntil)
    return response
  } catch {
    try { return (await caches.match(request)) || Response.error() } catch { return Response.error() }
  }
}

async function worldAssetResponse(request, waitUntil) {
  try {
    const cached = await caches.match(request)
    if (cached) return cached
  } catch { /* Storage is optional. */ }
  try {
    const response = await fetch(request)
    const declaredBytes = Number(response.headers.get('content-length') || 0)
    const saveData = request.headers.get('save-data') === 'on'
    // Without a declared bound, serve the resource without caching it.
    if (response.ok && !saveData && declaredBytes > 0 && declaredBytes <= MAX_CACHEABLE_WORLD_BYTES) {
      await cacheInBackground(WORLD_CACHE, request, response, MAX_WORLD_ENTRIES, waitUntil)
    }
    return response
  } catch { return Response.error() }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  if (isRemovedWorldResource(url.pathname)) {
    event.respondWith(Promise.resolve(new Response('This theme is no longer available. / 此主题已下线。', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request, event.waitUntil.bind(event)))
    return
  }

  if (WORLD_ASSET.test(url.pathname)) {
    event.respondWith(worldAssetResponse(request, event.waitUntil.bind(event)))
    return
  }

  if (MUTABLE_STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(mutableStaticResponse(request, event.waitUntil.bind(event)))
    return
  }

  if (['style', 'script', 'image', 'font', 'manifest', 'worker'].includes(request.destination)) {
    event.respondWith(staticResponse(request, event.waitUntil.bind(event)))
  }
})
