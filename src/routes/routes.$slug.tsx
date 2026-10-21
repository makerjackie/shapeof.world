import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, Link as LinkIcon } from '@phosphor-icons/react'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { PathJourney } from '~/components/PathJourney'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { paths } from '~/data/content-graph'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { worldSocialCard } from '~/lib/posters'
import { localizedPublicUrl } from '~/lib/share-url'
import { experimentalPathSummary } from '~/lib/experimental-path'
import { seo } from '~/utils/seo'

import '~/components/HomeDiscovery.css'
import '~/styles/path-routes.css'

const getRouteDetailData = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { getPathBySlug, getExperimentalPathBySlug } = await import('~/data/content-graph')
    const { getPublicWorldSummary } = await import('~/data/world-summaries')
    const path = getPathBySlug(slug) ?? getExperimentalPathBySlug(slug)
    if (!path) return undefined
    const { loadWorldArtifact } = await import('~/data/world-artifacts.server')
    const worlds = path.experimental
      ? (await Promise.all(path.worldIds.map(async id => experimentalPathSummary(await loadWorldArtifact(id)))))
        .filter((world): world is WorldSummary => Boolean(world))
      : path.worldIds
      .map((id) => getPublicWorldSummary(id))
      .filter((world): world is WorldSummary => Boolean(world))
    return { path, worlds }
  })

export const Route = createFileRoute('/routes/$slug')({
  loader: async ({ params, context }) => {
    const data = await getRouteDetailData({ data: params.slug })
    if (!data) throw notFound()
    return { ...data, locale: context.locale }
  },
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const path = loaderData?.path
    const lead = loaderData?.worlds[0]
    const title = path
      ? locale === 'zh' ? `${path.title} — ${path.experimental ? '实验系列' : '策展路线'}` : `${path.titleEn} — ${path.experimental ? 'Experimental series' : 'Curated route'}`
      : locale === 'zh' ? '策展路线' : 'Curated route'
    const description = path
      ? locale === 'zh' ? path.description : path.descriptionEn
      : undefined
    const pageUrl = path
      ? `https://shapeof.world/routes/${path.slug}`
      : 'https://shapeof.world/routes'
    return {
      meta: [...seo({
        title,
        description,
        image: lead
          ? `https://shapeof.world${worldSocialCard(lead)}`
          : 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl(pageUrl, locale),
      }), ...(path?.experimental ? [{ name: 'robots', content: 'noindex,follow' }] : [])],
      links: languageDiscoveryLinks(pageUrl, locale),
    }
  },
  component: RouteDetailPage,
})

function RouteDetailPage() {
  const { path, worlds } = Route.useLoaderData()
  const { locale, t, pathText } = useI18n()
  const [copied, setCopied] = useState(false)
  const worldById = new Map(worlds.map((world) => [world.id, world]))
  const otherPaths = paths.filter((item) => item.id !== path.id)
  const pageUrl = localizedPublicUrl(`https://shapeof.world/routes/${path.slug}`, locale)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* Clipboard permission is optional; the URL remains shareable. */ }
  }

  return (
    <main className="home-page path-routes-page">
      <SiteHeader />
      <section className="home-section home-path-section path-routes-hero" aria-labelledby="route-title">
        <p className="path-routes-back">
          <Link to="/routes">
            <ArrowLeft aria-hidden="true" />
            {t('routes.back')}
          </Link>
        </p>
        <header className="home-section-head">
          <div>
            {path.experimental && <p className="path-routes-experimental">{locale === 'zh' ? '实验系列' : 'Experimental series'}</p>}
            <h1 id="route-title" className="page-title">{pathText(path, 'title')}</h1>
            <p>{pathText(path, 'description')}</p>
          </div>
        </header>
        <div className="path-routes-share">
          <button type="button" className="btn-secondary" onClick={() => void copyLink()}>
            <LinkIcon aria-hidden="true" />
            {copied ? t('routes.copied') : t('routes.copy')}
          </button>
        </div>
        <PathJourney path={path} worldById={worldById} />
        {!path.experimental && otherPaths.length > 0 && (
          <nav className="path-routes-others" aria-label={t('routes.other')}>
            <h2 className="section-title">{t('routes.other')}</h2>
            <ul>
              {otherPaths.map((item) => (
                <li key={item.id}>
                  <Link to="/routes/$slug" params={{ slug: item.slug }}>
                    {pathText(item, 'title')}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
