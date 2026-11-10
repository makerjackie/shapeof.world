import bilibiliVideos from './bilibili-videos.json'
import entries from './films.json'
import { bilibiliBvid } from '~/lib/film-player'
import { FILM_MEDIA_ORIGIN, type BilibiliVideo, type FilmCatalogItem, type FilmDetail, type FilmEntry, type FilmSummary } from './films'

type PressKit = {
  video: { key: string; duration: string }
  coversKey: string
  covers: { id: string; recommended?: boolean }[]
  sourcesShort: string
}

// Server only: the kits carry long press copy the pages never show.
const kits = import.meta.glob<PressKit>('../../infra/press/kits/*/kit.json', { eager: true, import: 'default' })

function kitFor(entry: FilmEntry): PressKit {
  const kit = kits[`../../infra/press/kits/${entry.kit}/kit.json`]
  if (!kit) throw new Error(`Film ${entry.slug} names a missing press kit: ${entry.kit}`)
  return kit
}

function summarize(entry: FilmEntry & { publishedAt: string }): FilmSummary {
  const kit = kitFor(entry)
  const cover = (kit.covers.find((item) => item.recommended) ?? kit.covers[0])?.id ?? 'a'
  return {
    slug: entry.slug,
    publishedAt: entry.publishedAt,
    zh: entry.zh,
    en: entry.en,
    duration: kit.video.duration,
    poster: `${FILM_MEDIA_ORIGIN}/media/${kit.coversKey}/cover-${cover.toUpperCase()}-16x9.webp`,
  }
}

function published(): (FilmEntry & { publishedAt: string })[] {
  return (entries as FilmEntry[])
    .filter((entry): entry is FilmEntry & { publishedAt: string } => Boolean(entry.publishedAt))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** Published films, newest first. */
export function loadFilms(): FilmSummary[] {
  return published().map(summarize)
}

export function loadFilmCatalog(): FilmCatalogItem[] {
  const siteFilms = published()
  const siteBvids = new Set(siteFilms.map((film) => bilibiliBvid(film.watch.bilibili)))
  const videos: BilibiliVideo[] = bilibiliVideos
  const dates = new Map(videos.map((video) => [video.bvid, video.publishedAt]))
  const siteCards = siteFilms.map((entry) => {
    const bvid = bilibiliBvid(entry.watch.bilibili)
    return {
      id: entry.slug,
      kind: 'site' as const,
      film: summarize(entry),
      publishedAt: (bvid && dates.get(bvid)) || entry.publishedAt,
    }
  })
  const bilibiliCards = videos
    .filter((video) => !siteBvids.has(video.bvid))
    .map((film) => ({ id: film.bvid, kind: 'bilibili' as const, film, publishedAt: film.publishedAt }))

  return [...siteCards, ...bilibiliCards].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** Published films that point viewers to this world, newest first. */
export function loadFilmsForWorld(worldId: string): FilmSummary[] {
  return published().filter((entry) => entry.relatedWorldIds.includes(worldId)).map(summarize)
}

export function loadFilm(slug: string): FilmDetail | undefined {
  const entry = published().find((item) => item.slug === slug)
  if (!entry) return undefined
  const kit = kitFor(entry)
  return {
    ...summarize(entry),
    relatedWorldIds: entry.relatedWorldIds,
    watch: entry.watch,
    video: `${FILM_MEDIA_ORIGIN}/media/${kit.video.key}`,
    sources: kit.sourcesShort,
  }
}
