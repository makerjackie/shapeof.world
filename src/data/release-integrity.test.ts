import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { legacyWorldRedirects } from './legacy-redirects'
import { archivedWorldIds, getWorld, worlds } from './worlds'

const root = resolve(import.meta.dirname, '../..')
const flagshipAssets = [
  'public/assets/flow/global-routes.json',
  'public/assets/flow/countries.geojson',
  'public/assets/oss-source/LICENSE-openseadragon.txt',
  'public/assets/oss-source/LICENSE-flowmap.txt',
  'public/assets/oss-source/LICENSE-model-viewer.txt',
  'public/assets/oss-source/LICENSE-worldwide-telescope.txt',
  'public/assets/oss-source/LICENSE-deck-gl.txt',
  'public/assets/oss-source/LICENSE-earth-nullschool.md',
  'public/assets/oss-source/LICENSE-maplibre.txt',
  'public/assets/oss-source/LICENSE-fonts-ofl.txt',
  'public/assets/oss-source/LICENSE-three-periodic-table.txt',
  'public/assets/oss-source/LICENSE-google-cow.txt',
  'public/assets/cow/bessie-anatomy.glb',
  'public/draco/draco_decoder.js',
  'public/third-party-notices.txt',
  'public/offline.html',
] as const

const rightsBlockedReleasePaths = [
  'public/vendor/smithsonian-voyager',
  'public/vendor/smithsonian-voyager-armstrong',
  'public/assets/organ-atlas',
  'public/assets/flagships/apollo',
  'public/vendor/cell-architecture-studio',
  'public/assets/posters/organ-atlas.webp',
  'public/assets/posters/cell-architecture.webp',
  'public/assets/human/body-anatomy.glb',
  'public/assets/posters/human-anatomy.webp',
  'src/components/experiences/worlds/human-anatomy-explorer',
] as const

describe('release integrity', () => {
  it('ships every release renderer with its critical local assets', () => {
    const registrySource = readFileSync(resolve(root, 'src/worlds/experience-registry.ts'), 'utf8')
    const registeredRendererIds = new Set(
      [...registrySource.matchAll(/^\s*'([^']+)':\s*lazyExperience\(/gm)].map((match) => match[1]),
    )
    const automaticWorldsDirectory = resolve(root, 'src/components/experiences/worlds')
    if (existsSync(automaticWorldsDirectory)) {
      for (const entry of readdirSync(automaticWorldsDirectory, { withFileTypes: true })) {
        if (entry.isDirectory() && existsSync(resolve(automaticWorldsDirectory, entry.name, 'index.tsx'))) {
          registeredRendererIds.add(entry.name)
        }
      }
    }
    expect(registeredRendererIds.size).toBeGreaterThan(0)
    for (const world of worlds) {
      expect(registeredRendererIds.has(world.renderer), `${world.id}: ${world.renderer}`).toBe(true)
    }
    for (const asset of flagshipAssets) {
      expect(statSync(resolve(root, asset)).size, asset).toBeGreaterThan(1_000)
    }
    for (const world of worlds) {
      const poster = `public${world.poster}`
      expect(statSync(resolve(root, poster)).size, poster).toBeGreaterThan(25_000)
    }

    for (const blockedPath of rightsBlockedReleasePaths) {
      expect(existsSync(resolve(root, blockedPath)), blockedPath).toBe(false)
    }

    const periodicAssets = readdirSync(resolve(root, 'public/vendor/periodic-table/assets'))
    expect(statSync(resolve(root, 'public/vendor/periodic-table/index.html')).size).toBeGreaterThan(3_000)
    expect(statSync(resolve(root, 'vendor/three-periodic-table/UPSTREAM.html')).size).toBeGreaterThan(10_000)
    expect(periodicAssets.some((asset) => asset.endsWith('.js'))).toBe(true)
  })

  it('keeps the catalogue image-led', () => {
    const catalogue = readFileSync(resolve(root, 'src/components/HomeDiscovery.tsx'), 'utf8')
    expect(catalogue).toContain('className="work-card-grid"')
    expect(catalogue).toContain('<WorldCard')
    const card = readFileSync(resolve(root, 'src/components/WorldCard.tsx'), 'utf8')
    expect(card).toContain('worldThumbnail(world)')
    expect(card).toContain("'lazy'")
    expect(catalogue).not.toContain('className="world-row"')
  })

  it('ships readable license texts with redistributed visualization software', () => {
    const notices = readFileSync(resolve(root, 'public/third-party-notices.txt'), 'utf8')
    expect(notices).toContain('MOL* — MIT LICENSE')
    expect(notices).toContain('THREE.JS — MIT LICENSE')
    expect(notices).toContain('GOOGLE DRACO — APACHE LICENSE 2.0')
    expect(notices).toContain('SWIPER 12.2.0 — MIT LICENSE')
    expect(notices).not.toContain('TECTONIC EXPLORER — MIT LICENSE')
    expect(notices).not.toContain('PhET Interactive Simulations')
    expect(notices).toContain('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION')
    expect(readFileSync(resolve(root, 'public/assets/cow/NOTICE.txt'), 'utf8')).toContain('Leo White')
  })

  it('keeps a license or notice beside every redistributed vendor bundle', () => {
    // `public/vendor/**` is copied verbatim into the deployed site, so an
    // upstream MIT/BSD/Apache notice must travel with it. A missing sidecar is
    // how the ai-world bundle shipped without its MIT text.
    const vendorRoot = resolve(root, 'public/vendor')
    const missing = readdirSync(vendorRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => {
        const files = readdirSync(resolve(vendorRoot, name))
        return !files.some((file) => /^(?:LICENSE|NOTICE|COPYING|SOURCES)/iu.test(file))
      })

    expect(missing).toEqual([])
  })

  it('redirects every retired demo to a current flagship world', () => {
    expect(Object.keys(legacyWorldRedirects)).toHaveLength(13)
    for (const replacement of Object.values(legacyWorldRedirects)) {
      expect(getWorld(replacement)?.publication).toBe('public')
    }
    for (const retiredId of ['collision-threshold', 'osmosis-membrane', 'back-the-world', 'unknown-world']) {
      expect(legacyWorldRedirects[retiredId]).toBeUndefined()
    }
  })

  it('publishes every public world in the sitemap', () => {
    const sitemap = readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://shapeof.world/</loc>')
    expect(sitemap).toContain('<loc>https://shapeof.world/en</loc>')
    for (const world of worlds) {
      expect(sitemap, world.id).toContain(`<loc>https://shapeof.world/${world.id}</loc>`)
      expect(sitemap, world.id).toContain(`<loc>https://shapeof.world/en/${world.id}</loc>`)
    }
    for (const archivedWorldId of archivedWorldIds) {
      expect(sitemap, archivedWorldId).not.toContain(`<loc>https://shapeof.world/${archivedWorldId}</loc>`)
    }
  })
})
