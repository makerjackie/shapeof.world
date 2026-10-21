import { tracks, type Track } from '~/data/catalog'

export function similarTracks(track: Track, limit = 4): Track[] {
  const scored = tracks
    .filter((candidate) => candidate.id !== track.id && candidate.kind === track.kind)
    .map((candidate) => {
      let score = 0
      for (const style of track.styles) if (candidate.styles.includes(style)) score += 3
      for (const scenario of track.scenarios) if (candidate.scenarios.includes(scenario)) score += 2
      if (candidate.category === track.category) score += 3
      if (candidate.archetype === track.archetype) score += 1
      if (candidate.energy === track.energy) score += 1
      if (Math.abs(candidate.bpm - track.bpm) <= 10) score += 1
      for (const mood of track.moods) if (candidate.moods.includes(mood)) score += 1
      for (const instrument of track.instruments) if (candidate.instruments.includes(instrument)) score += 1
      return { candidate, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.code.localeCompare(right.candidate.code))
  return scored.slice(0, limit).map((entry) => entry.candidate)
}

export function neighbors(track: Track): { prev?: Track; next?: Track } {
  const list = tracks.filter(item => item.kind === track.kind)
  const index = list.findIndex((item) => item.id === track.id)
  if (index < 0 || list.length === 0) return {}
  return {
    prev: list[(index - 1 + list.length) % list.length],
    next: list[(index + 1) % list.length],
  }
}
