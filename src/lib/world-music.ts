import soundtrackCatalog from '~/data/soundtrack.json'
import worldMusicIds from '~/data/generated/world-music.json'
import worldSoundtrack from '~/data/generated/world-soundtrack.json'

/**
 * Default world-music policy.
 *
 * The shared bed is not a site-wide loop. It plays only inside a world that
 * does not own a soundtrack, sonification, or ambient bed. Worlds that do
 * own sound take the channel as soon as they are entered. Worlds without
 * their own sound play the assigned Shape of the World original, falling
 * back to GLO-B01 hidden-shapes.
 */

const EXPLORE_WORLD_PATH = /^\/explore\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/

export const WORLDS_WITH_OWN_MUSIC: ReadonlySet<string> = new Set(worldMusicIds)
export const FALLBACK_SOUNDTRACK_ID = soundtrackCatalog.fallbackTrackId
export const LOCAL_FALLBACK_SOUNDTRACK_SRC = '/assets/audio/hidden-shapes.mp3'

export function parseExploreWorldId(pathname: string): string | undefined {
  return pathname.match(EXPLORE_WORLD_PATH)?.[1]
}

export function worldOwnsMusic(worldId: string | undefined): boolean {
  return Boolean(worldId && WORLDS_WITH_OWN_MUSIC.has(worldId))
}

export function shouldPlayDefaultWorldMusic(pathname: string): boolean {
  const worldId = parseExploreWorldId(pathname)
  return Boolean(worldId && !worldOwnsMusic(worldId))
}

export function soundtrackIdForWorld(worldId: string | undefined): string {
  if (!worldId) return FALLBACK_SOUNDTRACK_ID
  const assigned = worldSoundtrack.worlds as Record<string, string>
  return assigned[worldId] ?? FALLBACK_SOUNDTRACK_ID
}

export function soundtrackPreviewUrl(trackId: string): string {
  const track = soundtrackCatalog.tracks[trackId as keyof typeof soundtrackCatalog.tracks]
  const id = track ? trackId : FALLBACK_SOUNDTRACK_ID
  const version = soundtrackCatalog.tracks[id as keyof typeof soundtrackCatalog.tracks].version
  return `${soundtrackCatalog.cdnOrigin}/tracks/${id}/${version}/preview.mp3`
}

export function soundtrackSrcForWorld(worldId: string | undefined): string {
  if (!worldId || worldOwnsMusic(worldId)) return LOCAL_FALLBACK_SOUNDTRACK_SRC
  return soundtrackPreviewUrl(soundtrackIdForWorld(worldId))
}
