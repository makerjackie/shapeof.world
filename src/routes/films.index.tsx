import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { FilmCatalogCard } from '~/components/FilmCard'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { BILIBILI_CHANNEL_URL } from '~/data/films'
import { formatMessage, useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'

import '~/components/HomeDiscovery.css'
import '~/styles/path-routes.css'
import '~/styles/films.css'

const getFilms = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadFilmCatalog } = await import('~/data/films.server')
  return loadFilmCatalog()
})

export const Route = createFileRoute('/films/')({
  loader: async ({ context }) => ({ films: await getFilms(), locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const pageUrl = 'https://shapeof.world/films'
    return {
      meta: seo({
        title: formatMessage(locale, 'films.title'),
        description: formatMessage(locale, 'films.metaDescription'),
        image: loaderData?.films[0]?.film.poster ?? 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl(pageUrl, locale),
      }),
      links: languageDiscoveryLinks(pageUrl, locale),
    }
  },
  component: FilmsIndexPage,
})

function FilmsIndexPage() {
  const { films } = Route.useLoaderData()
  const { t } = useI18n()
  return (
    <main className="home-page path-routes-page film-page">
      <SiteHeader />
      <section className="home-section path-routes-hero" aria-labelledby="films-title">
        <header className="home-section-head">
          <div>
            <h1 id="films-title" className="page-title">{t('films.title')}</h1>
            <p>{t('films.lead')}</p>
          </div>
          <a className="home-section-more" href={BILIBILI_CHANNEL_URL}>{t('films.bilibiliChannel')}</a>
        </header>
        <ul className="film-grid">
          {films.map((film, index) => <li key={film.id}><FilmCatalogCard item={film} eager={index < 2} /></li>)}
        </ul>
      </section>
      <SiteFooter />
    </main>
  )
}
