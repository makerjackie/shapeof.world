import type { CSSProperties } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { WorldCard } from '~/components/WorldCard'
import { categories, getPrimaryCategoryTrail } from '~/data/content-graph'
import { worldArtifactManifest } from '~/data/world-artifacts'
import { useI18n } from '~/i18n'
import { languageDiscoveryLinks } from '~/i18n/seo'
import { categoryStructuredData, jsonLdScript } from '~/lib/structured-data'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'

import './category.css'

const geographyContent = {
  zh: {
    title: '把地理现象放到地图上观察',
    intro: '课堂投屏时，可以先让学生作出预测，再切换地图、观察水流或比较天气变化。各世界还提供资料来源与相关说明。',
    pathLink: '按顺序体验自然地理实验室',
    topics: [
      {
        title: '地图与地球观测',
        description: '比较球面与平面地图的形变，再看卫星影像与实时地球。地图投影、昼夜边界和风场让抽象的地理尺度变得可见。',
      },
      {
        title: '河流与冰川地貌',
        description: '观察流水如何侵蚀河岸、改变河道，形成河曲与牛轭湖；再对照冰川退缩，思考不同时间尺度上的地表变化。',
      },
      {
        title: '天气、海洋与植被',
        description: '从冷暖锋面、全球风场和洋流，到不同地表上的水与植被，观察大气、海洋与陆地如何相互联系。',
      },
    ],
  },
  en: {
    title: 'Put geography in motion',
    intro: 'For a classroom demonstration, invite a prediction before switching maps, following water, or comparing weather changes. Explore each world’s sources and notes for context.',
    pathLink: 'Follow the Physical Geography Lab route',
    topics: [
      {
        title: 'Maps and Earth observation',
        description: 'Compare a globe with flat map projections, then inspect satellite imagery and the living Earth. Map distortion, day and night, and winds make geographic scale visible.',
      },
      {
        title: 'Rivers and glaciers',
        description: 'See river erosion reshape a channel into meanders and oxbow lakes, then compare glacier retreat to consider changes over a different timescale.',
      },
      {
        title: 'Weather, oceans, and vegetation',
        description: 'Move from weather fronts, global winds, and ocean currents to water and vegetation on land. Explore how the atmosphere, ocean, and surface connect.',
      },
    ],
  },
} as const

const getCategoryPageData = createServerFn({ method: 'GET' })
  .validator((input: { categoryId: string; page: number }) => ({
    categoryId: input.categoryId,
    page: Number.isSafeInteger(input.page) && input.page > 0 ? input.page : 1,
  }))
  .handler(async ({ data }) => {
    const category = categories.find((item) => item.id === data.categoryId)
    if (!category) return undefined
    const manifestEntry = worldArtifactManifest.categories.find((item) => item.id === category.id)
    if (!manifestEntry || data.page > Math.max(1, manifestEntry.pageCount)) return undefined
    const { loadWorldSummaryPage } = await import('~/data/world-artifacts.server')
    const worlds = manifestEntry.pageCount === 0
      ? []
      : await loadWorldSummaryPage(data.page, category.id)
    if (!worlds) return undefined
    return {
      category,
      trail: getPrimaryCategoryTrail(category.id),
      children: categories.filter((item) => item.primaryParentId === category.id),
      count: manifestEntry.count,
      pageCount: manifestEntry.pageCount,
      page: data.page,
      worlds,
    }
  })

export const Route = createFileRoute('/category/$categoryId')({
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = typeof search.page === 'number'
      ? search.page
      : typeof search.page === 'string'
        ? Number.parseInt(search.page, 10)
        : undefined
    return Number.isSafeInteger(page) && (page ?? 0) > 1 ? { page } : {}
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps, context }) => {
    const data = await getCategoryPageData({ data: { categoryId: params.categoryId, page: deps.page } })
    if (!data) throw notFound()
    return { ...data, locale: context.locale }
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'zh'
    const category = loaderData?.category
    const page = loaderData?.page ?? 1
    const pageCount = loaderData?.pageCount ?? 1
    const baseTitle = category?.id === 'earth-climate'
      ? locale === 'zh'
        ? '互动地理地图：河流、地貌与天气｜世界的形状'
        : 'Interactive Geography: Maps, Rivers & Weather | Shape of the World'
      : category
      ? locale === 'zh' ? `${category.title} — 世界分类` : `${category.titleEn} — World category`
      : locale === 'zh' ? '世界分类' : 'World category'
    const title = page > 1
      ? `${baseTitle}${locale === 'zh' ? ` — 第 ${page} 页` : ` — Page ${page}`}`
      : baseTitle
    const description = category
      ? locale === 'zh' ? category.description : category.descriptionEn
      : undefined
    const categoryUrl = category
      ? `https://shapeof.world/category/${category.id}`
      : 'https://shapeof.world/'
    const canonicalUrl = page > 1 ? `${categoryUrl}?page=${page}` : categoryUrl
    const paginationLinks = category
      ? [
          ...(page > 1
            ? [{ rel: 'prev', href: localizedPublicUrl(page === 2 ? categoryUrl : `${categoryUrl}?page=${page - 1}`, locale) }]
            : []),
          ...(page < pageCount
            ? [{ rel: 'next', href: localizedPublicUrl(`${categoryUrl}?page=${page + 1}`, locale) }]
            : []),
        ]
      : []
    return {
      meta: seo({
        title,
        description,
        image: 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl(canonicalUrl, locale),
      }),
      links: [...languageDiscoveryLinks(canonicalUrl, locale), ...paginationLinks],
      scripts: category
        ? [jsonLdScript(categoryStructuredData({
            locale,
            categoryId: category.id,
            name: locale === 'zh' ? category.title : category.titleEn,
            trail: loaderData?.trail ?? [],
            worlds: (loaderData?.worlds ?? []).map((world) => ({
              id: world.id,
              name: locale === 'zh' ? world.posterTitle : world.translations.en.posterTitle,
            })),
          }))]
        : [],
    }
  },
  component: CategoryPage,
})

function CategoryPage() {
  const { category, trail, children, count, pageCount, page, worlds } = Route.useLoaderData()
  const { categoryText, locale, t, worldText } = useI18n()
  const geography = geographyContent[locale]

  return (
    <main className="category-page">
      <SiteHeader />
      <header className="category-hero" style={{ '--category-accent': category.accent ?? '#5c7565' } as CSSProperties}>
        <nav className="category-breadcrumbs" aria-label={t('category.breadcrumb')}>
          <Link to="/">{t('nav.home')}</Link>
          {trail.map((item, index) => (
            <span key={item.id}>
              <ArrowRight aria-hidden="true" />
              {index === trail.length - 1
                ? <strong>{categoryText(item, 'title')}</strong>
                : <Link to="/category/$categoryId" params={{ categoryId: item.id }}>{categoryText(item, 'title')}</Link>}
            </span>
          ))}
        </nav>
        <h1 className="page-title">{categoryText(category, 'title')}</h1>
        <div className="lead">{categoryText(category, 'description')}</div>
        <small className="label">{t('category.worldCount', { value: count })}</small>
      </header>

      {category.id === 'earth-climate' && page === 1 && (
        <section className="category-geography" aria-labelledby="category-geography-title">
          <header>
            <h2 id="category-geography-title" className="section-title">{geography.title}</h2>
            <p>{geography.intro}</p>
          </header>
          <div className="category-geography-grid">
            {geography.topics.map((topic) => (
              <article key={topic.title}>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
              </article>
            ))}
          </div>
          <Link className="btn-text category-geography-path" to="/routes/$slug" params={{ slug: 'physical-geography-lab' }}>
            {geography.pathLink}<ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}

      {children.length > 0 && (
        <section className="category-children" aria-labelledby="category-children-title">
          <h2 id="category-children-title" className="section-title">{t('category.children')}</h2>
          <div>
            {children.map((item) => (
              <Link key={item.id} to="/category/$categoryId" params={{ categoryId: item.id }}>
                <strong>{categoryText(item, 'title')}</strong>
                <span>{categoryText(item, 'description')}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="category-worlds" aria-labelledby="category-worlds-title">
        <header>
          <h2 id="category-worlds-title" className="section-title">{t('category.worlds')}</h2>
          <span>{t('category.page', { current: page, total: Math.max(1, pageCount) })}</span>
        </header>
        <div className="work-card-grid">
          {worlds.map((world) => (
            <WorldCard key={world.id} world={world} label={worldText(world, 'topicLabel')} />
          ))}
        </div>
        {pageCount > 1 && (
          <nav className="category-pagination" aria-label={t('category.pagination')}>
            {page > 1
              ? <Link className="btn-secondary" to="/category/$categoryId" params={{ categoryId: category.id }} search={{ page: page - 1 }}><ArrowLeft aria-hidden="true" /> {t('category.previous')}</Link>
              : <span />}
            {page < pageCount && (
              <Link className="btn-secondary" to="/category/$categoryId" params={{ categoryId: category.id }} search={{ page: page + 1 }}>{t('category.next')} <ArrowRight aria-hidden="true" /></Link>
            )}
          </nav>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
