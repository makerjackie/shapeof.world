import { worldRoute } from '~/lib/world-urls'
import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { CSSProperties } from 'react'

import '~/styles/changelog.css'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { changelogReleases } from '~/data/changelog'
import { useI18n } from '~/i18n'
import { getLocalizedSeo, languageDiscoveryLinks, localeFromRouteMatches, useLocalizedRouteSeo } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'

// The world list is server-owned editorial data (`changelogReleases`), so this
// server function takes no client input: a caller cannot widen it into an
// unbounded `loadWorldArtifact` fan-out over `/_serverFn/`.
const getChangelogWorlds = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { loadWorldArtifact } = await import('~/data/world-artifacts.server')
    const worldIds = [...new Set(changelogReleases.flatMap((release) => [
      ...(release.worldIds ?? []),
      ...(release.previewWorldIds ?? []),
    ]))]
    const previewIds = new Set(changelogReleases.flatMap((release) => release.previewWorldIds ?? []))
    const artifacts = await Promise.all(worldIds.map((worldId) => loadWorldArtifact(worldId)))
    return artifacts.flatMap((artifact) => artifact && (artifact.state === 'public' || (artifact.state === 'making' && previewIds.has(artifact.world.id)))
      ? [{ ...artifact.world, releaseState: artifact.state }] : [])
  })

export const Route = createFileRoute('/changelog')({
  loader: async ({ context }) => ({
    worlds: await getChangelogWorlds(),
    locale: context.locale,
  }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const copy = getLocalizedSeo('changelog', locale)
    const pageUrl = 'https://shapeof.world/changelog'
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
  component: ChangelogPage,
})

function formatReleaseDate(date: string, locale: 'zh' | 'en') {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  if (locale === 'zh') return `${year} 年 ${month} 月 ${day} 日`
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function ChangelogPage() {
  const { worlds } = Route.useLoaderData()
  const { locale, t, worldText } = useI18n()
  useLocalizedRouteSeo('changelog')
  const worldById = new Map(worlds.map((world) => [world.id, world]))

  return (
    <main className="editorial-page changelog-page">
      <SiteHeader />
      <header className="page-head">
        <h1 className="page-title">{t('changelog.title')}</h1>
        <p className="lead">{t('changelog.body')}</p>
      </header>

      <section className="changelog-timeline" aria-label={t('changelog.timeline')}>
        {changelogReleases.map((release, index) => {
          const title = locale === 'en' ? release.titleEn : release.title
          const body = locale === 'en' ? release.bodyEn : release.body
          const linkedWorlds = [...(release.worldIds ?? []), ...(release.previewWorldIds ?? [])]
            .map((id) => worldById.get(id))
            .filter((world): world is NonNullable<typeof world> => Boolean(world))

          return (
            <article
              key={release.id}
              className="changelog-release"
              style={{ '--reveal-delay': `${Math.min(index, 8) * 40}ms` } as CSSProperties}
            >
              <time dateTime={release.date}>{formatReleaseDate(release.date, locale)}</time>
              <h2 className="section-title">{title}</h2>
              <p>{body}</p>
              {linkedWorlds.length > 0 && (
                <ul className="changelog-worlds" aria-label={t('changelog.worlds')}>
                  {linkedWorlds.map((world) => (
                    <li key={world.id}>
                      <Link
                        to={worldRoute}
                        params={{ worldId: world.id }}
                        style={{ '--world-accent': world.accent } as CSSProperties}
                      >
                        <span className="changelog-world-dot" aria-hidden="true" />
                        {worldText(world, 'title')}
                        {world.releaseState === 'making' && <small> · {locale === 'en' ? 'In progress' : '制作中'}</small>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </section>

      <SiteFooter />
    </main>
  )
}
