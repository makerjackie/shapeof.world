import { Link } from '@tanstack/react-router'
import { Play } from '@phosphor-icons/react'

import { filmCopy, type FilmSummary } from '~/data/films'
import { useI18n } from '~/i18n'

/** A film in the shared work-card frame, with a 16:9 cover and its running time. */
export function FilmCard({ film, eager = false }: { film: FilmSummary; eager?: boolean }) {
  const { locale } = useI18n()
  const copy = filmCopy(film, locale)
  return (
    <Link to="/films/$slug" params={{ slug: film.slug }} className="work-card work-card--film">
      <span className="work-card-media">
        <img src={film.poster} alt="" width={1920} height={1080} loading={eager ? 'eager' : 'lazy'} decoding="async" />
        <span className="film-card-duration"><Play aria-hidden="true" weight="fill" />{film.duration}</span>
      </span>
      <span className="work-card-body">
        <strong className="work-card-title">{copy.title}</strong>
        <span className="work-card-label">{copy.subtitle}</span>
      </span>
    </Link>
  )
}
