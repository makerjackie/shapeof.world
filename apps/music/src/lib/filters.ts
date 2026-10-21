import taxonomy from '~/generated/taxonomy.json'
import { archetypeLetter, type ArchetypeLetter, type Track } from '~/data/catalog'

export type TrackFilters = {
  kind?: 'music' | 'sfx' | 'ambience'
  commercialOnly?: boolean
  loopOnly?: boolean
  narrationOnly?: boolean
  category?: string
  archetype?: ArchetypeLetter
  mood?: string
  energy?: number
  bpmMin?: number
  bpmMax?: number
  instrument?: string
  topic?: string
  style?: string
  scenario?: string
  durationMin?: number
  durationMax?: number
  q?: string
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function filterTracks(tracks: Track[], filters: TrackFilters): Track[] {
  const query = filters.q?.trim().toLowerCase() ?? ''
  return tracks.filter((track) => {
    if (filters.kind && track.kind !== filters.kind) return false
    if (filters.commercialOnly && track.rights?.commercialUse !== true) return false
    if (filters.loopOnly && track.loop?.seamless !== true) return false
    if (filters.narrationOnly && !track.usage?.narrationFriendly) return false
    if (filters.category && track.category !== filters.category) return false
    if (filters.archetype && archetypeLetter(track) !== filters.archetype) return false
    if (filters.mood && !track.moods.includes(filters.mood)) return false
    if (filters.energy && track.energy !== filters.energy) return false
    if (filters.bpmMin && track.bpm < filters.bpmMin) return false
    if (filters.bpmMax && track.bpm > filters.bpmMax) return false
    if (filters.instrument && !track.instruments.includes(filters.instrument)) return false
    if (filters.topic && !track.topics.includes(filters.topic)) return false
    if (filters.style && !track.styles.includes(filters.style)) return false
    if (filters.scenario && !track.scenarios.includes(filters.scenario)) return false
    if (filters.durationMin !== undefined && track.duration < filters.durationMin) return false
    if (filters.durationMax !== undefined && track.duration > filters.durationMax) return false
    if (!query) return true
    const haystack = [
      track.id,
      track.code,
      track.title.en,
      track.title.zh,
      track.category,
      track.archetype,
      track.key,
      ...track.moods,
      ...track.topics,
      ...track.instruments,
      ...[...track.moods, ...track.instruments].flatMap(id => Object.values((taxonomy.tags as Record<string, { en: string; zh: string }>)[id] ?? {})),
      track.description?.en,
      track.description?.zh,
      ...track.styles,
      ...track.scenarios,
      ...track.styles.flatMap(id => Object.values((taxonomy.styles as Record<string, { en: string; zh: string }>)[id] ?? {})),
      ...track.scenarios.flatMap(id => Object.values((taxonomy.scenarios as Record<string, { en: string; zh: string }>)[id] ?? {})),
      track.prompt,
    ].join(' ').toLowerCase()
    return query.split(/\s+/).every((word) => haystack.includes(word))
  })
}

export function filtersActive(filters: TrackFilters): boolean {
  return Boolean(
    filters.category
      || filters.commercialOnly
      || filters.loopOnly
      || filters.narrationOnly
      || filters.archetype
      || filters.mood
      || filters.energy
      || filters.bpmMin
      || filters.bpmMax
      || filters.instrument
      || filters.topic
      || filters.style
      || filters.scenario
      || filters.durationMin !== undefined
      || filters.durationMax !== undefined
      || filters.q?.trim(),
  )
}
