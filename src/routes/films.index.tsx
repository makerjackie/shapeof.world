import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { BilibiliFilmCard, FilmCard } from '~/components/FilmCard'
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
  loader: async ({ context }) => ({ ...(await getFilms()), locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const pageUrl = 'https://shapeof.world/films'
    return {
      meta: seo({
        title: formatMessage(locale, 'films.title'),
        description: formatMessage(locale, 'films.metaDescription'),
        image: loaderData?.films[0]?.poster ?? 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl(pageUrl, locale),
      }),
      links: languageDiscoveryLinks(pageUrl, locale),
    }
  },
  component: FilmsIndexPage,
})

function FilmsIndexPage() {
  const { films, bilibili } = Route.useLoaderData()
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
        </header>
        <section aria-labelledby="films-bilibili">
          <header className="home-section-head">
            <h2 id="films-bilibili" className="section-title">{t('films.bilibiliUploads')}</h2>
            <a className="home-section-more" href={BILIBILI_CHANNEL_URL}>{t('films.bilibiliChannel')}</a>
          </header>
          <ul className="film-grid">
            {bilibili.map((video, index) => <li key={video.bvid}><BilibiliFilmCard video={video} eager={index < 2} /></li>)}
          </ul>
        </section>
        <section className="film-related" aria-labelledby="films-site">
          <h2 id="films-site" className="section-title">{t('films.siteCollection')}</h2>
          <ul className="film-grid">
            {films.map((film) => <li key={film.slug}><FilmCard film={film} /></li>)}
          </ul>
        </section>
      </section>
      <SiteFooter />
    </main>
  )
}
