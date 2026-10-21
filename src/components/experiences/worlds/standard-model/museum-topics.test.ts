import { describe, expect, it } from 'vitest'
import { particleIds } from './particle-data'
import { museumTopics } from './museum-topics'

describe('standard-model museum topics', () => {
  it('covers the four museum sections with substantial bilingual entries', () => {
    expect(museumTopics.length).toBeGreaterThanOrEqual(16)
    expect(new Set(museumTopics.map(topic => topic.section))).toEqual(new Set(['matter', 'interactions', 'discovery', 'frontiers']))
    expect(new Set(museumTopics.map(topic => topic.id)).size).toBe(museumTopics.length)
    for (const topic of museumTopics) {
      expect(topic.body.length).toBeGreaterThanOrEqual(2)
      for (const field of [topic.title, topic.question, topic.summary, topic.boundary]) {
        expect(field.zh.trim().length).toBeGreaterThan(0)
        expect(field.en.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('references only registered particles and https primary sources', () => {
    const ids = new Set(particleIds)
    for (const topic of museumTopics) {
      expect(topic.particleIds.length).toBeGreaterThan(0)
      expect(new Set(topic.particleIds).size).toBe(topic.particleIds.length)
      for (const id of topic.particleIds) expect(ids.has(id)).toBe(true)
      expect(topic.sourceLinks.length).toBeGreaterThanOrEqual(2)
      for (const source of topic.sourceLinks) {
        expect(source.title.trim().length).toBeGreaterThan(0)
        expect(source.url).toMatch(/^https:\/\/[^\s]+$/)
      }
    }
  })

  it('keeps the reviewed scientific boundaries explicit', () => {
    const byId = new Map(museumTopics.map(topic => [topic.id, topic]))
    expect(byId.get('neutrino-mass')?.body[0].zh).toContain('至少一个')
    expect(byId.get('dark-matter')?.boundary.zh).toContain('守恒仍成立')
    expect(byId.get('electromagnetism')?.body[1].zh).toContain('1905')
    expect(byId.get('electromagnetism')?.body[1].zh).toContain('1923')
    expect(byId.has('matter-excess')).toBe(true)
  })
})
