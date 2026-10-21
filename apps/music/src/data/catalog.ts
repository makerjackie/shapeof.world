import raw from '../generated/catalog.json'
import { domains, GLOBAL_CATEGORY } from './domains'

export type LocaleText = {
  en: string
  zh: string
}

export type TrackRole = 'main-theme' | 'category-default' | 'flagship' | 'library' | 'world-theme'
export type ArchetypeLetter = 'A' | 'B' | 'C'

export type TrackAssets = {
  preview: string
  master: string
  waveform?: string
  game?: string
  loop?: string
  loopOgg?: string
}

export type AudioKind = 'music' | 'sfx' | 'ambience'
export type AudioRights = { id: string; status: string; label: LocaleText; licenseUrl: string; commercialUse: boolean | null; attributionRequired: boolean | null }
export type AudioLoop = { seamless: boolean; asset?: keyof TrackAssets; duration?: number; basis?: string }

export type TrackGeneration = {
  id?: string
  model?: string
  generator?: string
  api?: string
  endpoint?: string
  requestedAt?: string
  completedAt?: string
  durationMs?: number
  interactionId?: string
  clientRequestId?: string
  synthid?: boolean
  c2pa?: string
  sha256?: string
}

export type Track = {
  id: string
  kind: AudioKind
  rights?: AudioRights
  loop?: AudioLoop
  usage?: { narrationFriendly?: boolean; placement?: string; gameState?: string }
  code: string
  title: LocaleText
  category: string
  archetype: string
  moods: string[]
  topics: string[]
  energy: number
  bpm: number
  key: string
  instruments: string[]
  instrumental: boolean
  model: string
  duration: number
  prompt: string
  collections: string[]
  sourceDuration?: number
  styles: string[]
  scenarios: string[]
  description?: LocaleText
  recommendedWorldIds: string[]
  role: TrackRole
  assets: TrackAssets
  generation?: TrackGeneration
}

export type Album = {
  id: string
  title: LocaleText
  zip?: string
  trackIds?: string[]
}

export type Catalog = {
  album: Album
  tracks: Track[]
}

const CDN = 'https://music-cdn.shapeof.world'

const fallbackAlbum: Album = {
  id: 'volume-1',
  title: { en: 'Volume 1', zh: '第一卷' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function localeText(value: unknown, fallback: string): LocaleText {
  if (!isRecord(value)) return { en: fallback, zh: fallback }
  const en = typeof value.en === 'string' && value.en ? value.en : fallback
  const zh = typeof value.zh === 'string' && value.zh ? value.zh : en
  return { en, zh }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

function isRole(value: unknown): value is TrackRole {
  return value === 'main-theme'
    || value === 'category-default'
    || value === 'flagship'
    || value === 'library'
    || value === 'world-theme'
}

function defaultAssets(id: string): TrackAssets {
  return {
    preview: `${CDN}/tracks/${id}/v1/preview.mp3`,
    master: `${CDN}/tracks/${id}/v1/master.wav`,
    waveform: `${CDN}/tracks/${id}/v1/waveform.json`,
  }
}

function rejectR2(url: string): string {
  if (url.includes('r2.dev')) {
    throw new Error(`Audio URL must use music-cdn.shapeof.world, not r2.dev: ${url}`)
  }
  return url
}

export function parseTrack(value: unknown): Track | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) return null
  const assetsRaw = isRecord(value.assets) ? value.assets : {}
  const defaults = defaultAssets(value.id)
  const assets: TrackAssets = {
    preview: rejectR2(typeof assetsRaw.preview === 'string' ? assetsRaw.preview : defaults.preview),
    master: rejectR2(typeof assetsRaw.master === 'string' ? assetsRaw.master : defaults.master),
    waveform: rejectR2(typeof assetsRaw.waveform === 'string' ? assetsRaw.waveform : defaults.waveform ?? ''),
  }
  if (!assets.waveform) delete assets.waveform
  for (const key of ['game', 'loop', 'loopOgg'] as const) {
    if (typeof assetsRaw[key] === 'string') assets[key] = rejectR2(assetsRaw[key])
  }
  const generationRaw = isRecord(value.generation) ? value.generation : null
  const generation: TrackGeneration | undefined = generationRaw
    ? {
        id: typeof generationRaw.id === 'string' ? generationRaw.id : undefined,
        model: typeof generationRaw.model === 'string' ? generationRaw.model : undefined,
        generator: typeof generationRaw.generator === 'string' ? generationRaw.generator : undefined,
        api: typeof generationRaw.api === 'string' ? generationRaw.api : undefined,
        endpoint: typeof generationRaw.endpoint === 'string' ? generationRaw.endpoint : undefined,
        requestedAt: typeof generationRaw.requestedAt === 'string' ? generationRaw.requestedAt : undefined,
        completedAt: typeof generationRaw.completedAt === 'string' ? generationRaw.completedAt : undefined,
        durationMs: Number.isFinite(Number(generationRaw.durationMs)) ? Number(generationRaw.durationMs) : undefined,
        interactionId: typeof generationRaw.interactionId === 'string' ? generationRaw.interactionId : undefined,
        clientRequestId: typeof generationRaw.clientRequestId === 'string' ? generationRaw.clientRequestId : undefined,
        synthid: typeof generationRaw.synthid === 'boolean' ? generationRaw.synthid : undefined,
        c2pa: typeof generationRaw.c2pa === 'string' ? generationRaw.c2pa : undefined,
        sha256: typeof generationRaw.sha256 === 'string' ? generationRaw.sha256 : undefined,
      }
    : undefined
  return {
    id: value.id,
    kind: value.kind === 'sfx' || value.kind === 'ambience' ? value.kind : 'music',
    rights: isRecord(value.rights) ? {
      id: String(value.rights.id ?? 'legacy-unreviewed'), status: String(value.rights.status ?? 'needs-review'),
      label: localeText(value.rights.label, 'Usage terms not yet verified'),
      licenseUrl: typeof value.rights.licenseUrl === 'string' ? value.rights.licenseUrl : '/audio-license.txt',
      commercialUse: typeof value.rights.commercialUse === 'boolean' ? value.rights.commercialUse : null,
      attributionRequired: typeof value.rights.attributionRequired === 'boolean' ? value.rights.attributionRequired : null,
    } : undefined,
    loop: isRecord(value.loop) ? {
      seamless: value.loop.seamless === true,
      asset: ['master', 'game', 'loop', 'loopOgg'].includes(String(value.loop.asset)) ? value.loop.asset as keyof TrackAssets : undefined,
      duration: typeof value.loop.duration === 'number' ? value.loop.duration : undefined,
      basis: typeof value.loop.basis === 'string' ? value.loop.basis : undefined,
    } : undefined,
    usage: isRecord(value.usage) ? { narrationFriendly: value.usage.narrationFriendly === true, placement: String(value.usage.placement ?? ''), gameState: String(value.usage.gameState ?? '') } : undefined,
    code: typeof value.code === 'string' ? value.code : value.id,
    title: localeText(value.title, value.id),
    category: typeof value.category === 'string' ? value.category : GLOBAL_CATEGORY,
    archetype: typeof value.archetype === 'string' ? value.archetype : 'library',
    moods: stringList(value.moods),
    topics: stringList(value.topics),
    energy: Number.isFinite(Number(value.energy)) ? Number(value.energy) : 1,
    bpm: Number.isFinite(Number(value.bpm)) ? Number(value.bpm) : 0,
    key: typeof value.key === 'string' ? value.key : '',
    instruments: stringList(value.instruments),
    instrumental: value.instrumental !== false,
    model: typeof value.model === 'string' ? value.model : 'lyria-3-pro-preview',
    duration: Number.isFinite(Number(value.duration)) ? Number(value.duration) : 0,
    prompt: typeof value.prompt === 'string' ? value.prompt : '',
    collections: stringList(value.collections),
    sourceDuration: typeof value.sourceDuration === "number" ? value.sourceDuration : undefined,
    styles: stringList(value.styles),
    scenarios: stringList(value.scenarios),
    description: isRecord(value.description) ? localeText(value.description, '') : undefined,
    recommendedWorldIds: stringList(value.recommendedWorldIds),
    role: isRole(value.role) ? value.role : 'library',
    assets,
    generation: generation && Object.values(generation).some((value) => value !== undefined)
      ? generation
      : undefined,
  }
}

const rawCatalog: unknown = raw
const source = isRecord(rawCatalog) ? rawCatalog : { tracks: [] }
const parsedTracks = (Array.isArray(source.tracks) ? source.tracks : [])
  .map(parseTrack)
  .filter((track): track is Track => Boolean(track))

parsedTracks.sort((left, right) => left.code.localeCompare(right.code) || left.id.localeCompare(right.id))

const albumRaw = isRecord(source.album) ? source.album : {}

const albumZip = typeof albumRaw.zip === 'string' && albumRaw.zip
  ? rejectR2(albumRaw.zip)
  : fallbackAlbum.zip

export const catalog: Catalog = {
  album: {
    id: typeof albumRaw.id === 'string' ? albumRaw.id : fallbackAlbum.id,
    title: localeText(albumRaw.title, fallbackAlbum.title.en),
    ...(albumZip ? { zip: albumZip } : {}),
    trackIds: stringList(albumRaw.trackIds),
  },
  tracks: parsedTracks,
}

export const tracks: Track[] = catalog.tracks
export const album: Album = catalog.album
export const albumTracks = (album.trackIds ?? []).flatMap(id => tracks.filter(track => track.id === id))

const trackById = new Map(tracks.map((track) => [track.id, track]))

export function getTrack(id: string): Track | undefined {
  return trackById.get(id)
}

export function trackTitle(track: Track, locale: 'en' | 'zh'): string {
  return locale === 'zh' ? track.title.zh : track.title.en
}

export function archetypeLetter(track: Track): ArchetypeLetter | null {
  const fromCode = track.code.match(/-([ABC])\d/i)
  if (fromCode) return fromCode[1].toUpperCase() as ArchetypeLetter
  const named = track.archetype.trim().toUpperCase()
  if (named === 'A' || named === 'B' || named === 'C') return named
  if (named === 'ATMOSPHERE' || named === 'AMBIENT') return 'A'
  if (named === 'DISCOVERY') return 'B'
  if (named === 'CONSTELLATION' || named === 'EVENT') return 'C'
  return null
}

export const HIDDEN_SHAPES_ID = 'hidden-shapes'
export const THEME_TRACK_IDS = ['hidden-shapes', 'hall-clock'] as const

export function hiddenShapesTrack(): Track | undefined {
  return getTrack(HIDDEN_SHAPES_ID) ?? tracks.find((track) => track.role === 'main-theme')
}

export function themeTracks(): Track[] {
  return THEME_TRACK_IDS
    .map((id) => getTrack(id))
    .filter((track): track is Track => Boolean(track))
}

export const categoryOrder: string[] = [GLOBAL_CATEGORY, ...domains.map((domain) => domain.id)]

export function tracksByCategory(list: Track[]): Array<{ category: string; tracks: Track[] }> {
  return categoryOrder
    .map((category) => ({
      category,
      tracks: list.filter((track) => track.category === category),
    }))
    .filter((group) => group.tracks.length > 0)
}
