import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paths } from './content-graph'
import { legacyWorldRedirects } from './legacy-redirects'
import { getWorld } from './worlds'

describe('author-directed catalogue removal', () => {
  it('keeps every retired id out of the catalogue, paths and world source, and redirects it to a public world', () => {
    const retiredIds = Object.keys(legacyWorldRedirects)
    expect(retiredIds.length).toBeGreaterThan(0)
    for (const id of retiredIds) {
      expect(getWorld(id), id).toBeUndefined()
      expect(existsSync(resolve(`src/components/experiences/worlds/${id}/index.tsx`)), id).toBe(false)
      expect(existsSync(resolve(`src/i18n/experience-en/${id}.json`)), id).toBe(false)
    }
    for (const target of Object.values(legacyWorldRedirects)) expect(getWorld(target)?.publication).toBe('public')
    expect(legacyWorldRedirects['money-creation']).toBe('follow-the-money')
    expect(legacyWorldRedirects['money-flow-atlas']).toBe('follow-the-money')
    expect(paths.every(path => path.worldIds.length >= 2)).toBe(true)
  })
})
