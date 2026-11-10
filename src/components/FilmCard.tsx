import { Link } from '@tanstack/react-router'
import { Play } from '@phosphor-icons/react'

import { filmCopy, type BilibiliVideo, type FilmCatalogItem, type FilmSummary } from '~/data/films'
import { useI18n } from '~/i18n'

function FilmCardContent({
  poster, duration, title, subtitle, eager,
}: Pick<FilmSummary, 'poster' | 'duration'> & { title: string; subtitle: string; eager: boolean }) {
  return (
    <>
      <span className="work-card-media">
        <img src={poster} alt="" width={1920} height={1080} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" />
        <span className="film-card-duration"><Play aria-hidden="true" weight="fill" />{duration}</span>
      </span>
      <span className="work-card-body">
        <strong className="work-card-title">{title}</strong>
        <span className="work-card-label">{subtitle}</span>
      </span>
    </>
  )
}

export function FilmCard({ film, eager = false }: { film: FilmSummary; eager?: boolean }) {
  const { locale } = useI18n()
  const { title, subtitle } = filmCopy(film, locale)
  return (
    <Link to="/films/$slug" params={{ slug: film.slug }} className="work-card work-card--film">
      <FilmCardContent poster={film.poster} duration={film.duration} title={title} subtitle={subtitle} eager={eager} />
    </Link>
  )
}

function BilibiliFilmCard({ video, eager = false }: { video: BilibiliVideo; eager?: boolean }) {
  const { locale, t } = useI18n()
  const minutes = Math.floor(video.durationSeconds / 60)
  const seconds = String(video.durationSeconds % 60).padStart(2, '0')
  return (
    <a href={`https://www.bilibili.com/video/${video.bvid}/`} className="work-card work-card--film">
      <FilmCardContent
        poster={video.poster}
        duration={`${minutes}:${seconds}`}
        title={locale === 'en' ? video.titleEn : video.title}
        subtitle={t('films.watchBilibili')}
        eager={eager}
      />
    </a>
  )
}

export function FilmCatalogCard({ item, eager }: { item: FilmCatalogItem; eager?: boolean }) {
  return item.kind === 'site'
    ? <FilmCard film={item.film} eager={eager} />
    : <BilibiliFilmCard video={item.film} eager={eager} />
}
