import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  dependencySpecifiers,
  directoryRendererEntries,
  overrideEntries,
  registryEntries,
  rendererEntries,
  validateOverrideEntries,
  validateWorldId,
} from '../../scripts/generate-experience-dictionaries.mjs'

const overrideDirectory = resolve(import.meta.dirname, 'experience-en-overrides')
type RendererEntry = { id: string; moduleId: string; source: string }
type OverrideEntry = { id: string; phrases: Record<string, string> }

describe('experience i18n structure', () => {
  it('follows runtime imports without traversing type-only dependencies', () => {
    expect(dependencySpecifiers('fixture.ts', `
      import type { TypeOnly } from './type-only'
      import { value, type MixedType } from './runtime'
      export type { ExportedType } from './export-type'
      export { runtimeValue, type ExportedMixedType } from './export-runtime'
      import './side-effect'
      const lazy = import('./dynamic')
    `)).toEqual(['./runtime', './export-runtime', './side-effect', './dynamic'])
  })

  it('uses one override file per override world and removes the monolith', () => {
    expect(existsSync(resolve(import.meta.dirname, 'experience-en-overrides.json'))).toBe(false)

    const files = readdirSync(overrideDirectory).filter((name) => name.endsWith('.json')).sort()
    const entries = overrideEntries() as Array<OverrideEntry>
    expect(files.length).toBeGreaterThan(0)
    expect(entries.length).toBe(files.length)
    expect(entries.reduce((count, entry) => count + Object.keys(entry.phrases).length, 0)).toBeGreaterThan(files.length)
    expect(entries.map((entry) => `${entry.id}.json`)).toEqual(files)
  })

  it('combines legacy registry entries with world-directory renderer entries', () => {
    const legacy = registryEntries() as Array<RendererEntry>
    const directory = directoryRendererEntries() as Array<RendererEntry>
    const all = rendererEntries() as Array<RendererEntry>
    const ids = all.map((entry) => entry.id)

    expect(legacy.length).toBe(0)
    expect(directory.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of directory) {
      expect(entry.moduleId).toBe(`~/components/experiences/worlds/${entry.id}/index.tsx`)
      expect(readFileSync(entry.source, 'utf8')).toContain('worldRenderer')
    }
  })

  it('keeps shared search copy out of per-world dictionaries', () => {
    const dictionary = JSON.parse(readFileSync(resolve(import.meta.dirname, 'experience-en/rainbow.json'), 'utf8'))
    expect(dictionary).not.toHaveProperty('去月球要几天？')
    expect(dictionary).not.toHaveProperty('整片天空')
  })

  it('rejects duplicate, orphan, and invalid world ids', () => {
    expect(() => validateWorldId('not_a_world', 'test')).toThrow('Invalid world id')

    const renderer = [{ id: 'known-world' }]
    expect(() => validateOverrideEntries([
      { id: 'known-world', phrases: {} },
      { id: 'known-world', phrases: {} },
    ], renderer)).toThrow('Duplicate renderer id')
    expect(() => validateOverrideEntries([
      { id: 'unknown-world', phrases: {} },
    ], renderer)).toThrow('Orphan experience override')
  })
})
