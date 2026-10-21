import {existsSync, readFileSync, statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

import {worlds} from './worlds'
import {dailyIssues} from './issues'

const root = resolve(import.meta.dirname, '../..')
const heavyweightAssetPattern = /(?:\.glb|\.gltf|\.hdr|\.bcif|\.pdb|\.wasm)(?:[?#'"\s]|$)|(?:from\s+|import\s+)['"][^'"]*molstar/i
const minimumPosterBytes = 30_000
const minimumMobilePosterBytes = 20_000
const maximumPosterBytes = 320_000
const maximumMobilePosterBytes = 800_000
const maximumDesktopPosterBytes = 1_600_000
const minimumPosterWidth = 900
const minimumPosterHeight = 680
const minimumPosterArea = 700_000
const minimumMobilePosterWidth = 1170
const minimumMobilePosterHeight = 2532
const minimumDesktopPosterWidth = 3200
const minimumDesktopPosterHeight = 2000

function readUint24LE(buffer: Buffer, offset: number) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function readWebpDimensions(buffer: Buffer): {width: number; height: number} | undefined {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return
  let chunkOffset = 12
  while (chunkOffset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', chunkOffset, chunkOffset + 4)
    const chunkSize = buffer.readUInt32LE(chunkOffset + 4)
    const dataOffset = chunkOffset + 8

    if (chunkType === 'VP8X' && dataOffset + 10 <= buffer.length) {
      return {
        width: readUint24LE(buffer, dataOffset + 4) + 1,
        height: readUint24LE(buffer, dataOffset + 7) + 1,
      }
    }

    if (chunkType === 'VP8 ' && dataOffset + 10 <= buffer.length) {
      const hasKeyFrameHeader = buffer[dataOffset + 3] === 0x9d
        && buffer[dataOffset + 4] === 0x01
        && buffer[dataOffset + 5] === 0x2a
      if (hasKeyFrameHeader) {
        return {
          width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        }
      }
    }

    if (chunkType === 'VP8L' && dataOffset + 5 <= buffer.length && buffer[dataOffset] === 0x2f) {
      const dimensions = buffer.readUInt32LE(dataOffset + 1)
      return {
        width: (dimensions & 0x3fff) + 1,
        height: ((dimensions >>> 14) & 0x3fff) + 1,
      }
    }

    chunkOffset = dataOffset + chunkSize + (chunkSize % 2)
  }

}

function readJpegDimensions(buffer: Buffer): {width: number; height: number} | undefined {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
  ])
  let markerOffset = 2

  while (markerOffset + 9 < buffer.length) {
    if (buffer[markerOffset] !== 0xff) {
      markerOffset += 1
      continue
    }

    const marker = buffer[markerOffset + 1]
    if (startOfFrameMarkers.has(marker)) {
      return {
        width: buffer.readUInt16BE(markerOffset + 7),
        height: buffer.readUInt16BE(markerOffset + 5),
      }
    }

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      markerOffset += 2
      continue
    }

    const segmentLength = buffer.readUInt16BE(markerOffset + 2)
    if (segmentLength < 2) break
    markerOffset += segmentLength + 2
  }
}

function readPngDimensions(buffer: Buffer): {width: number; height: number} | undefined {
  const pngSignature = '89504e470d0a1a0a'
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature || buffer.length < 24) return
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function readRasterDimensions(buffer: Buffer): {width: number; height: number} {
  const dimensions = readWebpDimensions(buffer)
    ?? readJpegDimensions(buffer)
    ?? readPngDimensions(buffer)

  if (!dimensions) throw new Error('Poster must be a valid WebP, JPEG or PNG raster image')
  return dimensions
}

function resolveLocalModule(fromFile: string, specifier: string): string | undefined {
  const base = specifier.startsWith('~/')
    ? resolve(root, 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(fromFile), specifier)
      : undefined
  if (!base) return

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ]
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile())
}

function collectStaticImportGraph(entry: string): Map<string, string> {
  const graph = new Map<string, string>()
  const pending = [resolve(root, entry)]

  while (pending.length > 0) {
    const file = pending.pop()
    if (!file || graph.has(file)) continue
    const source = readFileSync(file, 'utf8')
    graph.set(file, source)

    const specifiers = [
      ...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
      ...source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
    ].map((match) => match[1])

    for (const specifier of specifiers) {
      const dependency = resolveLocalModule(file, specifier)
      if (dependency && !graph.has(dependency)) pending.push(dependency)
    }
  }

  return graph
}

describe('asset loading policy', () => {
  it('declares a bounded first-session transfer budget and fallback for every world', () => {
    const defaultFirstSessionBudgetMb = 12
    const firstSessionBudgetExceptions: Record<string, number> = {
      // BodyParts3D 4.0 gzipped atlas: 2,234 meshes across 15 chunks, ~33 MB on disk.
      'human-atlas': 36,
    }

    for (const world of worlds) {
      const cap = firstSessionBudgetExceptions[world.id] ?? defaultFirstSessionBudgetMb
      expect(world.transferBudgetMb, `${world.id}: transfer budget`).toBeGreaterThan(0)
      expect(world.transferBudgetMb, `${world.id}: transfer budget`).toBeLessThanOrEqual(cap)
      expect(['poster', 'text'], `${world.id}: fallback`).toContain(world.fallback)
    }
  })

  it('keeps heavyweight world renderers out of the complete static home-page import graph', () => {
    const homeGraph = new Map([
      ...collectStaticImportGraph('src/routes/__root.tsx'),
      ...collectStaticImportGraph('src/routes/index.tsx'),
    ])

    for (const [sourcePath, source] of homeGraph) {
      expect(source, sourcePath.replace(`${root}/`, '')).not.toMatch(heavyweightAssetPattern)
    }
  })

  it('keeps full catalogues and daily editions off the shared experience client path', () => {
    const shell = readFileSync(resolve(root, 'src/components/ExperienceShell.tsx'), 'utf8')
    const route = readFileSync(resolve(root, 'src/routes/explore.$worldId.tsx'), 'utf8')

    expect(shell).toContain('navigation: ExperienceNavigation')
    expect(shell).not.toContain('dailyIssues')
    expect(shell).not.toContain("from '~/data/worlds'")
    expect(route).toContain("createServerFn({ method: 'GET' })")
    expect(route).toContain("import('~/data/world-artifacts.server')")
    expect(route).not.toContain("import('~/data/worlds')")
    expect(route).not.toContain("import { getWorld } from '~/data/worlds'")
  })

  it('keeps heavyweight world assets out of the service-worker precache', () => {
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')
    const shellDeclaration = serviceWorker.match(/const\s+SHELL\s*=\s*(\[[\s\S]*?\])/)

    expect(shellDeclaration, 'public/sw.js must expose an auditable SHELL precache list').not.toBeNull()
    expect(shellDeclaration?.[1] ?? '').not.toMatch(heavyweightAssetPattern)
  })

  it('does not serve mutable posters or vendored experiences stale-first', () => {
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')

    expect(serviceWorker).toContain("const MUTABLE_STATIC_PREFIXES = ['/assets/posters/', '/vendor/']")
    expect(serviceWorker).toContain('event.respondWith(mutableStaticResponse(request, event.waitUntil.bind(event)))')
    expect(serviceWorker).toMatch(/async function mutableStaticResponse\(request, waitUntil\) \{\s*try \{\s*const response = await fetch\(request\)/)
  })

  it('does not ship the retired Smithsonian Apollo scan', () => {
    expect(existsSync(resolve(root, 'public/assets/flagships/apollo'))).toBe(false)
    expect(existsSync(resolve(root, 'public/assets/posters/apollo-eleven.webp'))).toBe(false)
    expect(existsSync(resolve(root, 'public/assets/posters/apollo-eleven-v2.webp'))).toBe(false)
  })

  it('requires every public world to ship a master poster', () => {
    for (const world of worlds) {
      expect(world.poster, `${world.id}: public worlds need a master poster`).toBeTruthy()
    }
  })

  it('ships posters with a minimum usable file size and raster resolution', () => {
    const posters = [
      {label: 'home cover', path: '/assets/posters/oneworld-cover.webp'},
      ...worlds.flatMap((world) => [
        ...(world.poster ? [{label: world.id, path: world.poster}] : []),
        ...(world.posterMobile ? [{label: `${world.id} mobile`, path: world.posterMobile}] : []),
        ...(world.posterDesktop ? [{label: `${world.id} desktop`, path: world.posterDesktop}] : []),
      ]),
      ...dailyIssues.flatMap((issue) => issue.poster ? [
        {label: `${issue.id} issue`, path: issue.poster.src},
        ...(issue.poster.mobileSrc ? [{label: `${issue.id} issue mobile`, path: issue.poster.mobileSrc}] : []),
        ...(issue.poster.desktopSrc ? [{label: `${issue.id} issue desktop`, path: issue.poster.desktopSrc}] : []),
      ] : []),
    ]

    for (const poster of posters) {
      const relativePath = poster.path.replace(/^\/+/, '')
      const absolutePath = resolve(root, 'public', relativePath)

      expect(poster.path, poster.label).toMatch(/^\/assets\/.+\.(?:webp|jpe?g|png)$/i)
      expect(existsSync(absolutePath), `${poster.label}: ${poster.path}`).toBe(true)
      if (!existsSync(absolutePath)) continue

      const isMobilePoster = poster.label.endsWith(' mobile')
      const isDesktopPoster = poster.label.endsWith(' desktop')
      expect(statSync(absolutePath).size, `${poster.label}: compressed bytes`).toBeGreaterThanOrEqual(
        isMobilePoster ? minimumMobilePosterBytes : minimumPosterBytes,
      )
      expect(statSync(absolutePath).size, `${poster.label}: compressed bytes`).toBeLessThanOrEqual(
        isMobilePoster
          ? maximumMobilePosterBytes
          : isDesktopPoster
            ? maximumDesktopPosterBytes
            : maximumPosterBytes,
      )

      const {width, height} = readRasterDimensions(readFileSync(absolutePath))
      expect(width, `${poster.label}: pixel width`).toBeGreaterThanOrEqual(
        isMobilePoster
          ? minimumMobilePosterWidth
          : isDesktopPoster
            ? minimumDesktopPosterWidth
            : minimumPosterWidth,
      )
      expect(height, `${poster.label}: pixel height`).toBeGreaterThanOrEqual(
        isMobilePoster
          ? minimumMobilePosterHeight
          : isDesktopPoster
            ? minimumDesktopPosterHeight
            : minimumPosterHeight,
      )
      expect(width * height, `${poster.label}: total pixel area`).toBeGreaterThanOrEqual(minimumPosterArea)
    }
  })

  it('ships a dedicated retina portrait poster for every world', () => {
    for (const world of worlds) {
      expect(world.posterMobile, `${world.id}: mobile poster`).toBe(`/assets/posters/mobile/${world.id}.webp`)
    }
  })

  it('ships a dedicated retina landscape poster for every world', () => {
    for (const world of worlds) {
      expect(world.posterDesktop, `${world.id}: desktop poster`).toBe(`/assets/posters/desktop/${world.id}.webp`)
    }
  })

  it('ships a small 384×256 catalogue thumbnail for every public world', () => {
    for (const world of worlds) {
      const thumbnailPath = resolve(root, `public/assets/posters/thumb/${world.id}.webp`)
      expect(existsSync(thumbnailPath), `${world.id}: catalogue thumbnail`).toBe(true)
      expect(statSync(thumbnailPath).size, `${world.id}: thumbnail bytes`).toBeLessThanOrEqual(25_000)
      expect(readRasterDimensions(readFileSync(thumbnailPath)), `${world.id}: thumbnail dimensions`).toEqual({
        width: 384,
        height: 256,
      })
    }
  })

  it('ships a 1200×630 JPEG social card for every public world', () => {
    for (const world of worlds) {
      const socialPath = resolve(root, `public/assets/posters/social/${world.id}.jpg`)
      expect(existsSync(socialPath), `${world.id}: social card`).toBe(true)
      if (!existsSync(socialPath)) continue
      expect(statSync(socialPath).size, `${world.id}: social card bytes`).toBeGreaterThanOrEqual(8_000)
      expect(statSync(socialPath).size, `${world.id}: social card bytes`).toBeLessThanOrEqual(200_000)
      expect(readRasterDimensions(readFileSync(socialPath)), `${world.id}: social card dimensions`).toEqual({
        width: 1200,
        height: 630,
      })
    }
  })

  it('ships a 128×86 globe thumbnail for every public world', () => {
    for (const world of worlds) {
      const orbPath = resolve(root, `public/assets/posters/orb/${world.id}.webp`)
      expect(existsSync(orbPath), `${world.id}: globe thumbnail`).toBe(true)
      expect(statSync(orbPath).size, `${world.id}: globe thumbnail bytes`).toBeLessThanOrEqual(6_000)
      expect(readRasterDimensions(readFileSync(orbPath)), `${world.id}: globe thumbnail dimensions`).toEqual({
        width: 128,
        height: 86,
      })
    }
  })

  it('does not reuse one master poster across different public worlds', () => {
    const ownersByHash = new Map<string, string[]>()

    for (const world of worlds) {
      if (!world.poster) continue
      const posterPath = resolve(root, 'public', world.poster.replace(/^\/+/, ''))
      const hash = createHash('sha256').update(readFileSync(posterPath)).digest('hex')
      ownersByHash.set(hash, [...(ownersByHash.get(hash) ?? []), world.id])
    }

    const duplicates = [...ownersByHash.values()].filter((worldIds) => worldIds.length > 1)
    expect(duplicates, 'Each world needs its own representative master poster').toEqual([])
  })

  it('preloads only the one hero poster on the homepage', () => {
    const route = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf8')
    expect(route).toContain('heroPoster(heroWorldId())')
  })
})
