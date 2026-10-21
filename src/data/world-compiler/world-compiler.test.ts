import { describe, expect, it } from 'vitest'

import officialIndex from '../generated/official-world-index.json'
import { worlds } from '../worlds'
import { adaptLegacyWorld } from './legacy-adapter'
import {
  compileWorld,
  contentRevisionOf,
  omitsAuthorPrivateFields,
  projectOfflineWorldRecord,
  projectPublicWorldCard,
  projectPublicWorldDetail,
  projectWorldSearchDocument,
} from './compile'
import { isWorldCompilePilot, worldCompilePilots } from './pilots'

function compileNamed(id: string) {
  const world = worlds.find((item) => item.id === id)
  if (!world) throw new Error(`Missing public world ${id}`)
  return compileWorld({
    world,
    state: 'public',
    sourceCommit: 'a'.repeat(40),
    releaseId: 'local-test',
    packId: officialIndex.worlds[id as keyof typeof officialIndex.worlds]?.packId,
  })
}

describe('world compiler', () => {
  it('compiles the three pilots into public read models with provenance', () => {
    for (const id of worldCompilePilots) {
      const first = compileNamed(id)
      const second = compileNamed(id)
      expect(first.adapter).toBe('pilot')
      expect(first.contentRevision).toBe(second.contentRevision)
      const card = projectPublicWorldCard(first)
      const detail = projectPublicWorldDetail(first)
      const search = projectWorldSearchDocument(first)
      const offline = projectOfflineWorldRecord(first, 'world.shapeof.starter')
      for (const record of [card, detail, search, offline]) {
        expect(record.schemaVersion).toBe(1)
        expect(record.sourceCommit).toHaveLength(40)
        expect(record.contentRevision).toHaveLength(64)
        expect(record.releaseId).toBe('local-test')
        expect(omitsAuthorPrivateFields(record)).toBe(true)
      }
      expect(detail).not.toHaveProperty('transferBudgetMb')
      expect(card).not.toHaveProperty('onboardingVersion')
    }
  })

  it('routes a non-pilot world through the legacy adapter into the same IR shape', () => {
    const world = worlds.find((item) => !isWorldCompilePilot(item.id))
    if (!world) throw new Error('Need a non-pilot world')
    const ir = adaptLegacyWorld(world, {
      state: 'public',
      sourceCommit: 'b'.repeat(40),
      releaseId: 'local-test',
    })
    expect(ir.adapter).toBe('legacy')
    expect(ir.id).toBe(world.id)
    expect(projectPublicWorldDetail(ir).id).toBe(world.id)
  })

  it('keeps contentRevision stable for the same compile input', () => {
    expect(contentRevisionOf({ id: 'rainbow', n: 1 })).toBe(contentRevisionOf({ n: 1, id: 'rainbow' }))
  })
})
