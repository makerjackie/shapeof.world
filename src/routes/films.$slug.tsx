import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft } from '@phosphor-icons/react'
import { createServerFn } from '@tanstack/react-start'
import { useRef } from 'react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { WorldCard } from '~/components/WorldCard'
import { filmCopy, filmSourceUrl } from '~/data/films'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { trackEvent } from '~/lib/analytics'
import { SOURCE_REPOSITORY_URL } from '~/lib/site'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'

import '~/components/HomeDiscovery.css'
import '~/styles/path-routes.css'
import '~/styles/films.css'

const getFilmDetail = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { loadFilm } = await import('~/data/films.server')
    const film = loadFilm(slug)
    if (!film) return undefined
    const { getPublicWorldSummary } = await import('~/data/world-summaries')
    const worlds = film.relatedWorldIds
      .map((id) => getPublicWorldSummary(id))
      .filter((world): world is WorldSummary => Boolean(world))
    return { film, worlds }
  })

export const Route = createFileRoute('/films/$slug')({
  loader: async ({ params, context }) => {
    const data = await getFilmDetail({ data: params.slug })
    if (!data) throw notFound()
    return { ...data, locale: context.locale }
  },
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const film = loaderData?.film
    if (!film) return {}
    const copy = filmCopy(film, locale)
    const pageUrl = `https://shapeof.world/films/${film.slug}`
    return {
      meta: seo({
        title: `${copy.title} — ${copy.subtitle}`,
        description: copy.summary,
        image: film.poster,
        locale,
        url: localizedPublicUrl(pageUrl, locale),
      }),
      links: languageDiscoveryLinks(pageUrl, locale),
    }
  },
  component: FilmPage,
})

function FilmPage() {
  const { film, worlds } = Route.useLoaderData()
  const { locale, t } = useI18n()
  const copy = filmCopy(film, locale)
  const played = useRef(false)
  const watch = [
    film.watch.bilibili && { label: 'Bilibili', href: film.watch.bilibili },
    film.watch.youtube && { label: 'YouTube', href: film.watch.youtube },
  ].filter((item): item is { label: string; href: string } => Boolean(item))

  return (
    <main className="home-page path-routes-page film-page">
      <SiteHeader />
      <section className="home-section path-routes-hero" aria-labelledby="film-title">
        <p className="path-routes-back">
          <Link to="/films"><ArrowLeft aria-hidden="true" />{t('films.viewAll')}</Link>
        </p>
        <header className="home-section-head">
          <div>
            <h1 id="film-title" className="page-title">{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
        </header>
        <video
          key={film.slug}
          className="film-player"
          src={film.video}
          poster={film.poster}
          controls
          playsInline
          preload="metadata"
          onPlay={() => {
            if (played.current) return
            played.current = true
            trackEvent({ event: 'film_play', value: film.slug })
          }}
        />
        <p className="film-meta">
          <time dateTime={film.publishedAt}>{film.publishedAt}</time>
          <span>{film.duration}</span>
          {watch.length > 0 && <span>{t('films.watchOn')} {watch.map((item, index) => <span key={item.href}>{index > 0 && ' · '}<a href={item.href} target="_blank" rel="noreferrer">{item.label}</a></span>)}</span>}
        </p>
        <div className="film-body">
          <p>{copy.summary}</p>
          <section aria-labelledby="film-making">
            <h2 id="film-making" className="section-title">{t('films.makingTitle')}</h2>
            <p>{copy.making}</p>
            <ul className="film-links">
              <li><a href={filmSourceUrl(film.slug)} target="_blank" rel="noreferrer">{t('films.code')}</a></li>
              <li><a href={filmSourceUrl(film.slug, 'DESCRIPTION.md')} target="_blank" rel="noreferrer">{t('films.fullSources')}</a></li>
              <li><a href={`${SOURCE_REPOSITORY_URL}/blob/main/films/METHOD.md`} target="_blank" rel="noreferrer">{t('films.method')}</a></li>
            </ul>
          </section>
          <section aria-labelledby="film-sources">
            <h2 id="film-sources" className="section-title">{t('films.sourcesTitle')}</h2>
            <p className="film-sources">{film.sources}</p>
          </section>
        </div>
        {worlds.length > 0 && (
          <section className="film-related" aria-labelledby="film-related">
            <h2 id="film-related" className="section-title">{t('films.relatedTitle')}</h2>
            <ul className="work-card-grid">
              {worlds.map((world) => (
                <li key={world.id}>
                  <WorldCard world={world} onClick={() => trackEvent({ event: 'film_world_click', worldId: world.id, value: film.slug })} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
