import { Link, createFileRoute } from '@tanstack/react-router'
import { sortPathsByRecentUpdate } from '~/data/path-freshness'
import { useState } from 'react'
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { createServerFn } from '@tanstack/react-start'

import { PathShowcase } from '~/components/PathShowcase'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { paths, type Path } from '~/data/content-graph'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { getLocalizedSeo, languageDiscoveryLinks, localeFromRouteMatches, useLocalizedRouteSeo } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'

import '~/components/HomeDiscovery.css'
import '~/styles/path-routes.css'

const getRouteIndexData = createServerFn({ method: 'GET' }).handler(async () => {
  const { getPublicWorldSummary } = await import('~/data/world-summaries')
  const worlds = paths.flatMap((path) => path.worldIds)
    .map((id) => getPublicWorldSummary(id))
    .filter((world): world is WorldSummary => Boolean(world))
  return { paths, worlds }
})

export const Route = createFileRoute('/routes/')({
  loader: async ({ context }) => ({
    ...(await getRouteIndexData()),
    locale: context.locale,
  }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const copy = getLocalizedSeo('routes', locale)
    const pageUrl = 'https://shapeof.world/routes'
    return {
      meta: seo({
        ...copy,
        image: 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl(pageUrl, locale),
      }),
      links: languageDiscoveryLinks(pageUrl, locale),
    }
  },
  component: RoutesIndexPage,
})

function RoutesIndexPage() {
  const { paths: routePaths, worlds } = Route.useLoaderData()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  useLocalizedRouteSeo('routes')
  const worldById = new Map(worlds.map((world) => [world.id, world]))

  const needle = query.trim().toLocaleLowerCase()
  const visiblePaths = sortPathsByRecentUpdate(routePaths).filter((path) =>
    path.publication === 'public' && path.worldIds.length > 0 && path.worldIds.every((id) => worldById.has(id)) &&
    (!needle || [path.title, path.titleEn, path.description, path.descriptionEn,
      ...path.worldIds.flatMap((id) => { const world = worldById.get(id)!; return [world.title, world.translations.en.title] }),
    ].join(' ').toLocaleLowerCase().includes(needle)))

  return (
    <main className="home-page path-routes-page">
      <SiteHeader />
      <section className="home-section home-path-section path-routes-hero" aria-labelledby="routes-title">
        <p className="path-routes-back">
          <Link to="/">{t('routes.home')}</Link>
        </p>
        <header className="home-section-head">
          <div>
            <h1 id="routes-title" className="page-title">{t('routes.title')}</h1>
            <p>{t('routes.body')}</p>
          </div>
        </header>
        <div className="series-filters">
          <label className="series-search">
            <MagnifyingGlass aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              aria-label={t('series.search')} placeholder={t('series.search')} />
          </label>
          <span className="series-results" role="status">{t('series.results', { value: visiblePaths.length })}</span>
        </div>
        {visiblePaths.length ? <PathShowcase paths={visiblePaths as Path[]} worldById={worldById} /> :
          <div className="series-empty"><p>{t('series.empty')}</p><button className="btn-secondary" onClick={() => setQuery('')}>{t('series.clear')}</button></div>}

        <div className="home-path-foot">
          <Link to="/" hash="home-worlds" className="btn-text home-path-foot-cta">
            {t('common.allWorlds')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
