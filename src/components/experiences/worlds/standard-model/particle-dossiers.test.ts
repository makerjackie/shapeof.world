import { describe, expect, it } from 'vitest'
import { particleIds } from './particle-data'
import { museumSources, particleDossiers } from './particle-dossiers'

describe('standard-model museum dossiers', () => {
  it('covers every particle exactly once', () => {
    expect(Object.keys(particleDossiers).sort()).toEqual([...particleIds].sort())
  })

  it('uses complete, checked source records for every claim', () => {
    for (const dossier of Object.values(particleDossiers)) {
      for (const claim of [dossier.summary, dossier.occurrence, dossier.behaviour, dossier.discovery, dossier.boundary]) {
        expect(claim.sourceIds.length).toBeGreaterThan(0)
        for (const id of claim.sourceIds) {
          expect(museumSources[id]).toBeDefined()
          expect(museumSources[id].url).toMatch(/^https:\/\/[^\s]+$/)
          expect(museumSources[id].checkedAt).toBe('2026-09-14')
        }
      }
    }
  })

  it('keeps related particles valid, distinct, and external', () => {
    const ids = new Set(particleIds)
    for (const [id, dossier] of Object.entries(particleDossiers)) {
      expect(dossier.related.length).toBeGreaterThanOrEqual(2)
      expect(dossier.related.length).toBeLessThanOrEqual(4)
      expect(new Set(dossier.related).size).toBe(dossier.related.length)
      for (const related of dossier.related) {
        expect(ids.has(related)).toBe(true)
        expect(related).not.toBe(id)
      }
    }
  })
})
