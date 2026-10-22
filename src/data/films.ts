import type { Locale } from '~/i18n'
import { SOURCE_REPOSITORY_URL } from '~/lib/site'

/**
 * Short films shown at /films. What the site says about a film lives in
 * films.json; the video, covers, duration and sources come from the film's
 * press kit (infra/press/kits/<kit>/kit.json), so a film is published with
 * the same upload as its press kit plus one entry in films.json.
 */

/** The press Worker serves the kits' videos and covers from R2 with byte ranges. */
export const FILM_MEDIA_ORIGIN = 'https://press.shapeof.world'

export type FilmCopy = { title: string; subtitle: string; summary: string; making: string }

export type FilmEntry = {
  slug: string
  kit: string
  /** null keeps a finished film off the site until it is out on the platforms. */
  publishedAt: string | null
  relatedWorldIds: string[]
  watch: { bilibili?: string; youtube?: string }
  zh: FilmCopy
  en: FilmCopy
}

export type FilmSummary = Pick<FilmEntry, 'slug' | 'zh' | 'en'> & {
  publishedAt: string
  duration: string
  poster: string
}

export type FilmDetail = FilmSummary & Pick<FilmEntry, 'relatedWorldIds' | 'watch'> & {
  video: string
  sources: string
}

export function filmCopy(film: Pick<FilmEntry, 'zh' | 'en'>, locale: Locale): FilmCopy {
  return locale === 'en' ? film.en : film.zh
}

export function filmSourceUrl(slug: string, file = ''): string {
  return `${SOURCE_REPOSITORY_URL}/${file ? 'blob' : 'tree'}/main/films/${slug}${file ? `/${file}` : ''}`
}
