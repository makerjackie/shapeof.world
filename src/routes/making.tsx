import { worldRoute } from '~/lib/world-urls'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { WorldCard } from '~/components/WorldCard'
import { getRootCategory } from '~/data/content-graph'
import type { MakingWorldArtifact } from '~/data/world-artifacts'
import { useI18n, type Locale } from '~/i18n'
import { getLocalizedSeo, languageDiscoveryLinks, useLocalizedRouteSeo } from '~/i18n/seo'
import { languageCanonicalUrl, localizedPublicUrl } from '~/lib/share-url'
import '~/styles/failures.css'
import '~/styles/making.css'
import { seo } from '~/utils/seo'

const canonicalUrl = 'https://shapeof.world/making'

const getMakingWorlds = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadMakingWorlds } = await import('~/data/world-artifacts.server')
  return loadMakingWorlds()
})

const pageCopy = {
  zh: {
    title: '制作中的世界',
    lead: '这里收录尚未进入公开目录的世界与早期尝试，你可以打开体验。',
    collectionCount: (count: number) => `${count} 个世界`,
    searchLabel: '搜索制作中的世界',
    searchPlaceholder: '搜索制作中的世界',
    updated: '最近更新',
    noResults: '没有匹配的世界。',
    resultCount: (count: number) => `${count} 个搜索结果`,
    missing: '记录缺失',
  },
  en: {
    title: 'Worlds in the making',
    lead: 'Explore worlds and early experiments outside the public catalogue.',
    collectionCount: (count: number) => `${count} worlds`,
    searchLabel: 'Search worlds in the making',
    searchPlaceholder: 'Search worlds in the making',
    updated: 'Updated',
    noResults: 'No worlds match that search.',
    resultCount: (count: number) => `${count} search results`,
    missing: 'Record missing',
  },
} as const

function worldTitle(world: MakingWorldArtifact, locale: Locale) {
  return locale === 'zh' ? world.title : world.translations.en.title
}

function categoryName(world: MakingWorldArtifact, locale: Locale) {
  const category = getRootCategory(world.primaryCategoryId)
  return locale === 'zh' ? category.title : category.titleEn
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function formatUpdated(date: string, locale: Locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  const year = match[1]
  const month = Number(match[2])
  const day = Number(match[3])
  if (locale === 'zh') return `${year}年${month}月${day}日`
  return `${englishMonths[month - 1]} ${day}, ${year}`
}

export const Route = createFileRoute('/making')({
  validateSearch: (search: Record<string, unknown>): { mq?: string } => ({
    ...(typeof search.mq === 'string' && search.mq.trim() ? { mq: search.mq } : {}),
  }),
  loader: async ({ context }) => {
    const worlds = await getMakingWorlds()
    if (!worlds) throw notFound()
    return { locale: context.locale, worlds }
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'zh'
    const copy = pageCopy[locale]
    const seoCopy = getLocalizedSeo('making', locale)
    return {
      meta: [
        ...seo({
          ...seoCopy,
          image: 'https://shapeof.world/assets/oneworld-og.jpg',
          imageAlt: copy.title,
          locale,
          url: localizedPublicUrl(canonicalUrl, locale),
        }),
        { name: 'theme-color', content: '#090c0c' },
      ],
      links: languageDiscoveryLinks(canonicalUrl, locale),
      scripts: [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: copy.title,
          description: seoCopy.description,
          url: languageCanonicalUrl(canonicalUrl, locale),
          inLanguage: locale === 'zh' ? 'zh-Hans' : 'en',
          isPartOf: {
            '@type': 'WebSite',
            name: 'Shape of the World',
            url: 'https://shapeof.world/',
          },
        }),
      }],
    }
  },
  component: MakingPage,
})

function MakingPage() {
  const { locale } = useI18n()
  const { worlds } = Route.useLoaderData()
  const copy = pageCopy[locale]
  const { mq: urlQuery = '' } = Route.useSearch()
  const navigate = useNavigate({ from: '/making' })
  const [query, setQuery] = useState(urlQuery)
  const isComposingRef = useRef(false)
  useLocalizedRouteSeo('making')

  const records = useMemo(
    () => [...worlds]
      .sort((left, right) => {
        const dateDelta = (right.firstSeen ?? '').localeCompare(left.firstSeen ?? '')
        return dateDelta !== 0 ? dateDelta : left.id.localeCompare(right.id)
      })
      .map((world) => ({ worldId: world.id, world })),
    [worlds],
  )

  const syncSearchQuery = useCallback((value: string) => {
    const normalized = value.trim()
    if (normalized === urlQuery.trim()) return
    navigate({
      search: { mq: normalized || undefined },
      replace: true,
      resetScroll: false,
    })
  }, [navigate, urlQuery])

  useEffect(() => {
    if (isComposingRef.current) return
    setQuery((current) => (current === urlQuery ? current : urlQuery))
  }, [urlQuery])

  useEffect(() => {
    if (isComposingRef.current) return
    const timer = window.setTimeout(() => syncSearchQuery(query), 160)
    return () => window.clearTimeout(timer)
  }, [query, syncSearchQuery])

  const visibleRecords = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    if (!normalizedQuery) return records

    return records.filter(({ worldId, world }) => {
      if (!world) return worldId.includes(normalizedQuery)
      const haystack = normalizeSearch([
        worldId,
        world.title,
        world.translations.en.title,
        categoryName(world, 'zh'),
        categoryName(world, 'en'),
        world.lastModified,
        world.firstSeen,
      ].join(' '))
      return haystack.includes(normalizedQuery)
    })
  }, [query, records])

  return (
    <main className="editorial-page failures-page making-page">
      <SiteHeader />

      <header className="failures-hero">
        <h1 className="page-title">{copy.title}</h1>
        <p className="lead failures-hero-lead">{copy.lead}</p>
        <p className="label failures-count">{copy.collectionCount(records.length)}</p>
      </header>

      <section className="failures-collection" aria-label={copy.title}>
        <div className="failures-search">
          <MagnifyingGlass aria-hidden="true" />
          <input
            type="search"
            value={query}
            aria-label={copy.searchLabel}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false
              const value = event.currentTarget.value
              setQuery(value)
              syncSearchQuery(value)
            }}
          />
        </div>
        <p className="failures-results-status" role="status">
          {copy.resultCount(visibleRecords.length)}
        </p>

        {visibleRecords.length > 0 ? (
          <div className="work-card-grid">
            {visibleRecords.map(({ worldId, world }, index) => {
              const title = world ? worldTitle(world, locale) : worldId
              const updated = world?.lastModified ?? world?.firstSeen
              return (
                <WorldCard
                  key={worldId}
                  world={{ id: worldId, posterTitle: title, translations: { en: { posterTitle: title } } }}
                  title={title}
                  image={world ? world.posterMobile ?? world.poster : null}
                  eager={index < 8}
                  label={(
                    <>
                      {world ? categoryName(world, locale) : copy.missing}
                      {updated ? (
                        <>
                          {' · '}
                          <time dateTime={updated} aria-label={`${copy.updated} ${formatUpdated(updated, locale)}`}>
                            {formatUpdated(updated, locale)}
                          </time>
                        </>
                      ) : null}
                    </>
                  )}
                />
              )
            })}
          </div>
        ) : (
          <p className="failures-empty">{copy.noResults}</p>
        )}
      </section>

      <SiteFooter />
    </main>
  )
}
