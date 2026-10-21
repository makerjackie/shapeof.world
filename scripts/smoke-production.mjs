import { parseWorldPath, worldPath } from '../src/lib/world-urls.ts'
import { checkMusicDelivery } from './lib/check-music-delivery.mjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(import.meta.dirname, '..')
const worldSummaries = JSON.parse(
  readFileSync(resolve(root, 'src/data/generated/world-summaries.json'), 'utf8'),
)

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const base = new URL(option('--base', 'https://shapeof.world'))
const expectedTag = option('--expected-tag')
const expectedCommit = option('--expected-commit')
const expectedChannel = option('--expected-channel')

async function fetchWithRetry(input, init = {}, accept = (response) => response.status < 500) {
  let lastError
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(input, init)
      if (accept(response)) return response
      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }
    await delay(attempt * 750)
  }
  throw lastError
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function expectStatus(pathname, expected = 200) {
  const url = new URL(pathname, base)
  return fetchWithRetry(url, {}, (response) => response.status === expected)
}

async function expectHead(pathname, expected = 200) {
  const url = new URL(pathname, base)
  return fetchWithRetry(url, { method: 'HEAD' }, (response) => response.status === expected)
}

async function fetchExpectedHealth() {
  const url = new URL('/api/health', base)
  let lastHealth
  let lastError

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } })
      if (response.status === 200) {
        lastHealth = await response.json()
        if (!expectedTag || lastHealth.version?.tag === expectedTag) return lastHealth
        lastError = new Error(`Expected ${expectedTag}, received ${lastHealth.version?.tag ?? 'no tag'}`)
      } else {
        lastError = new Error(`${response.status} ${response.statusText}`)
      }
    } catch (error) {
      lastError = error
    }
    if (attempt < 8) await delay(attempt * 500)
  }

  throw lastError ?? new Error(`Health check failed: ${JSON.stringify(lastHealth)}`)
}

const musicCatalog = JSON.parse(readFileSync(resolve(root, 'src/data/soundtrack.json'), 'utf8'))
const health = await fetchExpectedHealth()
const musicTrackCount = await checkMusicDelivery(base, musicCatalog)
assert(health.status === 'ok', 'Health status is not ok')
if (expectedCommit) assert(health.release?.commit === expectedCommit, 'Build commit does not match release')
if (expectedChannel) assert(health.release?.channel === expectedChannel, 'Build channel does not match release')
assert(Number.isInteger(health.worldCount) && health.worldCount > 0, 'Health worldCount is invalid')

await Promise.all([
  expectStatus('/'),
  expectStatus('/atlas', 404),
  expectStatus('/made-with/kimi-k3', 404),
  expectStatus(worldPath('black-hole-flyby')),
  expectStatus('/robots.txt'),
])

// The knowledge globe uses every world's 384x256 thumbnail. Verify the full
// catalog in small batches so a missing generated asset cannot ship as a
// silent fallback card. HEAD avoids downloading the images during deployment.
const thumbnailPaths = worldSummaries.map(({ id }) => `/assets/posters/thumb/${id}.webp`)
for (let offset = 0; offset < thumbnailPaths.length; offset += 12) {
  await Promise.all(thumbnailPaths.slice(offset, offset + 12).map((pathname) => expectHead(pathname)))
}

const sitemap = await (await expectStatus('/sitemap.xml')).text()
// Each world appears multiple times (hreflang alternates: zh / en / x-default …).
// Count canonical world paths, excluding static pages and hreflang duplicates.
const worldUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(match => parseWorldPath(new URL(match[1]).pathname))
  .filter(world => world && !world.legacy).map(world => world.worldId)).size
assert(!/\/explore\//.test(sitemap), 'Sitemap must not contain legacy world URLs')
assert(worldUrls === health.worldCount, `Sitemap has ${worldUrls} worlds; health reports ${health.worldCount}`)
await expectStatus('/__smoke/not-found', 404)

console.log(JSON.stringify({ status: 'ok', base: base.origin, version: health.version, release: health.release, worldCount: health.worldCount, musicTrackCount }))
