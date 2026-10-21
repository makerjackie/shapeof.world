import type { ParticleId } from '../particle-data'
import snapshot from './snapshot.json'

export type MuseumFact = {
	sourceStatus: 'parsed' | 'unavailable'
	mass: string
	massEn: string
	lifetime: string
	lifetimeEn: string
	sourceUrl: string
	edition: string
	note?: string
	noteEn?: string
}

export const museumFacts: Partial<Record<ParticleId, MuseumFact>> = Object.fromEntries(Object.entries(snapshot.records).map(([id, fact]) => {
 if (fact.sourceStatus !== 'parsed' && fact.sourceStatus !== 'unavailable') throw new Error(`Invalid source status: ${id}`)
 return [id, { ...fact, sourceStatus: fact.sourceStatus } satisfies MuseumFact]
}))
