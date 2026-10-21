import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isWorldDirectlyAccessible, isWorldDiscoverable, resolveWorldState } from './world-state'
import { lifecycleMatrix } from '../../scripts/lib/world-lifecycle.mjs'

const root = resolve(import.meta.dirname, '../..')

const states = ['public', 'making', 'failed', 'archived', 'rights-blocked'] as const

describe('single lifecycle resolver', () => {
  it('keeps the product matrix for every state', () => {
    const fixtures = {
      public: { id: 'seasons', publication: 'public' as const },
      making: { id: 'private-draft', publication: 'making' as const },
    }

    expect(resolveWorldState(fixtures.public)).toBe('public')
    expect(resolveWorldState(fixtures.making)).toBe('making')

    for (const state of states) {
      const matrix = lifecycleMatrix(state)
      expect(matrix.webDiscovery).toBe(state === 'public')
      expect(matrix.appDiscovery).toBe(state === 'public')
      expect(matrix.officialPack).toBe(state === 'public')
      expect(matrix.seoIndex).toBe(state === 'public')
      expect(matrix.directAccess).toBe(state !== 'rights-blocked')
    }

    expect(isWorldDiscoverable(fixtures.public)).toBe(true)
    expect(isWorldDiscoverable(fixtures.making)).toBe(false)
    expect(isWorldDirectlyAccessible(fixtures.making)).toBe(true)
  })

  it('uses the same resolver from the artifact, summary and sitemap generators', () => {
    const artifact = readFileSync(resolve(root, 'scripts/generate-world-artifacts.mjs'), 'utf8')
    const summaries = readFileSync(resolve(root, 'scripts/generate-world-summaries.mjs'), 'utf8')
    const sitemap = readFileSync(resolve(root, 'scripts/generate-sitemap.mjs'), 'utf8')
    expect(artifact).toContain("from './lib/world-lifecycle.mjs'")
    expect(summaries).toContain("from './lib/world-lifecycle.mjs'")
    expect(sitemap).toContain("from './lib/world-lifecycle.mjs'")
    expect(artifact).not.toContain('rightsBlockedIds.has')
    expect(summaries).not.toContain('archivedIds()')
    expect(sitemap).not.toContain('readArchivedWorldIds')
  })
})
