import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

import worldMusicIds from '~/data/generated/world-music.json'
import { getWorld } from '~/data/worlds'
import { worldCatalog } from '~/data/worlds/catalog'

import worldSoundtrack from '~/data/generated/world-soundtrack.json'

import {
  FALLBACK_SOUNDTRACK_ID,
  parseExploreWorldId,
  shouldPlayDefaultWorldMusic,
  soundtrackIdForWorld,
  soundtrackPreviewUrl,
  WORLDS_WITH_OWN_MUSIC,
  worldOwnsMusic,
} from './world-music'

function sortedIds(ids: Iterable<string>): string[] {
  return [...ids].sort()
}

describe('default world-music policy', () => {
  it('resolves every listed world against the catalogue', () => {
    expect(WORLDS_WITH_OWN_MUSIC.size).toBeGreaterThan(0)
    for (const worldId of WORLDS_WITH_OWN_MUSIC) {
      expect(getWorld(worldId), worldId).toBeDefined()
    }
  })

  it('keeps catalog metadata, JSON and web ownership indexes aligned', () => {
    const catalogIds = worldCatalog
      .filter((world) => world.audioPolicy === 'world-owned')
      .map((world) => world.id)
    const expectedIds = sortedIds(catalogIds)
    expect(expectedIds.length).toBeGreaterThan(0)
    expect(worldMusicIds).toEqual(expectedIds)
    expect(sortedIds(WORLDS_WITH_OWN_MUSIC)).toEqual(expectedIds)
  })

  it('plays the default bed only inside worlds that do not own music', () => {
    expect(parseExploreWorldId('/explore/solar-system')).toBe('solar-system')
    expect(parseExploreWorldId('/about')).toBeUndefined()
    expect(worldOwnsMusic('eclipses')).toBe(true)
    expect(worldOwnsMusic('solar-system')).toBe(true)
    expect(shouldPlayDefaultWorldMusic('/')).toBe(false)
    expect(shouldPlayDefaultWorldMusic('/about')).toBe(false)
    expect(shouldPlayDefaultWorldMusic('/explore/solar-system')).toBe(false)
    expect(shouldPlayDefaultWorldMusic('/explore/eclipses')).toBe(false)
    expect(shouldPlayDefaultWorldMusic('/explore/black-hole-flyby')).toBe(false)
    expect(shouldPlayDefaultWorldMusic('/explore/pi-collision')).toBe(true)
  })

  it('yields the default bed for every generated world-owned id', () => {
    for (const worldId of worldMusicIds) {
      expect(getWorld(worldId), worldId).toBeDefined()
      expect(worldOwnsMusic(worldId), worldId).toBe(true)
      expect(shouldPlayDefaultWorldMusic(`/explore/${worldId}`), worldId).toBe(false)
    }
  })

  it('assigns category originals and falls back to hidden-shapes', () => {
    expect(FALLBACK_SOUNDTRACK_ID).toBe('hidden-shapes')
    expect(soundtrackIdForWorld('solar-system')).toBe('orbital-garden')
    expect(soundtrackIdForWorld('rainbow')).toBe('spectrum-arc')
    expect(soundtrackIdForWorld('black-hole-flyby')).toBe('invisible-halo')
    expect(soundtrackIdForWorld('unknown-world')).toBe('hidden-shapes')
    expect(soundtrackPreviewUrl('hidden-shapes')).toContain('/media/music/hidden-shapes/v3/preview.mp3')
    expect(soundtrackPreviewUrl('hidden-shapes')).not.toContain('r2.dev')
    expect(Object.keys(worldSoundtrack.worlds).sort()).toEqual(worldCatalog.map(world => world.id).sort())
  })

  it('keeps generated outputs byte-stable across repeated generation', async () => {
    const root = resolve(import.meta.dirname, '../..')
    const generator = resolve(root, 'scripts/generate-world-music.mjs')
    const soundtrackGenerator = resolve(root, 'scripts/generate-world-soundtrack.mjs')
    const outputPaths = [
      resolve(root, 'src/data/generated/world-music.json'),
      resolve(root, 'src/data/generated/world-soundtrack.json'),
    ]

    await execFileAsync(process.execPath, [generator], { cwd: root })
    await execFileAsync(process.execPath, [soundtrackGenerator], { cwd: root })
    const firstRun = outputPaths.map((path) => readFileSync(path, 'utf8'))
    await execFileAsync(process.execPath, [generator], { cwd: root })
    const secondRun = outputPaths.map((path) => readFileSync(path, 'utf8'))
    expect(secondRun).toEqual(firstRun)
  }, 30_000)
})
