import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type WorkerConfig = {
  compatibility_date?: string
  routes?: Array<{ pattern: string; custom_domain?: boolean }>
  observability?: { enabled?: boolean; head_sampling_rate?: number }
  ratelimits?: Array<{ name: string; namespace_id: string }>
  workers_dev?: boolean
  preview_urls?: boolean
  version_metadata?: { binding?: string }
  secrets?: { required?: Array<string> }
}

const root = resolve(import.meta.dirname, '../..')

function readConfig(relativePath: string): WorkerConfig {
  const source = readFileSync(resolve(root, relativePath), 'utf8')
  return JSON.parse(source.replace(/^\s*\/\/.*$/gm, '')) as WorkerConfig
}

function hostname(pattern: string): string {
  return pattern.replace(/^https?:\/\//, '').replace(/\/\*$/, '')
}

describe('Cloudflare deployment configuration', () => {
  it('caches fingerprinted client assets without freezing mutable posters', () => {
    const headers = readFileSync(resolve(root, 'public/_headers'), 'utf8')

    expect(headers).toContain('/assets/*.js')
    expect(headers).toContain('/assets/*.css')
    expect(headers).toContain('max-age=31556952, immutable')
    expect(headers).not.toContain('/assets/posters/*')
  })

  it('hardens static assets that never pass through the Worker header pipeline', () => {
    const headers = readFileSync(resolve(root, 'public/_headers'), 'utf8')

    // Cloudflare serves `public/**` directly, so the headers set in
    // `src/routes/__root.tsx` cannot reach it. The offline document is the one
    // static asset browsers render as a top-level document.
    expect(headers).toMatch(/^\/\*\n(?:\s+.*\n)*?\s+X-Content-Type-Options: nosniff$/mu)
    expect(headers).toMatch(/^\/\*\n(?:\s+.*\n)*?\s+Referrer-Policy: strict-origin-when-cross-origin$/mu)
    expect(headers).toMatch(/^\/offline\n(?:\s+.*\n)*?\s+Content-Security-Policy: .*default-src 'none'/mu)
    expect(headers).toMatch(/^\/offline\n(?:\s+.*\n)*?\s+X-Frame-Options: DENY$/mu)
    expect(headers).toMatch(/^\/offline\n(?:\s+.*\n)*?\s+Permissions-Policy: /mu)
  })

  it('keeps same-origin vendor documents frameable for world iframes', () => {
    const headers = readFileSync(resolve(root, 'public/_headers'), 'utf8')
    const wildcardBlock = headers.match(/^\/\*\n((?:\s+.*\n)*)/mu)?.[1] ?? ''

    // Same-origin `/vendor/**` documents are embedded by worlds such as
    // `periodic-table` embed same-origin `/vendor/**` HTML in an iframe, so a
    // blanket framing denial on `/*` would break those worlds.
    expect(wildcardBlock).not.toMatch(/X-Frame-Options/iu)
    expect(wildcardBlock).not.toMatch(/frame-ancestors/iu)
  })

  it('gives every Worker its own rate-limit counter namespace', () => {
    // `namespace_id` addresses an account-level counter namespace, so two
    // independently deployed Workers sharing one would let traffic on either
    // change the other's effective limit. Only top-level `ratelimits` are
    // compared: the `env.dev` block deliberately mirrors its parent Worker.
    const configPaths = [
      'wrangler.jsonc',
      'infra/insights/wrangler.jsonc',
      'infra/oneworld-redirector/wrangler.jsonc',
      'infra/shapeofworld-v1/wrangler.jsonc',
      'apps/music/wrangler.jsonc',
    ]
    const ownerByNamespace = new Map<string, string>()

    for (const path of configPaths) {
      for (const limiter of readConfig(path).ratelimits ?? []) {
        const owner = `${path}:${limiter.name}`
        const previous = ownerByNamespace.get(limiter.namespace_id)
        expect(previous, `namespace_id ${limiter.namespace_id} is shared by ${previous} and ${owner}`).toBeUndefined()
        ownerByNamespace.set(limiter.namespace_id, owner)
      }
    }

    expect(ownerByNamespace.size).toBeGreaterThan(0)
  })

  it('assigns every hostname to exactly one Worker', () => {
    const configs = [
      readConfig('wrangler.jsonc'),
      readConfig('infra/oneworld-redirector/wrangler.jsonc'),
      readConfig('infra/shapeofworld-v1/wrangler.jsonc'),
    ]
    const hosts = configs.flatMap((config) => config.routes?.map((route) => hostname(route.pattern)) ?? [])

    expect(new Set(hosts).size).toBe(hosts.length)
    expect(readConfig('wrangler.jsonc').routes?.map((route) => route.pattern)).toEqual(['shapeof.world', 'new.shapeof.world', 'open.shapeof.world', 'v2.shapeof.world'])
  })

  it('keeps production observability and analytics abuse protection affordable', () => {
    const config = readConfig('wrangler.jsonc')

    expect(config.compatibility_date).toBe('2026-07-15')
    expect(config.observability?.enabled).toBe(true)
    expect(config.observability?.head_sampling_rate).toBeLessThanOrEqual(0.05)
    expect(config.ratelimits).toContainEqual(expect.objectContaining({ name: 'EVENT_RATE_LIMITER' }))
    expect(config.ratelimits).toContainEqual(expect.objectContaining({ name: 'FEEDBACK_RATE_LIMITER' }))
    expect(config.secrets).toBeUndefined()
  })

  it('publishes only through the production domain with traceable versions', () => {
    const config = readConfig('wrangler.jsonc')

    expect(config.workers_dev).toBe(false)
    expect(config.preview_urls).toBe(false)
    expect(config.version_metadata?.binding).toBe('CF_VERSION_METADATA')
  })
})
