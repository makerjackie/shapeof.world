import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { album, albumTracks, catalog, tracks } from './catalog'

const here = dirname(fileURLToPath(import.meta.url))
const tracksDir = join(here, '../../../../music/tracks')

const required = [
  'id',
  'code',
  'category',
  'archetype',
  'role',
  'model',
  'duration',
] as const

describe('soundtrack catalog', () => {
  it('keeps paginated audio discovery complete without counting scene-kit mixes', () => {
    const publicDir = join(here, '../../public')
    const index = JSON.parse(readFileSync(join(publicDir, 'audio-index.json'), 'utf8'))
    const discovered: string[] = []
    for (const kind of ['music','sfx','ambience']) {
      const entry = index.kinds[kind]
      const ids: string[] = []
      for (const page of entry.pages) {
        const data = JSON.parse(readFileSync(join(publicDir,new URL(page.url).pathname), 'utf8'))
        expect(data.tracks.length).toBeLessThanOrEqual(60)
        expect(data.tracks.every((track: {kind:string}) => track.kind === kind)).toBe(true)
        ids.push(...data.tracks.map((track: {id:string}) => track.id))
      }
      expect(ids.length).toBe(entry.count)
      expect(new Set(ids).size).toBe(ids.length)
      discovered.push(...ids)
    }
    expect(discovered.sort()).toEqual(tracks.map(t=>t.id).sort())
  })

  it('publishes permissions and loop URLs only with corresponding evidence', () => {
    const full = JSON.parse(readFileSync(join(here,'../../public/catalog.json'),'utf8'))
    for (const track of full.tracks) {
      if (!track.rightsProfile) expect(track.rights.commercialUse).toBeNull()
      if (track.batch === 'sound-design-2026-09' || track.batch === 'scene-audio-2026-09') {
        expect(track.rights.commercialUse).toBe(true)
        expect(track.rights.claimFreeGuarantee).toBe(false)
        expect(track.audioReview.suitableForLibrary).toBe(true)
        expect(track.audioReview.audibleDefect).toBe(false)
        for (const [key, url] of Object.entries(track.assets)) {
          expect(url).toMatch(/^https:\/\/music-cdn\.shapeof\.world\/tracks\//)
          expect(track.assetIntegrity[key].sha256).toMatch(/^[a-f0-9]{64}$/)
          expect(track.assetIntegrity[key].bytes).toBeGreaterThan(0)
        }
        if (track.loop?.seamless) {
          expect(track.assets[track.loop.asset]).toMatch(/\.wav$/)
          expect(track.loop.endSample).toBeGreaterThan(0)
          expect(track.loop.basis.toLowerCase()).toContain('pcm')
        }
      }
    }
  })
  it('album zip uses the public CDN when present', () => {
    if (!album.zip) return
    expect(album.zip.startsWith('https://music-cdn.shapeof.world/')).toBe(true)
    expect(album.zip.includes('r2.dev')).toBe(false)
  })

  it('generated catalog ids are unique and required fields exist', () => {
    if (tracks.length === 0) return
    const ids = tracks.map((track) => track.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const track of catalog.tracks) {
      for (const key of required) {
        expect(track[key], `${track.id}.${key}`).toBeTruthy()
      }
      expect(track.title.en, `${track.id}.title.en`).toBeTruthy()
      expect(track.title.zh, `${track.id}.title.zh`).toBeTruthy()
      expect(track.assets.preview.startsWith('https://music-cdn.shapeof.world/tracks/')).toBe(true)
      expect(track.assets.preview.endsWith('/preview.mp3')).toBe(true)
      expect(track.assets.master.startsWith('https://music-cdn.shapeof.world/tracks/')).toBe(true)
      expect(/\/master\.(wav|mp3)$/.test(track.assets.master)).toBe(true)
      expect(track.assets.preview.includes('r2.dev')).toBe(false)
      expect(track.energy).toBeGreaterThanOrEqual(1)
      expect(track.energy).toBeLessThanOrEqual(5)
    }
  })

  it('publishes only playable records and exports the same ids for AI clients', () => {
    const publicCatalog = JSON.parse(readFileSync(join(here, '../../public/catalog.json'), 'utf8'))
    expect(publicCatalog.count).toBe(tracks.length)
    expect(publicCatalog.tracks.map((t: { id: string }) => t.id).sort()).toEqual(tracks.map(t => t.id).sort())
    for (const track of publicCatalog.tracks) {
      expect(track.status).toBe('published')
      if (track.batch === 'library-2026-09') {
        expect(track.verifiedAt).toBeTruthy()
        expect(track.audioReview.instrumental).toBe(true)
        expect(track.audioReview.vocalsDetected).toBe(false)
        expect(track.audioReview.audibleDefect).toBe(false)
        expect(track.duration).toBeGreaterThan(20)
        expect(track.styles.length).toBeGreaterThan(0)
        expect(track.scenarios.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps small style and scene indexes consistent with the full catalog', () => {
    const publicDir = join(here, '../../public')
    const taxonomy = JSON.parse(readFileSync(join(publicDir, 'taxonomy.json'), 'utf8'))
    for (const kind of ['styles', 'scenarios'] as const) {
      for (const [id, label] of Object.entries(taxonomy[kind]) as [string, { count: number }][]) {
        const subset = JSON.parse(readFileSync(join(publicDir, kind, `${id}.json`), 'utf8'))
        const expected = tracks.filter(track => track[kind].includes(id)).map(track => track.id).sort()
        expect(subset.tracks.map((t: { id: string }) => t.id).sort()).toEqual(expected)
        expect(subset.count).toBe(expected.length)
        expect(label.count).toBe(expected.length)
      }
    }
  })

  it('exports short edits with independent sources and honest durations', () => {
    const subset = JSON.parse(readFileSync(join(here, '../../public/collections/short-promos.json'), 'utf8'))
    const expected = tracks.filter(track => track.collections.includes('short-promos'))
    expect(subset.tracks.map((t: {id: string}) => t.id).sort()).toEqual(expected.map(t => t.id).sort())
    expect(subset.count).toBe(expected.length)
    const index = JSON.parse(readFileSync(join(here, '../../public/collections/short-promos.index.json'), 'utf8'))
    expect(index.count).toBe(subset.count)
    expect(index.tracks.map((t: {id: string}) => t.id)).toEqual(subset.tracks.map((t: {id: string}) => t.id))
    for (const entry of index.tracks) {
      const source = subset.tracks.find((t: {id: string}) => t.id === entry.id)
      expect(entry.duration).toBe(source.duration)
      expect(entry.assets).toEqual({preview: source.assets.preview, master: source.assets.master})
      expect(entry.metadataUrl).toBe(`https://music.shapeof.world/tracks/${entry.id}.json`)
      expect(entry.use).toBe(source.shortForm.use)
      expect(entry).not.toHaveProperty('prompt')
    }
    const hashes = new Set()
    for (const track of subset.tracks) {
      expect(track.duration).toBeGreaterThan(14)
      expect(track.duration).toBeLessThan(41)
      expect(track.sourceDuration).toBeGreaterThan(track.duration)
      expect(track.edit.kind).toBe('ending-excerpt')
      expect(track.audioReview.asset).toBe('preview')
      expect(track.audioReview.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(track.audioReview.immediateHook).toBe(true)
      expect(track.audioReview.resolvedEnding).toBe(true)
      expect(track.sourceAudioReview.instrumental).toBe(true)
      expect(track.sourceAudioReview.vocalsDetected).toBe(false)
      hashes.add(track.generation.sha256)
    }
    expect(hashes.size).toBe(expected.length)
  })

  it('keeps the existing album curated independently of the growing library', () => {
    expect(albumTracks.map(t => t.id)).toEqual(album.trackIds)
    expect(albumTracks.some(t => t.id.startsWith('lib-'))).toBe(false)
  })

  it('source track files are unique when present', () => {
    if (!existsSync(tracksDir)) return
    const files = readdirSync(tracksDir).filter((name) => name.endsWith('.json'))
    if (files.length === 0) return
    const ids: string[] = []
    for (const file of files) {
      const raw = JSON.parse(readFileSync(join(tracksDir, file), 'utf8')) as {
        id?: string
        title?: { en?: string; zh?: string }
        assets?: { preview?: string }
      }
      expect(raw.id, file).toBeTruthy()
      expect(raw.title?.en, `${file} title.en`).toBeTruthy()
      expect(raw.title?.zh, `${file} title.zh`).toBeTruthy()
      ids.push(raw.id as string)
      if (raw.assets?.preview) {
        expect(raw.assets.preview.includes('r2.dev')).toBe(false)
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })
})
