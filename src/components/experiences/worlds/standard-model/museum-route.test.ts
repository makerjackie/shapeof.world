import { describe, expect, it } from 'vitest'
import { museumHash, parseMuseumRoute } from './museum-route'
import { particles } from './particle-data'

describe('museum page links', () => {
 it('round-trips every particle without confusing the journey and the collection', () => {
  expect(parseMuseumRoute('')).toEqual({ view: 'journey' })
  expect(parseMuseumRoute(museumHash())).toEqual({ view: 'museum' })
  for (const p of particles) expect(parseMuseumRoute(museumHash(p.id))).toEqual({ view: 'museum', particleId: p.id })
 })
 it('opens museum sections, topics and labs without leaving the world',()=>{
  expect(parseMuseumRoute('#museum/collection')).toEqual({view:'museum',section:'collection'})
  expect(parseMuseumRoute('#museum/read/neutrino-mass')).toEqual({view:'museum',topicId:'neutrino-mass'})
  expect(parseMuseumRoute('#museum/lab/oscillation')).toEqual({view:'museum',labId:'oscillation'})
  expect(parseMuseumRoute('#museum/lab/unknown')).toEqual({view:'museum'})
  expect(parseMuseumRoute('#museum/read/../e')).toEqual({view:'museum'})
 })
 it('keeps old merged section links usable', () => {
  expect(parseMuseumRoute('#museum/interactions')).toEqual({view:'museum',section:'matter'})
  expect(parseMuseumRoute('#museum/experiments')).toEqual({view:'museum',section:'discovery'})
 })
 it('keeps unknown particle names on the museum index and ignores unrelated anchors', () => {
  expect(parseMuseumRoute('#museum/unobtainium')).toEqual({ view: 'museum' })
  expect(parseMuseumRoute('#elsewhere')).toEqual({ view: 'journey' })
  expect(parseMuseumRoute('#museum/e/malformed')).toEqual({ view: 'journey' })
 })
})
