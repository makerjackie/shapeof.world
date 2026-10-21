import { useSyncExternalStore } from 'react'
import { particles, type ParticleId } from './particle-data'

export const museumSections = ['collection', 'matter', 'interactions', 'discovery', 'experiments', 'frontiers'] as const
export type MuseumSection = typeof museumSections[number]
export type MuseumRoute = { view: 'journey' } | { view: 'museum'; particleId?: ParticleId; section?: MuseumSection; topicId?: string; labId?: string }

export function parseMuseumRoute(hash: string): MuseumRoute {
 if (hash.startsWith('#museum/read/')) { const id=hash.slice(13); return /^[a-z][a-z0-9-]*$/.test(id)?{view:'museum',topicId:id}:{view:'museum'} }
 if (hash.startsWith('#museum/lab/')) { const id=hash.slice(12); return ['atom','oscillation','event'].includes(id)?{view:'museum',labId:id}:{view:'museum'} }
 const section = museumSections.find(s=>hash===`#museum/${s}`)
 if(section)return {view:'museum',section:section==='interactions'?'matter':section==='experiments'?'discovery':section}
 const match = /^#museum(?:\/([a-z]+))?$/.exec(hash)
 if (!match) return { view: 'journey' }
 const particleId = particles.find(p => p.id === match[1])?.id
 return { view: 'museum', ...(particleId ? { particleId } : {}) }
}

export function museumHash(particleId?: ParticleId): string {
 return particleId ? `#museum/${particleId}` : '#museum'
}

function subscribe(onChange: () => void) {
 window.addEventListener('hashchange', onChange)
 return () => window.removeEventListener('hashchange', onChange)
}

/** Native fragment navigation keeps deep links usable without adding a site route. */
export function useMuseumRoute() {
 const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '')
 return parseMuseumRoute(hash)
}
