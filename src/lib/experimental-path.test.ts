import { describe, expect, it } from 'vitest'
import { experimentalPathSummary } from './experimental-path'
import { worldCatalog } from '~/data/worlds/catalog'
import type { WorldArtifact } from '~/data/world-artifacts'

describe('experimental direct cards', () => {
  const world = worldCatalog.find(world => world.id === 'eclipses')!
  it('projects public and making worlds without exposing full source notes', () => {
    for (const state of ['public', 'making'] as const) {
      const card = experimentalPathSummary({ schemaVersion: 1, state, world })!
      expect(card.id).toBe('eclipses')
      expect(card.translations.en.title).toBeTruthy()
      expect(card).not.toHaveProperty('fieldNotes')
      expect(card).not.toHaveProperty('sources')
    }
  })
  it('does not surface missing, blocked, archived or failed worlds through an experiment', () => {
    expect(experimentalPathSummary(undefined)).toBeUndefined()
    for (const state of ['rights-blocked', 'archived', 'failed'] as WorldArtifact['state'][]) {
      expect(experimentalPathSummary({ schemaVersion: 1, state, world })).toBeUndefined()
    }
  })
})
